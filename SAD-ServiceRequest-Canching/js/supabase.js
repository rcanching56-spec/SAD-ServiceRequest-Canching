import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = 'https://edududfqdabckdthztun.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UeMvYZwobnBYxizHSmlMSA_d0tlmWUq';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
