import { getTranslations } from 'next-intl/server';
import { CardWrapper } from '@/components/CardWrapper';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface LogoutPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LogoutPage({ searchParams }: LogoutPageProps) {
  const params = await searchParams;
  const error = params.error;
  const t = await getTranslations('logout');

  return (
    <CardWrapper>
      <div className="text-center">
        <div
          className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${
            error ? 'bg-red-50' : 'bg-green-50'
          }`}
        >
          {error ? (
            <AlertCircle className="h-8 w-8 text-red-500" />
          ) : (
            <CheckCircle className="h-8 w-8 text-green-500" />
          )}
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          {error ? 'Request failed' : t('title')}
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          {error || t('message')}
        </p>
        <Link href="/">
          <Button className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md">
            {error ? 'Back to app' : t('backToLogin')}
          </Button>
        </Link>
      </div>
    </CardWrapper>
  );
}
