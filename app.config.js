module.exports = ({ config }) => {
  const configuredBaseUrl = process.env.GITHUB_PAGES_BASE_URL?.trim();
  const baseUrl = configuredBaseUrl?.replace(/\/+$/, '') || '';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (baseUrl && !baseUrl.startsWith('/')) {
    throw new Error('GITHUB_PAGES_BASE_URL must be an absolute URL path, such as /KMO-POS.');
  }

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env or the build environment.'
    );
  }

  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};
