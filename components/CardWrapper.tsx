import type { CSSProperties } from 'react';
import { Footer } from './Footer';
import MascotDisplay from '@/components/mascot/MascotDisplay';
import { DEFAULT_PORTAL_THEME } from '@/lib/portal-theme';
import type { PortalTheme } from '@/lib/portal-theme';

interface CardWrapperProps {
  children: React.ReactNode;
  showLogo?: boolean;
  mascotIdle?: boolean;
  theme?: PortalTheme;
}

export function CardWrapper({
  children,
  showLogo = true,
  mascotIdle = true,
  theme = DEFAULT_PORTAL_THEME,
}: CardWrapperProps) {
  const logoPlacementClass =
    theme.logo.placement === 'left' ? 'justify-start text-left' : 'justify-center text-center';

  const themeStyle = {
    '--auth-page-background': theme.pageBackground,
    // Image background tokens — set by server render, consumed by .auth-shell::before.
    '--auth-page-background-image':
      theme.pageBackgroundType === 'image' && theme.pageBackgroundImageUrl
        ? `url("${theme.pageBackgroundImageUrl}")`
        : 'none',
    '--auth-page-background-size':
      theme.pageBackgroundType === 'image' ? 'cover' : 'auto',
    '--auth-page-background-position':
      theme.pageBackgroundType === 'image' ? 'center' : 'initial',
    '--auth-page-background-repeat':
      theme.pageBackgroundType === 'image' ? 'no-repeat' : 'repeat',
    '--auth-card-background': theme.cardBackground,
    '--auth-card-border': theme.cardBorderColor,
    // Tokenised border width — applied to card, inputs, SSO buttons, scope
    // panel, and consent user chip so all surfaces track borders.width together.
    '--auth-border-width': theme.borderWidth,
    '--auth-card-radius': theme.cardRadius,
    '--auth-card-shadow': theme.cardShadow,
    '--auth-surface-subtle': theme.surfaceSubtle,
    '--auth-text-primary': theme.textPrimary,
    '--auth-text-secondary': theme.textSecondary,
    '--auth-text-muted': theme.textMuted,
    '--auth-button-background': theme.buttonBackground,
    '--auth-button-background-hover': theme.buttonBackgroundHover,
    '--auth-button-text': theme.buttonText,
    '--auth-input-background': theme.inputBackground,
    '--auth-input-border': theme.inputBorderColor,
    '--auth-input-text': theme.inputText,
    '--auth-input-placeholder': theme.inputPlaceholder,
    '--auth-input-focus': theme.inputFocusColor,
    '--auth-link-color': theme.linkColor,
    '--auth-link-hover-color': theme.linkHoverColor,
    '--auth-icon-color': theme.iconColor,
    '--auth-font-family': theme.fontFamily,
    '--auth-font-weight-normal': String(theme.fontWeightNormal),
    '--auth-font-weight-bold': String(theme.fontWeightBold),
  } as CSSProperties;

  return (
    <div className="auth-shell w-full max-w-[450px]" style={themeStyle}>
      <div className="auth-card p-4 sm:p-10">
        {showLogo && (
          <div className={`mb-2 flex ${logoPlacementClass}`}>
            {theme.logo.imageUrl ? (
              <img
                src={theme.logo.imageUrl}
                alt={theme.logo.alt}
                className="auth-logo-image h-auto object-contain"
                style={{ width: `${theme.logo.width}px` }}
              />
            ) : (
              <div className="auth-logo-fallback flex justify-center bg-gradient-to-b from-white-30/50 to-transparent">
                <MascotDisplay password={!mascotIdle} />
              </div>
            )}
          </div>
        )}
        {children}
      </div>
      <Footer />
    </div>
  );
}
