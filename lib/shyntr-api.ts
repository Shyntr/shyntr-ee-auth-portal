import axios, { AxiosError } from 'axios';
import { DEFAULT_PORTAL_THEME } from './portal-theme';
import type { PortalLogoPlacement, PortalTheme } from './portal-theme';
export type { PortalLogoPlacement, PortalTheme } from './portal-theme';
export { DEFAULT_PORTAL_THEME } from './portal-theme';

export interface LoginSessionResponse {
  ID: string;
  TenantID: string;
  ClientID: string;
  Subject: string;
  RequestedScope?: string[];
  RequestedAudience?: string[];
  RequestURL?: string;
  Protocol?: string;
  Authenticated?: boolean;
  Remember?: boolean;
  RememberFor?: number;
  Active?: boolean;
}

export interface ClientInfo {
  client_id: string;
  tenant_id: string;
  name: string;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  response_modes?: string[];
  scopes?: string[];
  audience?: string[];
  public?: boolean;
  token_endpoint_auth_method?: string;
  enforce_pkce?: boolean;
  allowed_cors_origins?: string[];
  post_logout_redirect_uris?: string[];
  jwks_uri?: string;
  id_token_encrypted_response_alg?: string;
  id_token_encrypted_response_enc?: string;
  skip_consent?: boolean;
  subject_type?: string;
  backchannel_logout_uri?: string;
  access_token_lifespan?: string;
  id_token_lifespan?: string;
  refresh_token_lifespan?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ConsentSessionResponse {
  challenge: string;
  client_id: string;
  subject?: string;
  requested_scope: string[];
  requested_audience?: string[];
  skip?: boolean;
  request_url?: string;
  client?: ClientInfo;
  tenant?: string;
}

export interface AcceptLoginPayload {
  subject: string;
  remember?: boolean;
  remember_for?: number;
  context?: Record<string, unknown>;
}

export interface LDAPLoginPayload {
  login_challenge: string;
  username: string;
  password: string;
}

export interface AcceptConsentPayload {
  grant_scope: string[];
  grant_audience?: string[];
  remember?: boolean;
  remember_for?: number;
}

export interface RejectRequestPayload {
  error: string;
  error_description?: string;
}

export interface RedirectResponse {
  redirect_to: string;
}

export interface ApiError {
  error: string;
  error_description?: string;
  status_code?: number;
}

export interface AuthMethod {
  id: string;
  type: 'password' | 'saml' | 'oidc' | 'ldap';
  name: string;
  logo_url?: string;
  login_url?: string;
}

export interface LoginMethodsResponse {
  challenge: string;
  tenant_id: string;
  methods: AuthMethod[];
}

interface TenantBrandingStateResponse {
  tenantId?: string;
  draft?: Record<string, unknown> | null;
  published?: Record<string, unknown> | null;
  hasUnpublishedChanges?: boolean;
  updatedAt?: string;
  publishedAt?: string;
}

const INTERNAL_API_URL = process.env.SHYNTR_INTERNAL_API_URL;
const PUBLIC_API_URL = process.env.SHYNTR_PUBLIC_API_URL;

if (!INTERNAL_API_URL || !PUBLIC_API_URL) {
  throw new Error(
    'SHYNTR_INTERNAL_API_URL and SHYNTR_PUBLIC_API_URL are required. Expected current backend admin/public origins, for example http://localhost:7497 and http://localhost:7496.'
  );
}

const apiClient = axios.create({
  baseURL: `${INTERNAL_API_URL}/admin`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const COLOR_PATTERN =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^rgba?\([\d\s,.%]+\)$|^hsla?\([\d\s,.%]+\)$/;

function mapFetchError(status: number, data: unknown, fallback: string): ApiError {
  const body = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};

  return {
    error: typeof body.error === 'string' ? body.error : 'api_error',
    error_description:
      typeof body.error_description === 'string' ? body.error_description : fallback,
    status_code: status,
  };
}

function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    if (axiosError.response) {
      return {
        error: axiosError.response.data?.error || 'api_error',
        error_description: axiosError.response.data?.error_description || axiosError.message,
        status_code: axiosError.response.status,
      };
    }

    return {
      error: 'network_error',
      error_description: axiosError.message,
      status_code: 0,
    };
  }

