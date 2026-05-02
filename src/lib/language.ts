import type { SupportedLanguage } from "@/types";

const arabicRange = /[\u0600-\u06ff]/;
const urduCharacters = /[ٹڈڑںے]/;

export function detectMessageLanguage(
  message: string,
  fallback: string | null | undefined = "ur",
): SupportedLanguage {
  if (arabicRange.test(message)) {
    return urduCharacters.test(message) ? "ur" : "ar";
  }

  const normalized = (fallback ?? "ur").toLowerCase();

  if (normalized.startsWith("ar")) {
    return "ar";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return "ur";
}

export function languageLabel(language: string | null | undefined) {
  if (language === "ar") return "Arabic";
  if (language === "en") return "English";
  return "Urdu";
}
