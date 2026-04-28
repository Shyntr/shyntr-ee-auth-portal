import { getTranslations } from 'next-intl/server';
import { CardWrapper } from '@/components/CardWrapper';
import { ChevronRight, LogIn, CheckSquare, LogOut } from 'lucide-react';
import Link from 'next/link';

export default async function HomePage() {
  const t = await getTranslations('home');

  return (
    <CardWrapper>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500">
          {t('subtitle')}
        </p>
      </div>

      <p className="text-sm text-gray-500 text-center mb-6">
        {t('description')}
      </p>

      <div className="space-y-3">
        <Link href="/login?login_challenge=test_challenge_123" className="block">
          <div className="group flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:border-blue-500 hover:bg-blue-50 hover:shadow-sm transition-all duration-200 cursor-pointer">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
              <LogIn className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{t('loginPage')}</div>
              <div className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">{t('loginDesc')}</div>
            </div>
             <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </Link>

        <Link href="/consent?consent_challenge=test_consent_456" className="block">
          <div className="group flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:border-blue-500 hover:bg-blue-50 hover:shadow-sm transition-all duration-200 cursor-pointer">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors">
              <CheckSquare className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{t('consentPage')}</div>
              <div className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">{t('consentDesc')}</div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </Link>

        <Link href="/logout" className="block">
          <div className="group flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:border-blue-500 hover:bg-blue-50 hover:shadow-sm transition-all duration-200 cursor-pointer">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
              <LogOut className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{t('logoutPage')}</div>
              <div className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">{t('logoutDesc')}</div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
        </Link>
      </div>
    </CardWrapper>
  );
}
