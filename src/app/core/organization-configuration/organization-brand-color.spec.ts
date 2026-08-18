import {
  canonicalOrganizationBrandColor,
  isSafeOrganizationBrandColor,
  PLATFORM_ORGANIZATION_BRAND_ACCENT,
} from './organization-brand-color';

describe('organization brand color', () => {
  it('accepts a safe strict hex color and canonicalizes it', () => {
    expect(isSafeOrganizationBrandColor('#2563eb')).toBe(true);
    expect(canonicalOrganizationBrandColor('#2563eb')).toBe('#2563EB');
  });

  it('rejects malformed and insufficiently contrasting values', () => {
    expect(isSafeOrganizationBrandColor('#fff')).toBe(false);
    expect(isSafeOrganizationBrandColor('rgb(1, 2, 3)')).toBe(false);
    expect(isSafeOrganizationBrandColor('#FFFFFF')).toBe(false);
    expect(canonicalOrganizationBrandColor('#FFFFFF')).toBeNull();
    expect(PLATFORM_ORGANIZATION_BRAND_ACCENT).toBe('#2563EB');
  });
});