  return {
    error: 'unknown_error',
    error_description: String(error),
    status_code: 500,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNestedValue(
  source: Record<string, unknown> | undefined,
  path: string[]
): unknown {
  let current: unknown = source;

  for (const key of path) {
    if (!isRecord(current) || !(key in current)) {
      return undefined;
    }

    current = current[key];
  }

  return current;
}

function getFirstString(
  source: Record<string, unknown> | undefined,
  paths: string[][]
): string | undefined {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return undefined;
}

function getFirstNumber(
  source: Record<string, unknown> | undefined,
  paths: string[][]
): number | undefined {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) {
        return numericValue;
      }
    }
  }

  return undefined;
}

function getFirstRecord(
  source: Record<string, unknown> | undefined,
  paths: string[][]
): Record<string, unknown> | undefined {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (isRecord(value)) {
      return value;
    }
  }

  return undefined;
}

function normalizeColor(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  return COLOR_PATTERN.test(value) ? value : fallback;
}

function normalizeRadius(value: string | number | undefined, fallback: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const clamped = Math.min(32, Math.max(0, value));
    return `${clamped}px`;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'none':
    case '0':
      return '0px';
    case 'sm':
    case 'small':
      return '0.75rem';
    case 'md':
    case 'medium':
    case 'default':
      return '1rem';
    case 'lg':
    case 'large':
      return '1.25rem';
    case 'xl':
    case 'full':
      return '1.5rem';
    default:
      return fallback;
  }
}

function normalizeShadow(value: string | number | undefined, fallback: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    switch (Math.max(0, Math.min(3, Math.round(value)))) {
      case 0:
        return 'none';
      case 1:
        return '0 12px 30px rgba(15, 23, 42, 0.08)';
      case 2:
        return '0 20px 45px rgba(15, 23, 42, 0.12)';
      case 3:
        return '0 24px 60px rgba(15, 23, 42, 0.16)';
      default:
        return fallback;
    }
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'none':
      return 'none';
    case 'sm':
    case 'small':
    case 'soft':
      return '0 12px 30px rgba(15, 23, 42, 0.08)';
    case 'md':
    case 'medium':
    case 'default':
      return '0 20px 45px rgba(15, 23, 42, 0.12)';
    case 'lg':
    case 'large':
    case 'strong':
      return '0 24px 60px rgba(15, 23, 42, 0.16)';
    default:
      return fallback;
  }
}

function normalizeLogoPlacement(value: string | undefined): PortalLogoPlacement {
  if (!value) {
    return DEFAULT_PORTAL_THEME.logo.placement;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'left' || normalized === 'top-left' ? 'left' : 'center';
}

function normalizeLogoWidth(value: string | number | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(160, Math.max(48, Math.round(value)));
  }

  if (typeof value === 'string') {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return Math.min(160, Math.max(48, Math.round(numericValue)));
    }

    const normalized = value.trim().toLowerCase();
    switch (normalized) {
      case 'sm':
      case 'small':
        return 72;
      case 'md':
      case 'medium':
        return 96;
      case 'lg':
      case 'large':
        return 120;
      default:
        return fallback;
    }
  }

  return fallback;
}

function normalizeLogoAlt(value: string | undefined, tenantId: string): string {
  if (value && value.trim() !== '') {
    return value.trim();
  }

  return tenantId || DEFAULT_PORTAL_THEME.logo.alt;
}

// Returns true only for valid HTTPS URLs.
// Used to guard image URLs before they are embedded in CSS url() values.
function isValidHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

// Darkens a 6-digit hex color by the given factor (default 15 %).
// Used to derive hover states from a primary color when the backend
// does not supply a separate hover value.
function darkenColor(hex: string, factor: number = 0.85): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Math.round(parseInt(clean.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(clean.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(clean.slice(4, 6), 16) * factor);
  return (
    '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0')
  );
}

