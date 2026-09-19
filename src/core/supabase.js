import { createClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL
         ?? globalThis.process?.env?.SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_ANON_KEY
         ?? globalThis.process?.env?.SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY no configurados');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true }
});