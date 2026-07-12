import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  text: z.string().min(1).max(2000),
  direction: z.enum(["es-maya", "maya-es"]),
  glossary: z
    .array(z.object({ from: z.string(), to: z.string() }))
    .max(200)
    .optional()
    .default([]),
  unknown: z.array(z.string()).max(200).optional().default([]),
});

export interface AiTranslateResult {
  translation: string;
  corrected?: string;
  suggestions?: string[];
}

export const aiTranslate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<AiTranslateResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY no configurada");

    const { text, direction, glossary, unknown } = data;
    const fromLang = direction === "es-maya" ? "español" : "maya yucateco";
    const toLang = direction === "es-maya" ? "maya yucateco" : "español";

    const glossaryText = glossary.length
      ? glossary.map((g) => `${g.from} = ${g.to}`).join("\n")
      : "(sin coincidencias)";

    const system = `Eres un traductor experto entre español y maya yucateco.
Traduce del ${fromLang} al ${toLang} de forma natural y fiel.
Usa SIEMPRE el glosario del diccionario local como referencia obligatoria para las palabras que aparezcan en él.
Respeta la ortografía tradicional del maya yucateco (con apóstrofos: k', ts', ch', etc.).
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional.`;

    const user = `Texto a traducir (${fromLang} → ${toLang}):
"${text}"

Glosario del diccionario local:
${glossaryText}

Palabras sin coincidencia local: ${unknown.length ? unknown.join(", ") : "(ninguna)"}

Devuelve un JSON con esta forma exacta:
{
  "translation": "la traducción completa y fluida",
  "corrected": "el texto original con la ortografía corregida (o igual si no hay correcciones)",
  "suggestions": ["hasta 3 notas breves o alternativas útiles"]
}`;

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
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`AI gateway error [${res.status}]: ${body}`);
      throw new Error(`AI gateway error ${res.status}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: AiTranslateResult;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { translation: content.trim() };
    }
    return {
      translation: String(parsed.translation ?? "").trim(),
      corrected: parsed.corrected ? String(parsed.corrected).trim() : undefined,
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map((s) => String(s)).slice(0, 3)
        : undefined,
    };
  });
