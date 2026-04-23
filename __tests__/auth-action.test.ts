import { handleLoginSubmit } from '@/actions/auth';
import {
  acceptLogin,
  loginWithLDAP,
  verifyPasswordCredentials,
  isAllowedAuthUrl,
} from '@/lib/shyntr-api';
import { redirect } from 'next/navigation';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/shyntr-api', () => ({
  acceptLogin: jest.fn(),
  loginWithLDAP: jest.fn(),
  verifyPasswordCredentials: jest.fn(),
  isAllowedAuthUrl: jest.fn(),
  rejectLogin: jest.fn(),
  acceptConsent: jest.fn(),
  rejectConsent: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// next/headers is imported by auth.ts for setLocale; mock it so the module
// loads without a Next.js request context.
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ set: jest.fn() }),
}));

// ---------------------------------------------------------------------------
// Typed helpers for mocked functions
// ---------------------------------------------------------------------------

const mockLoginWithLDAP = loginWithLDAP as jest.MockedFunction<typeof loginWithLDAP>;
const mockVerifyPassword = verifyPasswordCredentials as jest.MockedFunction<
  typeof verifyPasswordCredentials
>;
const mockAcceptLogin = acceptLogin as jest.MockedFunction<typeof acceptLogin>;
const mockIsAllowedAuthUrl = isAllowedAuthUrl as jest.MockedFunction<typeof isAllowedAuthUrl>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_CHALLENGE = 'valid_login_challenge_xyz';
const VALID_PASSWORD_URL = 'http://localhost:7497/auth/password/verify';
const VALID_LDAP_URL = 'http://localhost:7497/auth/ldap/verify';
const TEST_PASSWORD = 'SuperSecret123!';
const REDIRECT_TARGET = 'https://app.shyntr.example/oauth/callback';
const NORMALIZED_IDENTITY_RESULT = {
  subject: 'ext:testuser',
  context: {
    identity: {
      attributes: {
        preferred_username: 'testuser',
        email: 'testuser@example.com',
      },
      groups: ['engineering'],
      roles: [],
    },
    authentication: {
      amr: ['pwd'],
      authenticated_at: '2026-04-23T18:30:00Z',
    },
  },
};

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value);
  }
  return fd;
}

function passwordForm(overrides: Partial<Record<string, string>> = {}): FormData {
  return makeFormData({
    auth_method_type: 'password',
    auth_method_login_url: VALID_PASSWORD_URL,
    username: 'testuser',
    password: TEST_PASSWORD,
    ...overrides,
  });
}

