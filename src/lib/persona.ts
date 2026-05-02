import Groq from "groq-sdk";
import type { Ancestor } from "@/types";

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function joinArray(arr: string[] | null | undefined): string {
  if (!arr || arr.length === 0) return "";
  return arr.join(", ");
}

export async function buildPersonaSummary(
  allMemories: string,
  ancestorMeta: Ancestor,
): Promise<string> {
  const source = allMemories.replace(/\s+/g, " ").trim();

  if (source.length < 300 && !ancestorMeta.occupation && !ancestorMeta.signature_phrases?.length) {
    return `A gentle, respectful preserved persona for ${ancestorMeta.name}. Memory material is still sparse, so the ancestor should speak modestly, avoid inventing specifics, and invite the family to add more recordings, letters, and stories.`;
  }

  const profileDataBlock = `
Name: ${ancestorMeta.name}
Called: ${ancestorMeta.nickname ?? "N/A"}
Occupation: ${ancestorMeta.occupation ?? "N/A"}
Education: ${ancestorMeta.education ?? "N/A"}
Spouse: ${ancestorMeta.spouse_name ?? "N/A"}
Children: ${joinArray(ancestorMeta.children_names) || "N/A"}
Siblings: ${joinArray(ancestorMeta.siblings_names) || "N/A"}
Their home: ${ancestorMeta.home_description ?? "N/A"}
Things they always said: ${joinArray(ancestorMeta.signature_phrases) || "N/A"}
Their fears and regrets: ${ancestorMeta.fears_and_regrets ?? "N/A"}
Proudest moments: ${ancestorMeta.proudest_moments ?? "N/A"}
Daily routine: ${ancestorMeta.daily_routines ?? "N/A"}
Food they loved: ${ancestorMeta.food_preferences ?? "N/A"}
Religious practice: ${ancestorMeta.religious_practices ?? "N/A"}
Sense of humor: ${ancestorMeta.sense_of_humor ?? "N/A"}
Relationship with money: ${ancestorMeta.relationship_with_money ?? "N/A"}
Advice they always gave: ${ancestorMeta.advice_they_always_gave ?? "N/A"}
Topics they avoided: ${ancestorMeta.topics_they_avoided ?? "N/A"}
Physical mannerisms: ${ancestorMeta.physical_mannerisms ?? "N/A"}
Nicknames for others: ${ancestorMeta.nicknames_they_used_for_others ?? "N/A"}
Birth year: ${ancestorMeta.birth_year ?? "N/A"}
Death year: ${ancestorMeta.death_year ?? "N/A"}
Origin: ${ancestorMeta.origin_city ?? ""}, ${ancestorMeta.origin_country ?? ""}
Religion: ${ancestorMeta.religion ?? "N/A"}
Relationship to user: ${ancestorMeta.relationship ?? "N/A"}
`.trim();

  const memoryBlock = source.length > 0
    ? `Their actual memories and stories:\n${source.slice(0, 320000)}`
    : "No memory material available yet.";

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 2048,
    messages: [
      {
        role: "system",
        content:
          "You are a culturally sensitive memory preservation expert for South Asian and Arab Muslim-majority families. You write dense, authentic personality profiles that capture every detail of how a real person spoke, thought, loved, worried, laughed, and lived. Never invent facts — only use what is provided.",
      },
      {
        role: "user",
        content: `Read everything below about this real person and write a single 800-word dense personality profile that captures exactly how they spoke, thought, loved, worried, laughed, and lived — this profile will be used to make an AI speak as them so every detail matters.

${profileDataBlock}

${memoryBlock}

Write this profile in second person addressed to the ancestor themselves so it can be directly injected into a system prompt, starting with "You are ${ancestorMeta.name}..." — include their speech patterns, favorite phrases, how they showed love, their daily habits, their relationship with faith, money, food, family — everything that would let someone who never met them hear their voice in their head while reading.`,
      },
    ],
  });

  return response.choices[0]?.message?.content || "";
}
