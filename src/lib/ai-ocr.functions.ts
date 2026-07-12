import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  // data URL: data:image/...;base64,....
  image: z.string().min(16).max(12_000_000),
});

export interface OcrResult {
  text: string;
}

export const aiOcr = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<OcrResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY no configurada");

    const { image } = data;

    const system = `Eres un motor de OCR. Extrae TODO el texto legible de la imagen.
Devuelve únicamente el texto tal como aparece, respetando saltos de línea naturales.
No agregues comentarios, explicaciones ni comillas. Si no hay texto, responde con una cadena vacía.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrae el texto de esta imagen." },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`AI OCR error [${res.status}]: ${body}`);
      throw new Error(`AI OCR error ${res.status}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    return { text: content.trim() };
  });
