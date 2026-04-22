'use client';

import type { ReactNode } from 'react';
import { useTransition } from 'react';
import { useFormState } from 'react-dom';
import { useTranslations } from 'next-intl';
import { AlertCircle, Loader2, Mail, MapPin, Phone, RefreshCw, Shield, User } from 'lucide-react';
import { handleConsentAccept, handleConsentDeny } from '@/actions/auth';
import type { PortalTheme } from '@/lib/portal-theme';
import { CardWrapper } from './CardWrapper';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConsentFormProps {
  consentChallenge: string;
  tenantName: string;
  clientName: string;
  requestedScopes: string[];
  requestedAudience: string[];
  userSubject?: string;
  theme: PortalTheme;
}

const SCOPE_ICONS: Record<string, ReactNode> = {
  openid: <Shield className="auth-icon h-5 w-5" />,
  profile: <User className="auth-icon h-5 w-5" />,
  email: <Mail className="auth-icon h-5 w-5" />,
  offline_access: <RefreshCw className="auth-icon h-5 w-5" />,
  address: <MapPin className="auth-icon h-5 w-5" />,
  phone: <Phone className="auth-icon h-5 w-5" />,
  test: <User className="auth-icon h-5 w-5" />,
  custom: <Shield className="auth-icon h-5 w-5" />,
};

export function ConsentForm({
  consentChallenge,
  tenantName,
  clientName,
  requestedScopes,
  requestedAudience,
  userSubject,
  theme,
}: ConsentFormProps) {
  const t = useTranslations('consent');
  const scopeT = useTranslations('consent.scopes');
  const boundAction = handleConsentAccept.bind(null, consentChallenge);
  const [state, formAction] = useFormState(boundAction, {});
  const [isPending, startTransition] = useTransition();
  const [isDenying, startDenyTransition] = useTransition();

  const handleSubmit = (payload: FormData) => {
    startTransition(() => {
      formAction(payload);
    });
  };

  const handleDeny = () => {
    startDenyTransition(async () => {
      await handleConsentDeny(consentChallenge);
    });
  };

  const isProcessing = isPending || isDenying;

  return (
    <CardWrapper theme={theme}>
      <div className="mb-6 text-center">
        <h1 className="auth-title mb-2 text-2xl">{t('accessRequest')}</h1>
        <p className="auth-body text-sm">
          <span className="auth-emphasis font-semibold">{clientName}</span> {t('wantsAccess')}
        </p>
        {tenantName !== 'Shyntr' && (
          <div className="auth-badge mt-3 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium">
            {tenantName}
          </div>
        )}
      </div>

      {userSubject && (
        <div className="mb-6 flex items-center justify-center">
          <div className="auth-user-chip inline-flex items-center gap-3 px-4 py-2.5">
            <div className="auth-user-chip-icon flex h-9 w-9 items-center justify-center rounded-full">
              <User className="auth-icon h-5 w-5" />
            </div>
            <span className="auth-emphasis text-sm font-medium">{userSubject}</span>
          </div>
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        {state.error && (
          <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{state.error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <p className="auth-label mb-3 text-sm font-medium">{t('selectPermissions')}</p>
          <div className="auth-scope-panel divide-y border">
            {requestedScopes.map((scope) => (
              <div key={scope} className="auth-scope-row flex items-center gap-4 p-4 transition-colors">
                <Checkbox
                  id={`scope_${scope}`}
                  name={`scope_${scope}`}
                  defaultChecked
                  disabled={isProcessing}
                  className="auth-checkbox h-5 w-5 rounded"
                />
                <Label
                  htmlFor={`scope_${scope}`}
                  className="auth-scope-label flex flex-1 cursor-pointer items-center gap-3 text-sm"
                >
                  <div className="auth-icon-surface flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg">
                    {SCOPE_ICONS[scope] || <Shield className="auth-icon h-5 w-5" />}
                  </div>
                  <span className="font-medium">{scopeT(scope as any) || scope}</span>
                </Label>
              </div>
            ))}
          </div>
        </div>

        {requestedAudience.length > 0 && (
          <div className="space-y-2">
            <p className="auth-label mb-3 text-sm font-medium">{t('requestedAudiences')}</p>
            <div className="auth-scope-panel divide-y border">
              {requestedAudience.map((audience) => (
                <div
                  key={audience}
                  className="auth-scope-row flex items-center gap-4 p-4 transition-colors"
                >
                  <Checkbox
                    id={`audience_${audience}`}
                    name={`audience_${audience}`}
                    defaultChecked
                    disabled={isProcessing}
                    className="auth-checkbox h-5 w-5 rounded"
                  />
                  <Label
                    htmlFor={`audience_${audience}`}
                    className="auth-scope-label flex flex-1 cursor-pointer items-center gap-3 text-sm"
                  >
                    <div className="auth-icon-surface flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg">
                      <Shield className="auth-icon h-5 w-5" />
                    </div>
                    <span className="font-medium">{audience}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3 py-2">
          <Checkbox
            id="remember"
            name="remember"
            disabled={isProcessing}
            className="auth-checkbox h-5 w-5 rounded"
          />
          <Label htmlFor="remember" className="auth-muted cursor-pointer text-sm font-normal">
            {t('rememberDecision')}
          </Label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="auth-secondary-button h-11 px-6 text-sm font-semibold transition-all"
            onClick={handleDeny}
            disabled={isProcessing}
          >
            {isDenying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('processing')}
              </>
            ) : (
              t('cancel')
            )}
          </Button>
          <Button
            type="submit"
            className="auth-primary-button h-11 px-6 text-sm font-semibold transition-all"
            disabled={isProcessing}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('processing')}
              </>
            ) : (
              t('allow')
            )}
          </Button>
        </div>
      </form>
    </CardWrapper>
  );
}
