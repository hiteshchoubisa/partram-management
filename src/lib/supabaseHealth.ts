import { supabase } from "./supabaseClient";

export async function supabaseHealth() {
  const { count, error } = await supabase.from("clients").select("*", { count: "exact", head: true });
  return { ok: !error, error, count: count ?? null };
}