function normalizePortalTheme(
  tenantId: string,
  published: Record<string, unknown> | null | undefined
): PortalTheme {
  if (!published || Object.keys(published).length === 0) {
    return {
      ...DEFAULT_PORTAL_THEME,
      tenantId: tenantId || DEFAULT_PORTAL_THEME.tenantId,
      logo: {
        ...DEFAULT_PORTAL_THEME.logo,
        alt: normalizeLogoAlt(undefined, tenantId || DEFAULT_PORTAL_THEME.logo.alt),
      },
    };
  }

  // Extract the five top-level sections present in the confirmed backend schema.
  // All speculative intermediate keys (surfaces, card, page, buttons, inputs,
  // links, text) have been removed — they do not exist in the backend payload.
  const colors  = getFirstRecord(published, [['colors']]);
  const borders = getFirstRecord(published, [['borders']]);
  const widget  = getFirstRecord(published, [['widget']]);
  const pageBg  = getFirstRecord(published, [['page_background']]);
  const fonts   = getFirstRecord(published, [['fonts']]);

  // Resolve primary once; all interactive-color fields derive from it.
  const primary = normalizeColor(
    getFirstString(colors, [['primary']]),
    DEFAULT_PORTAL_THEME.buttonBackground
  );

  // Resolve page background: type=image with a valid HTTPS URL → image mode.
  // Any other combination is treated as a solid color.
  const pageBgType    = getFirstString(pageBg, [['type']]);
  const pageBgValue   = getFirstString(pageBg, [['value']]) ?? '';
  const isImageBg     =
    pageBgType === 'image' && pageBgValue !== '' && isValidHttpsUrl(pageBgValue);

  // borders.width → borderWidth (clamped 0–10 px, integer)
  const rawBorderWidth = getFirstNumber(borders, [['width']]);
  const borderWidth =
    typeof rawBorderWidth === 'number' && Number.isFinite(rawBorderWidth)
      ? `${Math.min(10, Math.max(0, Math.round(rawBorderWidth)))}px`
      : DEFAULT_PORTAL_THEME.borderWidth;

  return {
    tenantId: tenantId || DEFAULT_PORTAL_THEME.tenantId,

    // page_background: solid color or HTTPS image URL.
    // When type=image the value is a URL — do not pass it through normalizeColor.
    pageBackground: isImageBg
      ? DEFAULT_PORTAL_THEME.pageBackground
      : normalizeColor(pageBgValue || undefined, DEFAULT_PORTAL_THEME.pageBackground),
    pageBackgroundType: isImageBg ? 'image' : 'color',
    pageBackgroundImageUrl: isImageBg ? pageBgValue : undefined,

    // colors.background → cardBackground
    cardBackground: normalizeColor(
      getFirstString(colors, [['background']]),
      DEFAULT_PORTAL_THEME.cardBackground
    ),

    // colors.border → cardBorderColor
    cardBorderColor: normalizeColor(
      getFirstString(colors, [['border']]),
      DEFAULT_PORTAL_THEME.cardBorderColor
    ),

    // borders.width → borderWidth
    borderWidth,

    // borders.radius (integer, px) → cardRadius
    cardRadius: normalizeRadius(
      getFirstNumber(borders, [['radius']]),
      DEFAULT_PORTAL_THEME.cardRadius
    ),

    // No backend shadow field — preserve default.
    cardShadow: normalizeShadow(undefined, DEFAULT_PORTAL_THEME.cardShadow),

    // colors.surface → surfaceSubtle
    surfaceSubtle: normalizeColor(
      getFirstString(colors, [['surface']]),
      DEFAULT_PORTAL_THEME.surfaceSubtle
    ),

    // colors.text → textPrimary
    textPrimary: normalizeColor(
      getFirstString(colors, [['text']]),
      DEFAULT_PORTAL_THEME.textPrimary
    ),

    // colors.textSecondary / colors.text_secondary → textSecondary
    textSecondary: normalizeColor(
      getFirstString(colors, [['textSecondary'], ['text_secondary']]),
      DEFAULT_PORTAL_THEME.textSecondary
    ),

    // No backend textMuted field — preserve default.
    textMuted: DEFAULT_PORTAL_THEME.textMuted,

    // colors.primary → buttonBackground
    buttonBackground: primary,

    // Derived: darken primary by 15 % → buttonBackgroundHover
    buttonBackgroundHover: darkenColor(primary),

    // Always white — no backend field.
    buttonText: DEFAULT_PORTAL_THEME.buttonText,

    // colors.background → inputBackground
    inputBackground: normalizeColor(
      getFirstString(colors, [['background']]),
      DEFAULT_PORTAL_THEME.inputBackground
    ),

    // colors.border → inputBorderColor
    inputBorderColor: normalizeColor(
      getFirstString(colors, [['border']]),
      DEFAULT_PORTAL_THEME.inputBorderColor
    ),

    // colors.text → inputText
    inputText: normalizeColor(
      getFirstString(colors, [['text']]),
      DEFAULT_PORTAL_THEME.inputText
    ),

    // No backend placeholder field — preserve default.
    inputPlaceholder: DEFAULT_PORTAL_THEME.inputPlaceholder,

    // colors.primary → inputFocusColor
    inputFocusColor: primary,

    // colors.primary → linkColor
    linkColor: primary,

    // Derived: darken primary → linkHoverColor
    linkHoverColor: darkenColor(primary),

    // colors.primary → iconColor
    iconColor: primary,

    // fonts.family → fontFamily
    fontFamily: getFirstString(fonts, [['family']]) ?? DEFAULT_PORTAL_THEME.fontFamily,

    // fonts.weightNormal / fonts.weight_normal → fontWeightNormal
    fontWeightNormal: getFirstNumber(fonts, [['weightNormal'], ['weight_normal']]) ?? DEFAULT_PORTAL_THEME.fontWeightNormal,

    // fonts.weightBold / fonts.weight_bold → fontWeightBold
    fontWeightBold: getFirstNumber(fonts, [['weightBold'], ['weight_bold']]) ?? DEFAULT_PORTAL_THEME.fontWeightBold,

    // widget.loginTitle / widget.login_title → loginTitle (optional override)
    loginTitle: getFirstString(widget, [['loginTitle'], ['login_title']]) || undefined,

    // widget.loginSubtitle / widget.login_subtitle → loginSubtitle (optional override)
    loginSubtitle: getFirstString(widget, [['loginSubtitle'], ['login_subtitle']]) || undefined,

    logo: {
      // widget.logoUrl / widget.logo_url → imageUrl (undefined when empty)
      imageUrl: getFirstString(widget, [['logoUrl'], ['logo_url']]),

      // displayName → logo.alt fallback; then tenantId
      alt: normalizeLogoAlt(
        getFirstString(published, [['displayName']]),
        tenantId || DEFAULT_PORTAL_THEME.logo.alt
      ),

      // No backend placement field — preserve default.
      placement: normalizeLogoPlacement(undefined),

      // No backend logo-width field — preserve default.
      width: normalizeLogoWidth(undefined, DEFAULT_PORTAL_THEME.logo.width),
    },
  };
}

