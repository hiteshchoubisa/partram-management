import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const db = getSupabaseAdmin() ?? getSupabaseServer(); // fallback to anon for read
  if (!db) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  try {
    const { data, error } = await db
      .from("visits")
      .select("id, client, date, phone, address, message") // + message
      .order("date", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ visits: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const db = getSupabaseAdmin(); // write requires service role
  if (!db) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  try {
    const body = await req.json();
    const payload = {
      client: String(body.client || "").trim(),
      date: String(body.date || "").trim(),
      phone: (body.phone ?? null) as string | null,
      address: (body.address ?? null) as string | null,
      message: (typeof body.message === "string" && body.message.trim().length > 0) ? body.message.trim() : null, // + message
    };
    if (!payload.client || !payload.date) throw new Error("Missing client or date");
    const { data, error } = await db
      .from("visits")
      .insert([payload])
      .select("id, client, date, phone, address, message") // + message
      .single();
    if (error) throw error;
    return NextResponse.json({ visit: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Add failed" }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const db = getSupabaseAdmin(); // update requires service role
  if (!db) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) throw new Error("Missing id");
    const updates: any = {};
    if (body.client !== undefined) updates.client = String(body.client).trim();
    if (body.date !== undefined) updates.date = String(body.date).trim();
    if (body.phone !== undefined) updates.phone = (body.phone as string | null) ?? null;
    if (body.address !== undefined) updates.address = (body.address as string | null) ?? null;
    if (body.message !== undefined) { // + message
      const m = typeof body.message === "string" ? body.message.trim() : body.message;
      updates.message = m && m.length ? m : null;
    }

    const { data, error } = await db
      .from("visits")
      .update(updates)
      .eq("id", id)
      .select("id, client, date, phone, address, message") // + message
      .single();
    if (error) throw error;
    return NextResponse.json({ visit: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Update failed" }, { status: 400 });
  }
}