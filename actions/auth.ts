'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  acceptConsent,
  acceptLogin,
  loginWithLDAP,
  rejectConsent,
  rejectLogin,
  AcceptConsentPayload,
  AcceptLoginPayload,
} from '@/lib/shyntr-api';

const MOCK_USERS: Record<string, { password: string; userId: string }> = {
  admin: { password: 'password', userId: 'user-admin-001' },
  demo: { password: 'demo123', userId: 'user-demo-002' },
};

export interface LoginFormState {
  error?: string;
  success?: boolean;
}

export interface ConsentFormState {
  error?: string;
  success?: boolean;
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
  const username = String(formData.get('username') || '');
  const password = String(formData.get('password') || '');
  const remember = formData.get('remember') === 'on';

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

  const user = MOCK_USERS[username];
  if (!user || user.password !== password) {
    return { error: 'invalid_credentials' };
  }

  const payload: AcceptLoginPayload = {
    subject: user.userId,
    remember,
    remember_for: remember ? 3600 : 0,
    context: {
      username,
      login_claims: {
        email: `${username}@shyntr.local`,
        department: 'Engineering',
        employee_id: user.userId,
      },
    },
  };

  const result = await acceptLogin(loginChallenge, payload);

  if (result.error) {
    return { error: result.error.error_description || 'Login failed.' };
  }

  if (result.data?.redirect_to) {
    redirect(result.data.redirect_to);
  }

  return { error: 'No redirect URL received.' };
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
