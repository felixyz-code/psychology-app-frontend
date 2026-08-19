const HEX = /^#[0-9a-fA-F]{6}$/;
const SURFACES = ['#FFFFFF', '#121212'];

export const PLATFORM_ORGANIZATION_BRAND_ACCENT = '#2563EB';

export function isSafeOrganizationBrandColor(value: string | null): value is string {
  return (
    value !== null &&
    HEX.test(value) &&
    SURFACES.every((surface) => contrastRatio(value, surface) >= 3)
  );
}

export function canonicalOrganizationBrandColor(value: string | null): string | null {
  return isSafeOrganizationBrandColor(value) ? value.toUpperCase() : null;
}

export function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = channels.map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
