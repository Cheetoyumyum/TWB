export function sanitizeNumber(input: string | undefined, min: number, max?: number): number | null {
  if (!input) return null;
  const parsed = parseInt(input.replace(/,/g, ''), 10);
  if (isNaN(parsed)) return null;
  if (parsed < min) return min;
  if (max && parsed > max) return max;
  return parsed;
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

