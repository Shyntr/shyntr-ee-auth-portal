import type { AuthMethod } from './shyntr-api';

export function hasUsableLoginUrl(loginUrl: string | null | undefined): boolean {
  return typeof loginUrl === 'string' && loginUrl.trim() !== '';
}

export type AuthProviderAction =
  | { type: 'select-credentials'; methodId: string }
  | { type: 'redirect'; loginUrl: string }
  | { type: 'noop' };

export interface LoginFormUiState {
  showCredentialForm: boolean;
  showProviderDivider: boolean;
}

export function getLoginFormMethodGroups(methods: AuthMethod[]) {
  const passwordMethod = methods.find(
    (method) => method.type === 'password' && hasUsableLoginUrl(method.login_url)
  );
  const ldapMethods = methods.filter((method) => method.type === 'ldap');
  const ssoMethods = methods.filter(
    (method) => method.type === 'saml' || method.type === 'oidc'
  );

  return {
    passwordMethod,
    ldapMethods,
    ssoMethods,
  };
}

export function getInitialSelectedMethodId(methods: AuthMethod[]): string {
  const { passwordMethod } = getLoginFormMethodGroups(methods);

  return passwordMethod?.id ?? '';
}

export function resolveAuthProviderAction(provider: AuthMethod): AuthProviderAction {
  if (provider.type === 'ldap') {
    return {
      type: 'select-credentials',
      methodId: provider.id,
    };
  }

  if (provider.login_url) {
    return {
      type: 'redirect',
      loginUrl: provider.login_url,
    };
  }

  return { type: 'noop' };
}

export function shouldRenderCredentialForm(selectedMethod: AuthMethod | undefined): boolean {
  return selectedMethod?.type === 'password' || selectedMethod?.type === 'ldap';
}

export function getLoginFormUiState(
  selectedMethod: AuthMethod | undefined,
  providerCount: number
): LoginFormUiState {
  const showCredentialForm = shouldRenderCredentialForm(selectedMethod);

  return {
    showCredentialForm,
    showProviderDivider: showCredentialForm && providerCount > 0,
  };
}
