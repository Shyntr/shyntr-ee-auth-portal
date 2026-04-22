import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('common');

  return (
    <footer className="mt-8 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-sm">
        <a href="#" className="auth-footer-link transition-colors cursor-pointer hover:underline">
          {t('help')}
        </a>
        <span className="auth-footer-separator">•</span>
        <a href="#" className="auth-footer-link transition-colors cursor-pointer hover:underline">
          {t('privacy')}
        </a>
        <span className="auth-footer-separator">•</span>
        <a href="#" className="auth-footer-link transition-colors cursor-pointer hover:underline">
          {t('terms')}
        </a>
      </div>
      <p className="auth-footer-text text-xs">
        {t('poweredBy')} <span className="auth-footer-brand font-semibold">{t('shyntr')}</span>
      </p>
    </footer>
  );
}
