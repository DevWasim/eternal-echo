// src/lib/whatsappParser.ts

export type ParsedMemory = {
  content: string;
  timestamp: string;
  type: "whatsapp_message";
};

// WhatsApp export date formats:
// 1. DD/MM/YYYY, HH:MM
// 2. M/D/YY, H:MM AM/PM
// 3. DD/MM/YY, HH:MM
// 4. [DD/MM/YYYY, HH:MM:SS]
export const LINE_REGEX = /^[\[\(]?(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)[\]\)]?\s*[-–]\s*([^:]+):\s(.+)$/im;

function fuzzyMatch(a: string, b: string): boolean {
  a = a.trim().toLowerCase();
  b = b.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

function parseDate(dateStr: string, timeStr: string): Date | null {
  // Try to parse all WhatsApp date/time formats
  // 1. DD/MM/YYYY, HH:MM
  // 2. M/D/YY, H:MM AM/PM
  // 3. DD/MM/YY, HH:MM
  // 4. [DD/MM/YYYY, HH:MM:SS]
  let d: Date | null = null;
  // Try ISO first
  const tryFormats = [
    `${dateStr} ${timeStr}`,
    `${dateStr.replace(/\//g, "-")} ${timeStr}`,
  ];
  for (const str of tryFormats) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  // Try manual parsing
  const dateParts = dateStr.split(/[\/\.-]/);
  if (dateParts.length >= 3) {
    let day = parseInt(dateParts[0], 10);
    let month = parseInt(dateParts[1], 10) - 1;
    let year = parseInt(dateParts[2], 10);
    if (year < 100) year += 2000;
    let hour = 0, minute = 0, second = 0;
    let t = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i);
    if (t) {
      hour = parseInt(t[1], 10);
      minute = parseInt(t[2], 10);
      if (t[3]) second = parseInt(t[3], 10);
      if (t[4]) {
        if (t[4].toUpperCase() === "PM" && hour < 12) hour += 12;
        if (t[4].toUpperCase() === "AM" && hour === 12) hour = 0;
      }
    }
    d = new Date(year, month, day, hour, minute, second);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function parseWhatsAppExport(rawText: string, ancestorName: string): ParsedMemory[] {
  const lines = rawText.split(/\r?\n/);
  const memories: ParsedMemory[] = [];
  let lastMsg: ParsedMemory | null = null;
  let lastTime: Date | null = null;
  for (const line of lines) {
    const match = LINE_REGEX.exec(line);
    if (!match) continue;
    const [_, dateStr, timeStr, sender, content] = match;
    if (!fuzzyMatch(sender, ancestorName)) continue;
    const trimmedContent = content.trim();
    if (
      !trimmedContent ||
      trimmedContent.length < 8 ||
      /<Media omitted>|image omitted|video omitted|This message was deleted|null/i.test(trimmedContent)
    ) {
      continue;
    }
    const timestamp = parseDate(dateStr, timeStr);
    if (!timestamp) continue;
    // Join consecutive messages from same sender within 5 minutes
    if (
      lastMsg &&
      lastTime &&
      timestamp.getTime() - lastTime.getTime() <= 5 * 60 * 1000
    ) {
      lastMsg.content += "\n" + trimmedContent;
      lastTime = timestamp;
    } else {
      lastMsg = {
        content: trimmedContent,
        timestamp: timestamp.toISOString(),
        type: "whatsapp_message",
      };
      memories.push(lastMsg);
      lastTime = timestamp;
    }
  }
  return memories;
}
