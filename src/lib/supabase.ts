import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
// Normalize URL - standard Supabase client wants the base URL without rest/v1 or trailing slash
const cleanedUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '');

const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const supabase = createClient(cleanedUrl, anonKey);
