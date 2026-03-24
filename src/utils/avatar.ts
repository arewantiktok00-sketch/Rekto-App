// Stable purple-gradient options for profile avatar (by user id/name)
export const AVATAR_GRADIENTS: [string, string][] = [
  ['#7C3AED', '#A78BFA'],
  ['#6D28D9', '#8B5CF6'],
  ['#5B21B6', '#7C3AED'],
  ['#9333EA', '#C084FC'],
  ['#7C3AED', '#C4B5FD'],
  ['#6B21A8', '#A78BFA'],
];

export function getAvatarGradient(userId: string | undefined, name: string | undefined): [string, string] {
  const seed = (userId || name || '0').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[Math.abs(seed) % AVATAR_GRADIENTS.length];
}
