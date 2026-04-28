'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  acceptLogin,
  acceptConsent,
  isAllowedAuthUrl,
  loginWithLDAP,
  rejectConsent,
  rejectLogin,
  verifyPasswordCredentials,
  AcceptLoginPayload,
  AcceptConsentPayload,
} from '@/lib/shyntr-api';

export interface LoginFormState {
  error?: string;
  success?: boolean;
}

export interface ConsentFormState {
  error?: string;
  success?: boolean;
}

function getRedirectDiagnosticSummary(redirectTo: string | undefined) {
  if (!redirectTo) {
    return undefined;
  }

  try {
    const parsed = new URL(redirectTo);
    return {
      origin: parsed.origin,
      pathname: parsed.pathname,
    };
  } catch {
    return {
      invalid: true,
    };
  }
}

export async function setLocale(locale: string) {
  const cookieStore = await cookies();
  cookieStore.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}

export async function handleLoginSubmit(
  loginChallenge: string,
  prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const methodType = String(formData.get('auth_method_type') || 'password');
  const loginURL = String(formData.get('auth_method_login_url') || '');
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');
  const remember = formData.get('remember') === 'on';

  if (!loginChallenge || loginChallenge.trim() === '') {
    return { error: 'login_failed' };
  }

  if (username === '' || password === '') {
    return { error: 'Username and password are required.' };
  }

  if (methodType === 'ldap') {
    if (loginURL === '') {
      return { error: 'The LDAP login route is missing.' };
    }

    const result = await loginWithLDAP(loginURL, {
      login_challenge: loginChallenge,
      username,
      password,
    });

    if (result.error) {
      return { error: result.error.error_description || 'LDAP login failed.' };
    }

    if (result.data?.redirect_to) {
      redirect(result.data.redirect_to);
    }

    return { error: 'No redirect URL received.' };
  }

  if (methodType === 'password') {
    if (loginURL === '') {
      return { error: 'login_unavailable' };
    }

    if (!isAllowedAuthUrl(loginURL)) {
      return { error: 'login_failed' };
    }

    const result = await verifyPasswordCredentials(loginURL, {
      login_challenge: loginChallenge,
      username,
      password,
    });

    if (result.error) {
      if (result.error.error === 'invalid_credentials') {
        return { error: 'invalid_credentials' };
      }
      return { error: 'login_failed' };
    }

    if (!result.data) {
      return { error: 'login_failed' };
    }

    console.info('Password login accept start', {
      flow: 'password',
      has_login_challenge: loginChallenge.trim() !== '',
      subject: result.data.subject,
      has_identity_context: result.data.context.identity !== undefined,
      has_authentication_context: result.data.context.authentication !== undefined,
    });

    const payload: AcceptLoginPayload = {
      subject: result.data.subject,
      remember,
      remember_for: remember ? 3600 : 0,
      context: result.data.context,
    };

    const acceptResult = await acceptLogin(loginChallenge, payload);

    if (acceptResult.error) {
      console.error('Password login accept failed', {
        flow: 'password',
        has_login_challenge: loginChallenge.trim() !== '',
        subject: result.data.subject,
        status_code: acceptResult.error.status_code ?? null,
        backend_error: acceptResult.error.error,
        backend_error_description: acceptResult.error.error_description ?? null,
      });
      return { error: 'login_failed' };
    }

    const redirectTo = acceptResult.data?.redirect_to;
    const hasRedirectTo = typeof redirectTo === 'string' && redirectTo !== '';

    console.info('Password login accept result', {
      flow: 'password',
      subject: result.data.subject,
      has_redirect_to: hasRedirectTo,
      response_keys:
        acceptResult.data && typeof acceptResult.data === 'object'
          ? Object.keys(acceptResult.data)
          : [],
      redirect_summary: getRedirectDiagnosticSummary(redirectTo),
    });

    if (acceptResult.data?.redirect_to) {
      redirect(acceptResult.data.redirect_to);
    }

    console.error('Password login accept missing redirect target', {
      flow: 'password',
      subject: result.data.subject,
      response_keys:
        acceptResult.data && typeof acceptResult.data === 'object'
          ? Object.keys(acceptResult.data)
          : [],
    });

    return { error: 'login_failed' };
  }

  return { error: 'login_failed' };
}

export async function handleLoginCancel(loginChallenge: string): Promise<void> {
  const result = await rejectLogin(loginChallenge);

  if (result.data?.redirect_to) {
    redirect(result.data.redirect_to);
  }

  const error = result.error?.error_description || 'The login request could not be canceled.';
  redirect(`/logout?error=${encodeURIComponent(error)}`);
}

export async function handleConsentAccept(
  consentChallenge: string,
  prevState: ConsentFormState,
  formData: FormData
): Promise<ConsentFormState> {
  const grantedScopes: string[] = [];
  const grantedAudience: string[] = [];

  formData.forEach((value, key) => {
    if (value !== 'on') {
      return;
    }

    if (key.startsWith('scope_')) {
      grantedScopes.push(key.replace('scope_', ''));
    }

    if (key.startsWith('audience_')) {
      grantedAudience.push(key.replace('audience_', ''));
    }
  });

  const remember = formData.get('remember') === 'on';

  const payload: AcceptConsentPayload = {
    grant_scope: grantedScopes,
    grant_audience: grantedAudience,
    remember,
    remember_for: remember ? 3600 : 0,
  };

  const result = await acceptConsent(consentChallenge, payload);

  if (result.error) {
    return { error: result.error.error_description || 'Failed to grant consent.' };
  }

  if (result.data?.redirect_to) {
    redirect(result.data.redirect_to);
  }

  return { error: 'No redirect URL received.' };
}

export async function handleConsentDeny(consentChallenge: string): Promise<void> {
  const result = await rejectConsent(consentChallenge);

  if (result.data?.redirect_to) {
    redirect(result.data.redirect_to);
  }

  const error = result.error?.error_description || 'The consent request could not be canceled.';
  redirect(`/logout?error=${encodeURIComponent(error)}`);
}