export async function getTenantPortalTheme(tenantId?: string): Promise<PortalTheme> {
  if (!tenantId || tenantId.trim() === '') {
    return DEFAULT_PORTAL_THEME;
  }

  try {
    const response = await apiClient.get<TenantBrandingStateResponse>(
      `/management/tenants/${encodeURIComponent(tenantId)}/branding`
    );

    return normalizePortalTheme(tenantId, response.data?.published);
  } catch {
    return {
      ...DEFAULT_PORTAL_THEME,
      tenantId,
      logo: {
        ...DEFAULT_PORTAL_THEME.logo,
        alt: normalizeLogoAlt(undefined, tenantId),
      },
    };
  }
}

export async function getLoginSession(
  loginChallenge: string
): Promise<{ data?: LoginSessionResponse; error?: ApiError }> {
  try {
    const response = await apiClient.get<LoginSessionResponse>('/login', {
      params: { login_challenge: loginChallenge },
    });

    return { data: response.data };
  } catch (error) {
    return { error: handleApiError(error) };
  }
}

export async function acceptLogin(
  loginChallenge: string,
  payload: AcceptLoginPayload
): Promise<{ data?: RedirectResponse; error?: ApiError }> {
  try {
    const response = await apiClient.put<RedirectResponse>('/login/accept', payload, {
      params: { login_challenge: loginChallenge },
    });

    return { data: response.data };
  } catch (error) {
    return { error: handleApiError(error) };
  }
}

