const whatsappTimestamp = /^\[?\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?\]?\s-?\s?/;

export function extractAncestorWhatsAppMessages(
  exportText: string,
  ancestorName: string,
) {
  const names = ancestorName
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return exportText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(whatsappTimestamp, ""))
    .filter((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) return false;
      const sender = line.slice(0, separator).toLowerCase();
      return names.some((name) => sender.includes(name));
    })
    .map((line) => line.slice(line.indexOf(":") + 1).trim())
    .filter(Boolean)
    .join("\n");
}
