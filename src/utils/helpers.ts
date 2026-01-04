export function adjustColor(hex: string, percent: number): string {
  hex = hex.replace(/^#/, "");
  if (hex.length !== 6) return hex;
  const num = Number.parseInt(hex, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const amount = Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r + amount));
  g = Math.min(255, Math.max(0, g + amount));
  b = Math.min(255, Math.max(0, b + amount));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