function ldapForm(overrides: Partial<Record<string, string>> = {}): FormData {
  return makeFormData({
    auth_method_type: 'ldap',
    auth_method_login_url: VALID_LDAP_URL,
    username: 'testuser',
    password: TEST_PASSWORD,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: trusted origin check passes
  mockIsAllowedAuthUrl.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// Input validation (before any outbound call)
// ---------------------------------------------------------------------------

describe('handleLoginSubmit — input validation', () => {
  it('rejects an empty username before any outbound call', async () => {
    const result = await handleLoginSubmit(
      VALID_CHALLENGE,
      {},
      passwordForm({ username: '' })
    );

    expect(result.error).toBeDefined();
    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(mockLoginWithLDAP).not.toHaveBeenCalled();
  });

  it('rejects an empty password before any outbound call', async () => {
    const result = await handleLoginSubmit(
      VALID_CHALLENGE,
      {},
      passwordForm({ password: '' })
    );

    expect(result.error).toBeDefined();
    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(mockLoginWithLDAP).not.toHaveBeenCalled();
  });

  it('rejects an empty login challenge before any outbound call', async () => {
    const result = await handleLoginSubmit(
      '',
      {},
      passwordForm()
    );

    expect(result.error).toBeDefined();
    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(mockLoginWithLDAP).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only login challenge', async () => {
    const result = await handleLoginSubmit(
      '   ',
      {},
      passwordForm()
    );

    expect(result.error).toBeDefined();
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Password method — URL validation
// ---------------------------------------------------------------------------

describe('handleLoginSubmit — password URL validation', () => {
  it('returns login_unavailable when login_url is empty for password method', async () => {
    const result = await handleLoginSubmit(
      VALID_CHALLENGE,
      {},
      passwordForm({ auth_method_login_url: '' })
    );

    expect(result.error).toBe('login_unavailable');
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  it('returns login_failed when login_url fails origin validation', async () => {
    mockIsAllowedAuthUrl.mockReturnValue(false);

    const result = await handleLoginSubmit(
      VALID_CHALLENGE,
      {},
      passwordForm({ auth_method_login_url: 'http://evil.com/auth' })
    );

    expect(result.error).toBe('login_failed');
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Password method — verifier responses
// ---------------------------------------------------------------------------

describe('handleLoginSubmit — password verifier responses', () => {
  it('accepts login and redirects on verifier identity success', async () => {
    mockVerifyPassword.mockResolvedValue({ data: NORMALIZED_IDENTITY_RESULT });
    mockAcceptLogin.mockResolvedValue({ data: { redirect_to: REDIRECT_TARGET } });

    // In tests, redirect() is a jest.fn() that does NOT throw — execution
    // continues past it. We catch any unexpected throw just in case.
    await handleLoginSubmit(VALID_CHALLENGE, {}, passwordForm()).catch(() => {});

    expect(mockAcceptLogin).toHaveBeenCalledWith(VALID_CHALLENGE, {
      subject: 'ext:testuser',
      remember: false,
      remember_for: 0,
      context: NORMALIZED_IDENTITY_RESULT.context,
    });
    expect(mockRedirect).toHaveBeenCalledWith(REDIRECT_TARGET);
  });

  it('calls verifyPasswordCredentials with the correct payload', async () => {
    mockVerifyPassword.mockResolvedValue({ data: NORMALIZED_IDENTITY_RESULT });
    mockAcceptLogin.mockResolvedValue({ data: { redirect_to: REDIRECT_TARGET } });

    await handleLoginSubmit(VALID_CHALLENGE, {}, passwordForm()).catch(() => {});

    expect(mockVerifyPassword).toHaveBeenCalledWith(VALID_PASSWORD_URL, {
      login_challenge: VALID_CHALLENGE,
      username: 'testuser',
      password: TEST_PASSWORD,
    });
  });

  it('passes remember preferences to Shyntr login accept', async () => {
    mockVerifyPassword.mockResolvedValue({ data: NORMALIZED_IDENTITY_RESULT });
    mockAcceptLogin.mockResolvedValue({ data: { redirect_to: REDIRECT_TARGET } });

    await handleLoginSubmit(
      VALID_CHALLENGE,
      {},
      passwordForm({ remember: 'on' })
    ).catch(() => {});

    expect(mockAcceptLogin).toHaveBeenCalledWith(
      VALID_CHALLENGE,
      expect.objectContaining({
        remember: true,
        remember_for: 3600,
      })
    );
  });

  it('returns invalid_credentials when verifier returns invalid_credentials error', async () => {
    mockVerifyPassword.mockResolvedValue({
      error: { error: 'invalid_credentials', status_code: 401 },
    });

    const result = await handleLoginSubmit(VALID_CHALLENGE, {}, passwordForm());

    expect(result.error).toBe('invalid_credentials');
    expect(mockAcceptLogin).not.toHaveBeenCalled();
  });

  it('returns login_failed when verifier returns timeout', async () => {
    mockVerifyPassword.mockResolvedValue({
      error: { error: 'timeout', status_code: 0 },
    });

    const result = await handleLoginSubmit(VALID_CHALLENGE, {}, passwordForm());

    expect(result.error).toBe('login_failed');
    expect(mockAcceptLogin).not.toHaveBeenCalled();
  });

  it('returns login_failed when verifier returns a server error', async () => {
    mockVerifyPassword.mockResolvedValue({
      error: { error: 'login_failed', status_code: 500 },
    });

    const result = await handleLoginSubmit(VALID_CHALLENGE, {}, passwordForm());

    expect(result.error).toBe('login_failed');
    expect(mockAcceptLogin).not.toHaveBeenCalled();
  });

  it('returns login_failed when verifier returns a network error', async () => {
    mockVerifyPassword.mockResolvedValue({
      error: { error: 'network_error', status_code: 0 },
    });

    const result = await handleLoginSubmit(VALID_CHALLENGE, {}, passwordForm());

    expect(result.error).toBe('login_failed');
    expect(mockAcceptLogin).not.toHaveBeenCalled();
  });

  it('returns login_failed when Shyntr login accept rejects verifier identity data', async () => {
    mockVerifyPassword.mockResolvedValue({ data: NORMALIZED_IDENTITY_RESULT });
    mockAcceptLogin.mockResolvedValue({
      error: { error: 'validation_error', status_code: 400 },
    });

    const result = await handleLoginSubmit(VALID_CHALLENGE, {}, passwordForm());

    expect(result.error).toBe('login_failed');
  });
});

// ---------------------------------------------------------------------------
// Security: static credential bypass is gone
// ---------------------------------------------------------------------------

describe('handleLoginSubmit — static credential removal', () => {
  it('does not accept the former admin/password mock credentials locally', async () => {
    // The verifier is called and rejects them — there is no local bypass.
    mockVerifyPassword.mockResolvedValue({
      error: { error: 'invalid_credentials', status_code: 401 },
    });

    const result = await handleLoginSubmit(
      VALID_CHALLENGE,
      {},
      passwordForm({ username: 'admin', password: 'password' })
    );

    expect(mockVerifyPassword).toHaveBeenCalled();
    expect(result.error).toBe('invalid_credentials');
  });

  it('does not accept the former demo/demo123 mock credentials locally', async () => {
    mockVerifyPassword.mockResolvedValue({
      error: { error: 'invalid_credentials', status_code: 401 },
    });

    const result = await handleLoginSubmit(
      VALID_CHALLENGE,
      {},
      passwordForm({ username: 'demo', password: 'demo123' })
    );

    expect(mockVerifyPassword).toHaveBeenCalled();
    expect(result.error).toBe('invalid_credentials');
  });
});

// ---------------------------------------------------------------------------
// Security: payload shape
// ---------------------------------------------------------------------------

describe('handleLoginSubmit — payload security', () => {
  it('does not send tenant fields to the verifier', async () => {
    mockVerifyPassword.mockResolvedValue({ data: NORMALIZED_IDENTITY_RESULT });
    mockAcceptLogin.mockResolvedValue({ data: { redirect_to: REDIRECT_TARGET } });

    await handleLoginSubmit(VALID_CHALLENGE, {}, passwordForm()).catch(() => {});

    const [, sentPayload] = mockVerifyPassword.mock.calls[0];
    expect(sentPayload).not.toHaveProperty('tenant_id');
    expect(sentPayload).not.toHaveProperty('tenantId');
    expect(sentPayload).not.toHaveProperty('TenantID');
    expect(Object.keys(sentPayload)).toHaveLength(3); // login_challenge, username, password only
  });

  it('does not include the password in the returned error state', async () => {
    mockVerifyPassword.mockResolvedValue({
      error: { error: 'invalid_credentials', status_code: 401 },
    });

    const result = await handleLoginSubmit(VALID_CHALLENGE, {}, passwordForm());

    expect(JSON.stringify(result)).not.toContain(TEST_PASSWORD);
  });

  it('does not include the password in the returned error state on login_failed', async () => {
    mockVerifyPassword.mockResolvedValue({
      error: { error: 'login_failed', status_code: 500 },
    });

    const result = await handleLoginSubmit(VALID_CHALLENGE, {}, passwordForm());

    expect(JSON.stringify(result)).not.toContain(TEST_PASSWORD);
  });

  it('does not include normalized identity data in the returned error state', async () => {
    mockVerifyPassword.mockResolvedValue({ data: NORMALIZED_IDENTITY_RESULT });
    mockAcceptLogin.mockResolvedValue({
      error: { error: 'validation_error', error_description: 'Backend rejected context.' },
    });

    const result = await handleLoginSubmit(VALID_CHALLENGE, {}, passwordForm());

    expect(JSON.stringify(result)).not.toContain('testuser@example.com');
    expect(JSON.stringify(result)).not.toContain('engineering');
  });
});

// ---------------------------------------------------------------------------
// LDAP path: unaffected by the password change
// ---------------------------------------------------------------------------

describe('handleLoginSubmit — LDAP path unchanged', () => {
  it('calls loginWithLDAP (not verifyPasswordCredentials) for LDAP method', async () => {
    mockLoginWithLDAP.mockResolvedValue({ data: { redirect_to: REDIRECT_TARGET } });

    await handleLoginSubmit(VALID_CHALLENGE, {}, ldapForm()).catch(() => {});

    expect(mockLoginWithLDAP).toHaveBeenCalledWith(VALID_LDAP_URL, {
      login_challenge: VALID_CHALLENGE,
      username: 'testuser',
      password: TEST_PASSWORD,
    });
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  it('returns error when LDAP login_url is empty', async () => {
    const result = await handleLoginSubmit(
      VALID_CHALLENGE,
      {},
      ldapForm({ auth_method_login_url: '' })
    );

    expect(result.error).toBeDefined();
    expect(mockLoginWithLDAP).not.toHaveBeenCalled();
  });

  it('surfaces LDAP error description on verifier failure', async () => {
    mockLoginWithLDAP.mockResolvedValue({
      error: { error: 'ldap_error', error_description: 'LDAP server unreachable.', status_code: 503 },
    });

    const result = await handleLoginSubmit(VALID_CHALLENGE, {}, ldapForm());

    expect(result.error).toBe('LDAP server unreachable.');
  });
});
