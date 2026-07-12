import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  // data URL: data:image/...;base64,....
  image: z.string().min(16).max(12_000_000),
});

export interface OcrResult {
  text: string;
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Formato de imagen inválido");
  }
  return { mimeType: match[1], base64: match[2] };
}

export const aiOcr = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<OcrResult> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

    const { image } = data;
    const { mimeType, base64 } = parseDataUrl(image);

    const system = `Eres un motor de OCR. Extrae TODO el texto legible de la imagen.
Devuelve únicamente el texto tal como aparece, respetando saltos de línea naturales.
No agregues comentarios, explicaciones ni comillas. Si no hay texto, responde con una cadena vacía.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: system }],
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: "Extrae el texto de esta imagen." },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`AI OCR error [${res.status}]: ${body}`);
      throw new Error(`AI OCR error ${res.status}`);
    }

    const json = (await res.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
      }[];
    };

    const text =
      json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("\n")
        .trim() ?? "";

    return { text };
  });