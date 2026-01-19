export function chunkText(text: string, size: number): string[] {
  if (!text) {
    return [""];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    let slice = text.slice(start, end);

    if (end < text.length) {
      const lastSpace = slice.lastIndexOf(" ");
      if (lastSpace > 40) {
        slice = slice.slice(0, lastSpace);
        start += lastSpace + 1;
      } else {
        start = end;
      }
    } else {
      start = end;
    }

    chunks.push(slice.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}
