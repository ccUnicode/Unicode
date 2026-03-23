import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_ANON_KEY;
const serv = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', url);
console.log('Anon Key length:', key?.length);
console.log('Service Key length:', serv?.length);

try {
  const supabase = createClient(url || '', key || '');
  console.log('Supabase client created successfully');
} catch (e) {
  console.error('Error creating client:', e.message);
}
