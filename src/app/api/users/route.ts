import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";
// Optional: revalidate once per build only (no runtime): export const revalidate = 3600;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceRole) {
  console.error("[users api] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

console.log("[users api] env check", {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const admin = createClient(url, serviceRole);

export async function GET() {
  const { data, error } = await admin
    .from("users")
    .select("id,name,phone,role")
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ users: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const role = req.cookies.get("pm_role")?.value;
    if (role !== "admin" && role !== "mass_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { name, phone, role: userRole = "user", password, password_hash } = await req.json();
    if (!name || !phone || (!password && !password_hash)) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const hash = password_hash || crypto.createHash("sha256").update(String(password)).digest("hex");
    const { data, error } = await admin
      .from("users")
      .insert([{ name: String(name).trim(), phone: String(phone).trim(), role: userRole, password_hash: hash }])
      .select("id,name,phone,role")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ user: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const role = req.cookies.get("pm_role")?.value;
    if (role !== "admin" && role !== "mass_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { error } = await admin.from("users").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}