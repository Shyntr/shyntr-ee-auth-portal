import {
  getInitialSelectedMethodId,
  getLoginFormMethodGroups,
  getLoginFormUiState,
  hasUsableLoginUrl,
  resolveAuthProviderAction,
  shouldRenderCredentialForm,
} from '@/lib/auth-methods';
import type { AuthMethod } from '@/lib/shyntr-api';

function makeMethod(overrides: Partial<AuthMethod>): AuthMethod {
  return {
    id: overrides.id ?? 'method-id',
    type: overrides.type ?? 'password',
    name: overrides.name ?? 'Method',
    logo_url: overrides.logo_url,
    login_url: overrides.login_url,
  };
}

describe('hasUsableLoginUrl', () => {
  it('returns true for a non-empty, non-whitespace string', () => {
    expect(hasUsableLoginUrl('http://localhost:7497/auth/password/verify')).toBe(true);
  });

  it('returns false for empty, whitespace-only, null, and undefined values', () => {
    expect(hasUsableLoginUrl('')).toBe(false);
    expect(hasUsableLoginUrl('   \t  ')).toBe(false);
    expect(hasUsableLoginUrl(null)).toBe(false);
    expect(hasUsableLoginUrl(undefined)).toBe(false);
  });
});

describe('getLoginFormMethodGroups', () => {
  it('hides password when login_url is empty, null, undefined, or whitespace-only', () => {
    const methods = [
      makeMethod({
        id: 'password-empty',
        type: 'password',
        name: 'Password Empty',
        login_url: '',
      }),
      makeMethod({
        id: 'password-whitespace',
        type: 'password',
        name: 'Password Whitespace',
        login_url: '   ',
      }),
      makeMethod({
        id: 'password-missing',
        type: 'password',
        name: 'Password Missing',
      }),
      makeMethod({
        id: 'password-undefined',
        type: 'password',
        name: 'Password Undefined',
        login_url: undefined,
      }),
      makeMethod({
        id: 'ldap',
        type: 'ldap',
        name: 'Corporate LDAP',
        login_url: 'http://localhost:7497/auth/ldap/verify',
      }),
      makeMethod({
        id: 'oidc',
        type: 'oidc',
        name: 'Okta',
        login_url: 'https://idp.example.com/authorize',
      }),
    ];

    const { passwordMethod, ldapMethods, ssoMethods } = getLoginFormMethodGroups(methods);

    expect(passwordMethod).toBeUndefined();
    expect(ldapMethods.map((method) => method.id)).toEqual(['ldap']);
    expect(ssoMethods.map((method) => method.id)).toEqual(['oidc']);
  });

  it('keeps a password method when login_url is usable', () => {
    const methods = [
      makeMethod({
        id: 'password',
        type: 'password',
        name: 'Password',
        login_url: 'http://localhost:7497/auth/password/verify',
      }),
      makeMethod({
        id: 'ldap',
        type: 'ldap',
        name: 'Corporate LDAP',
        login_url: 'http://localhost:7497/auth/ldap/verify',
      }),
    ];

    const { passwordMethod, ldapMethods } = getLoginFormMethodGroups(methods);

    expect(passwordMethod?.id).toBe('password');
    expect(ldapMethods.map((method) => method.id)).toEqual(['ldap']);
  });
});

describe('getInitialSelectedMethodId', () => {
  it('does not auto-select LDAP when password is absent', () => {
    const methods = [
      makeMethod({
        id: 'ldap',
        type: 'ldap',
        name: 'Corporate LDAP',
        login_url: 'http://localhost:7497/auth/ldap/verify',
      }),
      makeMethod({
        id: 'oidc',
        type: 'oidc',
        name: 'Okta',
        login_url: 'https://idp.example.com/authorize',
      }),
    ];

    expect(getInitialSelectedMethodId(methods)).toBe('');
  });

  it('selects password by default when password is usable', () => {
    const methods = [
      makeMethod({
        id: 'password',
        type: 'password',
        name: 'Password',
        login_url: 'http://localhost:7497/auth/password/verify',
      }),
      makeMethod({
        id: 'ldap',
        type: 'ldap',
        name: 'Corporate LDAP',
        login_url: 'http://localhost:7497/auth/ldap/verify',
      }),
    ];

    expect(getInitialSelectedMethodId(methods)).toBe('password');
  });
});

describe('credential form activation', () => {
  it('keeps LDAP visible but inactive until the user explicitly selects it', () => {
    const ldapMethod = makeMethod({
      id: 'ldap',
      type: 'ldap',
      name: 'Corporate LDAP',
      login_url: 'http://localhost:7497/auth/ldap/verify',
    });

    expect(shouldRenderCredentialForm(undefined)).toBe(false);
    expect(getLoginFormUiState(undefined, 2)).toEqual({
      showCredentialForm: false,
      showProviderDivider: false,
    });

    const action = resolveAuthProviderAction(ldapMethod);

    expect(action).toEqual({ type: 'select-credentials', methodId: 'ldap' });
    expect(shouldRenderCredentialForm(ldapMethod)).toBe(true);
    expect(getLoginFormUiState(ldapMethod, 2)).toEqual({
      showCredentialForm: true,
      showProviderDivider: true,
    });
  });
});

describe('connection method actions', () => {
  it('keeps OIDC login action unchanged', () => {
    const oidcMethod = makeMethod({
      id: 'oidc',
      type: 'oidc',
      name: 'Okta',
      login_url: 'https://idp.example.com/authorize',
    });

    expect(resolveAuthProviderAction(oidcMethod)).toEqual({
      type: 'redirect',
      loginUrl: 'https://idp.example.com/authorize',
    });
  });

  it('keeps SAML login action unchanged', () => {
    const samlMethod = makeMethod({
      id: 'saml',
      type: 'saml',
      name: 'SAML',
      login_url: 'https://saml.example.com/login',
    });

    expect(resolveAuthProviderAction(samlMethod)).toEqual({
      type: 'redirect',
      loginUrl: 'https://saml.example.com/login',
    });
  });

  it('does not disable other connection methods when password is hidden', () => {
    const methods = [
      makeMethod({
        id: 'password-hidden',
        type: 'password',
        name: 'Password',
        login_url: '   ',
      }),
      makeMethod({
        id: 'oidc',
        type: 'oidc',
        name: 'Okta',
        login_url: 'https://idp.example.com/authorize',
      }),
      makeMethod({
        id: 'saml',
        type: 'saml',
        name: 'SAML',
        login_url: 'https://saml.example.com/login',
      }),
      makeMethod({
        id: 'ldap',
        type: 'ldap',
        name: 'Corporate LDAP',
        login_url: 'http://localhost:7497/auth/ldap/verify',
      }),
    ];

    const { passwordMethod, ldapMethods, ssoMethods } = getLoginFormMethodGroups(methods);

    expect(passwordMethod).toBeUndefined();
    expect(ldapMethods.map((method) => method.id)).toEqual(['ldap']);
    expect(ssoMethods.map((method) => method.id)).toEqual(['oidc', 'saml']);
    expect(getLoginFormUiState(undefined, ldapMethods.length + ssoMethods.length)).toEqual({
      showCredentialForm: false,
      showProviderDivider: false,
    });
    expect(resolveAuthProviderAction(ssoMethods[0])).toEqual({
      type: 'redirect',
      loginUrl: 'https://idp.example.com/authorize',
    });
    expect(resolveAuthProviderAction(ssoMethods[1])).toEqual({
      type: 'redirect',
      loginUrl: 'https://saml.example.com/login',
    });
  });
});
