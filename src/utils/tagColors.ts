/** Apple 风格浅底 + 实色字，按标签名哈希取色，保证同名标签颜色稳定 */
const TAG_PALETTE = [
  { bg: 'rgba(0, 122, 255, 0.12)', text: '#007AFF' },
  { bg: 'rgba(88, 86, 214, 0.12)', text: '#5856D6' },
  { bg: 'rgba(255, 45, 85, 0.12)', text: '#FF2D55' },
  { bg: 'rgba(255, 149, 0, 0.14)', text: '#FF9500' },
  { bg: 'rgba(52, 199, 89, 0.14)', text: '#34C759' },
  { bg: 'rgba(90, 200, 250, 0.18)', text: '#32ADE6' },
  { bg: 'rgba(255, 204, 0, 0.22)', text: '#B08900' },
  { bg: 'rgba(175, 82, 222, 0.12)', text: '#AF52DE' },
  { bg: 'rgba(255, 59, 48, 0.12)', text: '#FF3B30' },
  { bg: 'rgba(142, 142, 147, 0.16)', text: '#636366' },
] as const;

function hashTagName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getTagColorStyle(name: string): { backgroundColor: string; color: string } {
  const palette = TAG_PALETTE[hashTagName(name) % TAG_PALETTE.length];
  return { backgroundColor: palette.bg, color: palette.text };
}
