import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase Init] Checking Environment Variables...');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase Init] ERROR: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing!');
  console.warn('[Supabase Init] Please ensure environment variables are configured in Vercel/Local .env');
}

// We still export the client, but we add a safety check
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

console.log('[Supabase Init] Client created successfully.');
