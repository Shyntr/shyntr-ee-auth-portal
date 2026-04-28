import {
  normalizePasswordVerifierIdentityResult,
  verifyPasswordCredentials,
} from '@/lib/shyntr-api';

const VALID_URL = 'http://localhost:7497/auth/password/verify';

// Use a fixed password string that is easy to search for in serialized output.
const TEST_PAYLOAD = {
  login_challenge: 'test_challenge_abc123',
  username: 'testuser',
  password: 'S3cr3tP@ssw0rd!',
};
const VALID_IDENTITY_RESULT = {
  subject: 'ext:testuser',
  context: {
    identity: {
      attributes: {
        preferred_username: 'testuser',
        email: 'testuser@example.com',
        email_verified: true,
      },
      groups: ['engineering'],
      roles: ['admin'],
    },
    authentication: {
      amr: ['pwd'],
      acr: 'urn:shyntr:password',
      authenticated_at: '2026-04-23T18:30:00Z',
    },
  },
};

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetchResponse(
  status: number,
  body?: unknown,
  headers: Record<string, string> = {}
): void {
  const responseHeaders = new Headers(headers);
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    status,
    ok: status >= 200 && status < 300,
    headers: responseHeaders,
    json: async () => body,
  } as Response);
}

function mockFetchThrows(error: Error): void {
  jest.spyOn(global, 'fetch').mockRejectedValueOnce(error);
}

function mockFetchMalformedJson(status: number): void {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(),
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON at position 0');
    },
  } as unknown as Response);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Success cases
// ---------------------------------------------------------------------------

describe('verifyPasswordCredentials — success', () => {
  it('returns normalized identity data on 200 with a valid verifier response', async () => {
    mockFetchResponse(200, VALID_IDENTITY_RESULT);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.data).toEqual(VALID_IDENTITY_RESULT);
    expect(result.error).toBeUndefined();
  });

  it('sends only the expected credential verifier request body', async () => {
    mockFetchResponse(200, VALID_IDENTITY_RESULT);

    await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(global.fetch).toHaveBeenCalledWith(
      VALID_URL,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(TEST_PAYLOAD),
        redirect: 'manual',
        cache: 'no-store',
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Invalid credentials classification (400 / 401 / 403)
// ---------------------------------------------------------------------------

describe('verifyPasswordCredentials — invalid credentials', () => {
  it('classifies HTTP 401 as invalid_credentials', async () => {
    mockFetchResponse(401);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('invalid_credentials');
    expect(result.data).toBeUndefined();
  });

  it('classifies HTTP 403 as invalid_credentials', async () => {
    mockFetchResponse(403);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('invalid_credentials');
  });

  it('classifies HTTP 400 as invalid_credentials', async () => {
    mockFetchResponse(400);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('invalid_credentials');
  });
});

// ---------------------------------------------------------------------------
// Login-failed classification (5xx / network / timeout / malformed)
// ---------------------------------------------------------------------------

describe('verifyPasswordCredentials — login failed', () => {
  it('classifies HTTP 500 as login_failed', async () => {
    mockFetchResponse(500);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
    expect(result.data).toBeUndefined();
  });

  it('classifies HTTP 503 as login_failed', async () => {
    mockFetchResponse(503);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('classifies a network (fetch) failure as an error', async () => {
    mockFetchThrows(new TypeError('fetch failed'));

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it('classifies an AbortError (timeout) as timeout', async () => {
    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    mockFetchThrows(abortError);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('timeout');
  });

  it('classifies 200 with no subject as login_failed', async () => {
    mockFetchResponse(200, { some_other_field: 'value' });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('classifies 200 with empty subject as login_failed', async () => {
    mockFetchResponse(200, { subject: '', context: VALID_IDENTITY_RESULT.context });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('classifies 302 as login_failed', async () => {
    mockFetchResponse(302, undefined, {});

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('classifies malformed JSON on 200 as login_failed', async () => {
    mockFetchMalformedJson(200);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('rejects an invalid normalized identity context as login_failed', async () => {
    mockFetchResponse(200, {
      subject: 'ext:testuser',
      context: {
        identity: {
          groups: ['engineering', ''],
        },
      },
    });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('rejects a missing normalized identity context as login_failed', async () => {
    mockFetchResponse(200, { subject: 'ext:testuser' });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('rejects a normalized identity context without identity or authentication', async () => {
    mockFetchResponse(200, { subject: 'ext:testuser', context: {} });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });
});

// ---------------------------------------------------------------------------
// Secret-safety assertions
// ---------------------------------------------------------------------------

describe('verifyPasswordCredentials — secret safety', () => {
  it('does not include the password in returned error objects on 401', async () => {
    mockFetchResponse(401);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(JSON.stringify(result)).not.toContain(TEST_PAYLOAD.password);
  });

  it('does not include the password in returned error objects on 500', async () => {
    mockFetchResponse(500);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(JSON.stringify(result)).not.toContain(TEST_PAYLOAD.password);
  });

  it('does not include the password in network failure error objects', async () => {
    mockFetchThrows(new TypeError('fetch failed'));

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(JSON.stringify(result)).not.toContain(TEST_PAYLOAD.password);
  });

  it('does not include the password in timeout error objects', async () => {
    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    mockFetchThrows(abortError);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(JSON.stringify(result)).not.toContain(TEST_PAYLOAD.password);
  });

  it('does not include the password in success result objects', async () => {
    mockFetchResponse(200, VALID_IDENTITY_RESULT);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(JSON.stringify(result)).not.toContain(TEST_PAYLOAD.password);
  });

  it('does not include raw invalid normalized identity data in returned errors', async () => {
    mockFetchResponse(200, {
      subject: 'ext:testuser',
      context: {
        identity: {
          attributes: {
            private_key: { raw: 'must-not-leak' },
          },
        },
      },
    });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect(JSON.stringify(result)).not.toContain('private_key');
  });
});

describe('normalizePasswordVerifierIdentityResult', () => {
  it('copies only the normalized identity envelope that Shyntr accepts', () => {
    const result = normalizePasswordVerifierIdentityResult({
      ...VALID_IDENTITY_RESULT,
      upstream_response: { token: 'must-not-forward' },
      context: {
        ...VALID_IDENTITY_RESULT.context,
        raw: { token: 'must-not-forward' },
      },
    });

    expect(result).toEqual(VALID_IDENTITY_RESULT);
    expect(JSON.stringify(result)).not.toContain('must-not-forward');
  });

  it('rejects subjects with surrounding whitespace', () => {
    expect(
      normalizePasswordVerifierIdentityResult({
        subject: ' ext:testuser ',
        context: VALID_IDENTITY_RESULT.context,
      })
    ).toBeUndefined();
  });

  it('rejects unsupported attribute values', () => {
    expect(
      normalizePasswordVerifierIdentityResult({
        subject: 'ext:testuser',
        context: {
          identity: {
            attributes: {
              profile: { nested: true },
            },
          },
        },
      })
    ).toBeUndefined();
  });
});
