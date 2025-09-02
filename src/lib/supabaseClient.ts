import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
} else {
  const masked = `${anon.slice(0, 6)}…${anon.slice(-6)}`;
  console.log(`[supabase] Using ${url} with anon ${masked}`);
}

export const supabase = createClient(url || "", anon || "", {
  auth: { persistSession: false },
});

