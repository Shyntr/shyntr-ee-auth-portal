'use client';

import { useFormState } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useState, useTransition, useEffect } from 'react';
import { AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { handleLoginSubmit } from '@/actions/auth';
import type { AuthMethod } from '@/lib/shyntr-api';
import type { PortalTheme } from '@/lib/portal-theme';
import {
  getInitialSelectedMethodId,
  getLoginFormMethodGroups,
  getLoginFormUiState,
  resolveAuthProviderAction,
} from '@/lib/auth-methods';
import { CardWrapper } from './CardWrapper';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoginFormProps {
  loginChallenge: string;
  tenantName: string;
  clientName: string;
  methods: AuthMethod[];
  theme: PortalTheme;
}

export function LoginForm({
  loginChallenge,
  tenantName,
  clientName,
  methods,
  theme,
}: LoginFormProps) {
  const t = useTranslations('login');
  const boundAction = handleLoginSubmit.bind(null, loginChallenge);
  const [state, formAction] = useFormState(boundAction, {});
  const [isPending, startTransition] = useTransition();
  const [isSubmitPending, setIsSubmitPending] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Reset loading state when server response (state) is updated
  useEffect(() => {
    setIsSubmitPending(false);
  }, [state]);

  const { passwordMethod, ldapMethods, ssoMethods } = getLoginFormMethodGroups(methods);

  // LDAP methods are now treated as providers, not primary credential selectors
  const credentialMethods = passwordMethod ? [passwordMethod] : [];
  const providerMethods = [...ssoMethods, ...ldapMethods];

  const initialSelectedMethodId = getInitialSelectedMethodId(methods);
  const [selectedMethodId, setSelectedMethodId] = useState(initialSelectedMethodId);

  const selectedMethod = methods.find((method) => method.id === selectedMethodId);
  const { showCredentialForm, showProviderDivider } = getLoginFormUiState(
    selectedMethod,
    providerMethods.length
  );

  const handleSubmit = (payload: FormData) => {
    setIsSubmitPending(true);
    startTransition(() => {
      formAction(payload);
    });
  };

  const handleProviderClick = (provider: AuthMethod) => {
    const action = resolveAuthProviderAction(provider);

    if (action.type === 'select-credentials') {
      setSelectedMethodId(action.methodId);
      return;
    }

    if (action.type === 'redirect') {
      window.location.href = action.loginUrl;
    }
  };

  const handleBackToDefault = () => {
    if (passwordMethod) {
      setSelectedMethodId(passwordMethod.id);
    }
  };

  const credentialSubmitLabel =
    selectedMethod?.type === 'ldap'
      ? t('signInWith', { name: selectedMethod.name })
      : t('login');

  const getProviderIcon = (provider: AuthMethod) => {
    if (provider.logo_url) {
      return <img src={provider.logo_url} alt={provider.name} className="h-6 w-6 object-contain" />;
    }

    const name = provider.name.toLowerCase();

    if (name.includes('shyntr')) {
      return <img src="/mascot.png" alt="Shyntr" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('google')) {
      return <img src="/assets/google.png" alt="Google" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('github')) {
      return <img src="/assets/github.png" alt="GitHub" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('keycloak')) {
      return <img src="/assets/keycloak.png" alt="Keycloak" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('okta')) {
      return <img src="/assets/okta.png" alt="Okta" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('auth0')) {
      return <img src="/assets/auth0.png" alt="Auth0" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('microsoft') || name.includes('adfs') || name.includes('entra')) {
      return (
        <img src="/assets/microsoft.png" alt="Microsoft" className="h-6 w-6 object-contain" />
      );
    }
    if (name.includes('apple')) {
      return <img src="/assets/apple.png" alt="Apple" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('x')) {
      return <img src="/assets/x.png" alt="X" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('facebook')) {
      return <img src="/assets/facebook.png" alt="Facebook" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('linkedin')) {
      return <img src="/assets/linkedin.png" alt="LinkedIn" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('gitlab')) {
      return <img src="/assets/gitlab.png" alt="GitLab" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('atlassian') || name.includes('bitbucket')) {
      return (
        <img src="/assets/atlassian.svg" alt="Atlassian" className="h-6 w-6 object-contain" />
      );
    }
    if (name.includes('ping')) {
      return (
        <img src="/assets/pingID.png" alt="Ping Identity" className="h-6 w-6 object-contain" />
      );
    }
    if (name.includes('onelogin')) {
      return <img src="/assets/onelogin.png" alt="OneLogin" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('slack')) {
      return <img src="/assets/slack.png" alt="Slack" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('ory') || name.includes('hydra') || name.includes('polis')) {
      return <img src="/assets/ory.png" alt="Ory" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('ldap') || name.includes('active directory')) {
      return <img src="/assets/microsoft.png" alt="LDAP" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('saml')) {
      return <img src="/assets/saml.png" alt="SAML" className="h-6 w-6 object-contain" />;
    }
    if (name.includes('openid') || name.includes('oidc') || name.includes('oauth')) {
      return <img src="/assets/openid.png" alt="OpenID" className="h-6 w-6 object-contain" />;
    }

    return null;
  };

  const isLDAPActive = selectedMethod?.type === 'ldap';
  const isLoading = isPending || isSubmitPending;

  return (
    <CardWrapper mascotIdle={!passwordFocused} theme={theme}>
      <div className="mb-8 text-center">
        <h1 className="auth-title mb-2 text-2xl">{theme.loginTitle ?? t('signIn')}</h1>
        <p className="auth-body text-sm">
          {theme.loginSubtitle ? (
            theme.loginSubtitle
          ) : (
            t.rich('toContinueTo', {
              name: clientName,
              b: (chunks) => <span className="auth-emphasis font-semibold">{chunks}</span>,
            })
          )}
        </p>
        {tenantName !== 'Shyntr' && (
          <div className="auth-badge mt-3 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium">
            {t('at')} <span className="auth-emphasis ml-1 font-semibold">{tenantName}</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {state.error && (
          <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {state.error === 'invalid_credentials'
                ? t('invalidCredentials')
                : state.error === 'login_failed' || state.error === 'login_unavailable'
                ? t('loginFailed')
                : state.error}
            </AlertDescription>
          </Alert>
        )}

        {showCredentialForm && (
          <form action={handleSubmit} className="space-y-4">
            <input
              type="hidden"
              name="auth_method_type"
              value={selectedMethod?.type || 'password'}
            />
            <input
              type="hidden"
              name="auth_method_login_url"
              value={selectedMethod?.login_url || ''}
            />

            {isLDAPActive && (
              <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 p-3 transition-all">
                <div className="flex items-center">
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                    {getProviderIcon(selectedMethod)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      LDAP Login
                    </span>
                    <span className="text-sm font-semibold text-blue-900">
                      {selectedMethod.name}
                    </span>
                  </div>
                </div>
                {passwordMethod && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                    onClick={handleBackToDefault}
                    disabled={isLoading}
                  >
                    <ArrowLeft className="mr-1 h-3 w-3" />
                    <span className="text-xs font-medium">Back</span>
                  </Button>
                )}
              </div>
            )}

            {credentialMethods.length > 1 && (
              <div className="space-y-2">
                <Label className="auth-label text-sm font-medium">{t('signIn')}</Label>
                <div className="grid gap-2">
                  {credentialMethods.map((method) => {
                    const isSelected = selectedMethod?.id === method.id;

                    return (
                      <Button
                        key={method.id}
                        type="button"
                        variant="outline"
                        className={`auth-selection-button justify-start border text-sm font-medium transition-all ${
                          isSelected ? 'auth-selection-button-selected' : ''
                        }`}
                        onClick={() => setSelectedMethodId(method.id)}
                        disabled={isLoading}
                      >
                        <span className="mr-3 flex h-6 w-6 items-center justify-center">
                          {getProviderIcon(method)}
                        </span>
                        {method.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="auth-label text-sm font-medium">
                {t('username')}
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder={t('enterUsername')}
                required
                disabled={isLoading}
                onFocus={() => setPasswordFocused(false)}
                className="auth-input h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="auth-label text-sm font-medium">
                {t('password')}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t('enterPassword')}
                required
                disabled={isLoading}
                onFocus={() => setPasswordFocused(true)}
                className="auth-input h-12 text-base"
              />
            </div>

            {selectedMethod?.type === 'password' && (
              <div className="flex items-center space-x-3 py-1">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  disabled={isLoading}
                  className="auth-native-checkbox h-4 w-4 rounded"
                />
                <Label htmlFor="remember" className="auth-muted cursor-pointer text-sm font-normal">
                  {t('rememberMe')}
                </Label>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <Button
                type="submit"
                className="auth-primary-button h-11 w-full px-8 text-sm font-semibold transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('signingIn')}
                  </>
                ) : (
                  credentialSubmitLabel
                )}
              </Button>
            </div>
          </form>
        )}

        {showProviderDivider && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="auth-divider-line w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="auth-divider-label px-2">{t('or')}</span>
            </div>
          </div>
        )}

        {providerMethods.length > 0 && (
          <div className="space-y-3">
            {providerMethods.map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                type="button"
                className={`auth-secondary-button relative flex h-12 w-full items-center justify-center text-sm font-medium transition-all ${
                  selectedMethodId === provider.id ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={() => handleProviderClick(provider)}
                disabled={isLoading}
              >
                <div className="absolute left-4 flex items-center justify-center">
                  {getProviderIcon(provider)}
                </div>
                <span>{t('signInWith', { name: provider.name })}</span>
              </Button>
            ))}
          </div>
        )}

        {methods.length === 0 && !state.error && (
          <Alert className="rounded-xl border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="ml-2 text-sm text-yellow-800">
              {t('noMethods')}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </CardWrapper>
  );
}
