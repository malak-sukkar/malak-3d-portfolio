const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function getCvConfig() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

export function getPublicCvPageUrls() {
  if (!supabaseUrl) return null;
  return [1, 2].map((page) => `${supabaseUrl}/storage/v1/object/public/cv/page-${page}`);
}
