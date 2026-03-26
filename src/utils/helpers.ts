// Predefined banner colors for classroom cards
// Inspired by Google Classroom's palette
export const BANNER_COLORS = [
  '#1a6b4a', // Forest green
  '#0d47a1', // Deep blue
  '#bf360c', // Burnt orange
  '#4a148c', // Deep purple
  '#006064', // Teal
  '#e65100', // Orange
  '#1b5e20', // Green
  '#880e4f', // Pink
  '#311b92', // Indigo
  '#004d40', // Dark teal
] as const;

export function getRandomBannerColor(): string {
  return BANNER_COLORS[Math.floor(Math.random() * BANNER_COLORS.length)];
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function generateInviteCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
