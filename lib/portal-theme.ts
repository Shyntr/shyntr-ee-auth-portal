export type PortalLogoPlacement = 'center' | 'left';

export interface PortalTheme {
  tenantId: string;
  // Solid color used as the page background (always present).
  pageBackground: string;
  // 'image' when page_background.type=image and the URL is a valid HTTPS URL.
  pageBackgroundType: 'color' | 'image';
  // The HTTPS image URL when pageBackgroundType is 'image'. Undefined otherwise.
  pageBackgroundImageUrl?: string;
  cardBackground: string;
  cardBorderColor: string;
  // Tokenised border width applied to card, inputs, SSO buttons, scope panel,
  // and consent user chip — mirrors borders.width from the backend schema.
  borderWidth: string;
  cardRadius: string;
  cardShadow: string;
  surfaceSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  buttonBackground: string;
  buttonBackgroundHover: string;
  buttonText: string;
  inputBackground: string;
  inputBorderColor: string;
  inputText: string;
  inputPlaceholder: string;
  inputFocusColor: string;
  linkColor: string;
  linkHoverColor: string;
  iconColor: string;
  fontFamily: string;
  fontWeightNormal: number;
  fontWeightBold: number;
  // When set, overrides the i18n login title/subtitle copy.
  loginTitle?: string;
  loginSubtitle?: string;
  logo: {
    imageUrl?: string;
    alt: string;
    placement: PortalLogoPlacement;
    width: number;
  };
}

export const DEFAULT_PORTAL_THEME: PortalTheme = {
  tenantId: 'default',
  // Mirrors backend canonical: page_background.value = #f8fafc (slate-50).
  pageBackground: '#f8fafc',
  pageBackgroundType: 'color',
  // pageBackgroundImageUrl intentionally absent — color background is the default.
  // Mirrors backend canonical: colors.background = #ffffff.
  cardBackground: '#ffffff',
  // Mirrors backend canonical: colors.border = #e2e8f0 (slate-200).
  cardBorderColor: '#e2e8f0',
  // Mirrors backend canonical: borders.width = 1.
  borderWidth: '1px',
  // Mirrors backend canonical: borders.radius = 8px → 0.5rem.
  cardRadius: '0.5rem',
  // Neutral two-layer shadow — no color tint.
  cardShadow:
    '0 1px 4px rgba(15, 23, 42, 0.05), 0 14px 36px rgba(15, 23, 42, 0.06)',
  // Mirrors backend canonical: colors.surface = #f8fafc (slate-50).
  surfaceSubtle: '#f8fafc',
  // Mirrors backend canonical: colors.text = #0f172a (slate-950).
  textPrimary: '#0f172a',
  // Mirrors backend canonical: colors.textSecondary = #64748b (slate-500).
  textSecondary: '#64748b',
  // Portal-only: one step lighter than textSecondary.
  textMuted: '#94a3b8',
  // Mirrors backend canonical: colors.primary = #6366f1 (indigo-500).
  buttonBackground: '#6366f1',
  // Portal-only hover: one step darker than primary.
  buttonBackgroundHover: '#4f46e5',
  buttonText: '#ffffff',
  // Mirrors backend canonical: colors.background = #ffffff.
  inputBackground: '#ffffff',
  // Mirrors backend canonical: colors.border = #e2e8f0 (slate-200).
  inputBorderColor: '#e2e8f0',
  // Mirrors backend canonical: colors.text = #0f172a.
  inputText: '#0f172a',
  // Portal-only placeholder.
  inputPlaceholder: '#94a3b8',
  // Mirrors backend canonical: colors.primary = #6366f1.
  inputFocusColor: '#6366f1',
  // Mirrors backend canonical: colors.primary = #6366f1.
  linkColor: '#6366f1',
  // Portal-only hover: one step darker than primary.
  linkHoverColor: '#4f46e5',
  // Mirrors backend canonical: colors.primary = #6366f1.
  iconColor: '#6366f1',
  // Mirrors backend canonical: fonts.family.
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  // Mirrors backend canonical: fonts.weightNormal.
  fontWeightNormal: 400,
  // Mirrors backend canonical: fonts.weightBold.
  fontWeightBold: 700,
  // loginTitle / loginSubtitle: absent by default — i18n copy is used.
  logo: {
    alt: 'Shyntr',
    placement: 'center',
    width: 120,
  },
};
