import { isAllowedAuthUrl } from '@/lib/shyntr-api';

// Default trusted origins are derived from env vars set in jest.setup.ts:
//   SHYNTR_INTERNAL_API_URL = http://localhost:7497
//   SHYNTR_PUBLIC_API_URL   = http://localhost:7496

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run a test after setting SHYNTR_AUTH_ALLOWED_ORIGINS, restore afterwards. */
function withExtraOrigins(value: string, fn: () => void): () => void {
  return () => {
    const original = process.env.SHYNTR_AUTH_ALLOWED_ORIGINS;
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS = value;
    try {
      fn();
    } finally {
      if (original === undefined) {
        delete process.env.SHYNTR_AUTH_ALLOWED_ORIGINS;
      } else {
        process.env.SHYNTR_AUTH_ALLOWED_ORIGINS = original;
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Default trusted origins (SHYNTR_INTERNAL_API_URL / SHYNTR_PUBLIC_API_URL)
// ---------------------------------------------------------------------------

describe('isAllowedAuthUrl — default trusted origins', () => {
  it('accepts a URL under the internal API origin', () => {
    expect(isAllowedAuthUrl('http://localhost:7497/auth/password/verify')).toBe(true);
  });

  it('accepts a URL under the public API origin', () => {
    expect(isAllowedAuthUrl('http://localhost:7496/auth/methods')).toBe(true);
  });

  it('accepts a deeper subpath under a trusted origin', () => {
    expect(isAllowedAuthUrl('http://localhost:7497/v1/auth/password/verify')).toBe(true);
  });

  it('accepts the bare origin root of the internal API', () => {
    expect(isAllowedAuthUrl('http://localhost:7497')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SHYNTR_AUTH_ALLOWED_ORIGINS — extra origin support
// ---------------------------------------------------------------------------

describe('isAllowedAuthUrl — SHYNTR_AUTH_ALLOWED_ORIGINS', () => {
  afterEach(() => {
    delete process.env.SHYNTR_AUTH_ALLOWED_ORIGINS;
  });

  it('accepts a URL whose origin is listed in the extra env var', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS = 'https://auth.example.com';
    expect(isAllowedAuthUrl('https://auth.example.com/auth/verify')).toBe(true);
  });

  it('accepts a URL matching the second of multiple extra origins', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS =
      'https://verifier-a.example.com,https://verifier-b.example.com';
    expect(isAllowedAuthUrl('https://verifier-b.example.com/verify')).toBe(true);
  });

  it('accepts a URL matching the first of multiple extra origins', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS =
      'https://verifier-a.example.com,https://verifier-b.example.com';
    expect(isAllowedAuthUrl('https://verifier-a.example.com/verify')).toBe(true);
  });

  it('accepts a URL when the entry has surrounding whitespace', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS = '  https://auth.example.com  ';
    expect(isAllowedAuthUrl('https://auth.example.com/auth/verify')).toBe(true);
  });

  it('accepts a URL when the list has an empty entry followed by a valid origin', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS = ',https://auth.example.com';
    expect(isAllowedAuthUrl('https://auth.example.com/auth/verify')).toBe(true);
  });

  it('ignores empty entries in the comma-separated list', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS = ',,  ,,';
    // Default origins still work; no crash from empty entries
    expect(isAllowedAuthUrl('http://localhost:7497/auth')).toBe(true);
    expect(isAllowedAuthUrl('https://auth.example.com/auth')).toBe(false);
  });

  it('ignores invalid (non-parseable) entries and keeps valid ones', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS =
      'not-a-url,https://auth.example.com';
    expect(isAllowedAuthUrl('https://auth.example.com/verify')).toBe(true);
  });

  it('ignores a ftp:// entry in the extra list', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS = 'ftp://auth.example.com';
    expect(isAllowedAuthUrl('ftp://auth.example.com/verify')).toBe(false);
  });

  it('does not accept an origin not in the extra list', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS = 'https://auth.example.com';
    expect(isAllowedAuthUrl('https://other.example.com/verify')).toBe(false);
  });

  it('does not accept an extra origin with a different port', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS = 'https://auth.example.com:8443';
    expect(isAllowedAuthUrl('https://auth.example.com/verify')).toBe(false);
  });

  it('default origins still work when extra origins are set', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS = 'https://auth.example.com';
    expect(isAllowedAuthUrl('http://localhost:7497/auth')).toBe(true);
    expect(isAllowedAuthUrl('http://localhost:7496/auth')).toBe(true);
  });

  it('extra origin enables password verifier on separate service', () => {
    process.env.SHYNTR_AUTH_ALLOWED_ORIGINS = 'https://verifier.internal:8443';
    expect(
      isAllowedAuthUrl('https://verifier.internal:8443/api/v1/password/verify')
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Untrusted origins (no extra env var set)
// ---------------------------------------------------------------------------

describe('isAllowedAuthUrl — untrusted origins', () => {
  it('rejects an unknown hostname', () => {
    expect(isAllowedAuthUrl('http://evil.com/auth/password')).toBe(false);
  });

  it('rejects a URL with the correct host but a different port', () => {
    expect(isAllowedAuthUrl('http://localhost:9999/auth/password')).toBe(false);
  });

  it('rejects a URL with an extra subdomain', () => {
    expect(isAllowedAuthUrl('http://internal.localhost:7497/auth')).toBe(false);
  });

  it('rejects http when the trusted entry is https', () => {
    expect(isAllowedAuthUrl('http://auth.example.com/verify')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Dangerous protocols
// ---------------------------------------------------------------------------

describe('isAllowedAuthUrl — dangerous protocols', () => {
  it('rejects a javascript: URL', () => {
    expect(isAllowedAuthUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects a data: URL', () => {
    expect(isAllowedAuthUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects a ftp: URL', () => {
    expect(isAllowedAuthUrl('ftp://localhost:7497/auth')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Invalid inputs
// ---------------------------------------------------------------------------

describe('isAllowedAuthUrl — invalid inputs', () => {
  it('rejects a relative URL', () => {
    expect(isAllowedAuthUrl('/auth/password')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isAllowedAuthUrl('')).toBe(false);
  });
});
