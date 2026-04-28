// Set required environment variables before any module-level code in
// shyntr-api.ts runs. These values mirror the defaults in .env and
// determine the trusted auth URL origins used in isAllowedAuthUrl().
process.env.SHYNTR_INTERNAL_API_URL = 'http://localhost:7497';
process.env.SHYNTR_PUBLIC_API_URL = 'http://localhost:7496';
