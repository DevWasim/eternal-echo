import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_GEMINI_API_KEY");
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function embedText(text: string): Promise<number[]> {
  const trimmed = text.replace(/\s+/g, " ").trim();

  if (!trimmed) {
    return [];
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(trimmed.slice(0, 30000));
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding error:", error);
    return [];
  }
}
