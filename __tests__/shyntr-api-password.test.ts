import { verifyPasswordCredentials } from '@/lib/shyntr-api';

const VALID_URL = 'http://localhost:7497/auth/password/verify';

// Use a fixed password string that is easy to search for in serialized output.
const TEST_PAYLOAD = {
  login_challenge: 'test_challenge_abc123',
  username: 'testuser',
  password: 'S3cr3tP@ssw0rd!',
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
  it('returns redirect_to on 200 with valid absolute http redirect_to', async () => {
    mockFetchResponse(200, { redirect_to: 'https://backend.shyntr.example/oauth/continue' });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.data?.redirect_to).toBe('https://backend.shyntr.example/oauth/continue');
    expect(result.error).toBeUndefined();
  });

  it('follows a 302 with a valid Location header', async () => {
    mockFetchResponse(302, undefined, {
      location: 'https://backend.shyntr.example/oauth/continue',
    });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.data?.redirect_to).toBe('https://backend.shyntr.example/oauth/continue');
    expect(result.error).toBeUndefined();
  });

  it('follows a 301 with a valid Location header', async () => {
    mockFetchResponse(301, undefined, {
      location: 'https://backend.shyntr.example/oauth/continue',
    });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.data?.redirect_to).toBe('https://backend.shyntr.example/oauth/continue');
    expect(result.error).toBeUndefined();
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

  it('classifies 200 with no redirect_to as login_failed', async () => {
    mockFetchResponse(200, { some_other_field: 'value' });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('classifies 200 with empty redirect_to as login_failed', async () => {
    mockFetchResponse(200, { redirect_to: '' });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('classifies 302 without a Location header as login_failed', async () => {
    mockFetchResponse(302, undefined, {});

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('classifies malformed JSON on 200 as login_failed', async () => {
    mockFetchMalformedJson(200);

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('rejects a javascript: redirect_to (200 body) as login_failed', async () => {
    mockFetchResponse(200, { redirect_to: 'javascript:alert(1)' });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('rejects a data: redirect_to (200 body) as login_failed', async () => {
    mockFetchResponse(200, { redirect_to: 'data:text/html,<script>evil</script>' });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(result.error?.error).toBe('login_failed');
  });

  it('rejects a javascript: Location header (302) as login_failed', async () => {
    mockFetchResponse(302, undefined, { location: 'javascript:alert(1)' });

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
    mockFetchResponse(200, { redirect_to: 'https://backend.shyntr.example/oauth/continue' });

    const result = await verifyPasswordCredentials(VALID_URL, TEST_PAYLOAD);

    expect(JSON.stringify(result)).not.toContain(TEST_PAYLOAD.password);
  });
});
