import { getConsentSession, getTenantPortalTheme } from '@/lib/shyntr-api';
import { ConsentForm } from '@/components/ConsentForm';
import { SessionExpired } from '@/components/SessionExpired';

interface ConsentPageProps {
  searchParams: Promise<{ consent_challenge?: string }>;
}

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams;
  const consentChallenge = params.consent_challenge;

  if (!consentChallenge) {
    return <SessionExpired />;
  }

  const { data, error } = await getConsentSession(consentChallenge);

  if (error || !data) {
    return <SessionExpired />;
  }

  const brandingTenantId = data.tenant || data.client?.tenant_id || '';
  const tenantName = brandingTenantId || 'Shyntr';
  const clientName = data.client?.name || data.client_id || 'Application';
  const requestedScopes = data.requested_scope || ['openid', 'profile'];
  const requestedAudience = data.requested_audience || [];
  const userSubject = data.subject;
  const theme = await getTenantPortalTheme(brandingTenantId);

  return (
    <ConsentForm
      consentChallenge={consentChallenge}
      tenantName={tenantName}
      clientName={clientName}
      requestedScopes={requestedScopes}
      requestedAudience={requestedAudience}
      userSubject={userSubject}
      theme={theme}
    />
  );
}
