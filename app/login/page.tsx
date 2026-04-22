import { getLoginSession, getLoginMethods, getTenantPortalTheme } from '@/lib/shyntr-api';
import { LoginForm } from '@/components/LoginForm';
import { SessionExpired } from '@/components/SessionExpired';

interface LoginPageProps {
  searchParams: Promise<{ login_challenge?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const loginChallenge = params.login_challenge;

  if (!loginChallenge) {
    return <SessionExpired />;
  }

  const [sessionRes, methodsRes] = await Promise.all([
    getLoginSession(loginChallenge),
    getLoginMethods(loginChallenge),
  ]);

  if (sessionRes.error || !sessionRes.data || methodsRes.error) {
    return <SessionExpired />;
  }

  const brandingTenantId = sessionRes.data.TenantID || methodsRes.data?.tenant_id || '';
  const tenantName = brandingTenantId || 'Shyntr';
  const clientName = sessionRes.data.ClientID || 'Application';
  const methods = methodsRes.data?.methods || [];
  const theme = await getTenantPortalTheme(brandingTenantId);

  return (
    <LoginForm
      loginChallenge={loginChallenge}
      tenantName={tenantName}
      clientName={clientName}
      methods={methods}
      theme={theme}
    />
  );
}
