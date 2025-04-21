
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pkvicbubpswhqvroezre.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmljYnVicHN3aHF2cm9lenJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NTEyNTUsImV4cCI6MjA1NTUyNzI1NX0.YuXkEARdRthtgd9Iqt-TkAz4R8siQPtetsRm7x2ZDBM';

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Key is missing. Please provide valid values.');
  }

export const supabase = createClient(supabaseUrl, supabaseKey);