export async function rejectLogin(
  loginChallenge: string
): Promise<{ data?: RedirectResponse; error?: ApiError }> {
  try {
    const payload: RejectRequestPayload = { error: 'access_denied' };
    const response = await apiClient.put<RedirectResponse>('/login/reject', payload, {
      params: { login_challenge: loginChallenge },
    });

    return { data: response.data };
  } catch (error) {
    return { error: handleApiError(error) };
  }
}

export async function getConsentSession(
  consentChallenge: string
): Promise<{ data?: ConsentSessionResponse; error?: ApiError }> {
  try {
    const response = await apiClient.get<ConsentSessionResponse>('/consent', {
      params: { consent_challenge: consentChallenge },
    });

    return { data: response.data };
  } catch (error) {
    return { error: handleApiError(error) };
  }
}

export async function acceptConsent(
  consentChallenge: string,
  payload: AcceptConsentPayload
): Promise<{ data?: RedirectResponse; error?: ApiError }> {
  try {
    const response = await apiClient.put<RedirectResponse>('/consent/accept', payload, {
      params: { consent_challenge: consentChallenge },
    });

    return { data: response.data };
  } catch (error) {
    return { error: handleApiError(error) };
  }
}

export async function rejectConsent(
  consentChallenge: string
): Promise<{ data?: RedirectResponse; error?: ApiError }> {
  try {
    const payload: RejectRequestPayload = { error: 'access_denied' };
    const response = await apiClient.put<RedirectResponse>('/consent/reject', payload, {
      params: { consent_challenge: consentChallenge },
    });

    return { data: response.data };
  } catch (error) {
    return { error: handleApiError(error) };
  }
}

export async function getLoginMethods(
  challenge: string
): Promise<{ data?: LoginMethodsResponse; error?: ApiError }> {
  try {
    const response = await fetch(
      `${PUBLIC_API_URL}/auth/methods?login_challenge=${encodeURIComponent(challenge)}`,
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      return {
        error: mapFetchError(
          response.status,
          data,
          `Failed to retrieve login methods (${response.status}).`
        ),
      };
    }

    const data = (await response.json()) as LoginMethodsResponse;
    return { data };
  } catch (error) {
    return { error: handleApiError(error) };
  }
}

export async function loginWithLDAP(
  loginURL: string,
  payload: LDAPLoginPayload
): Promise<{ data?: RedirectResponse; error?: ApiError }> {
  try {
    const response = await fetch(loginURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'manual',
      cache: 'no-store',
    });

    if (response.status >= 300 && response.status < 400) {
      const redirectTo = response.headers.get('location');
      if (!redirectTo) {
        return {
          error: {
            error: 'server_error',
            error_description: 'LDAP login completed without a redirect location.',
            status_code: response.status,
          },
        };
      }

      return { data: { redirect_to: redirectTo } };
    }

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      return {
        error: mapFetchError(
          response.status,
          data,
          `LDAP login failed (${response.status}).`
        ),
      };
    }

    if (typeof data === 'object' && data !== null) {
      const redirectTo = (data as Record<string, unknown>).redirect_to;
      if (typeof redirectTo === 'string' && redirectTo !== '') {
        return { data: { redirect_to: redirectTo } };
      }
    }

    return {
      error: {
        error: 'server_error',
        error_description: 'LDAP login did not return a redirect target.',
        status_code: response.status,
      },
    };
  } catch (error) {
    return { error: handleApiError(error) };
  }
}
