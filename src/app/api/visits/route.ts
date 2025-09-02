import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-static";
// Optional: export const revalidate = 3600;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceRole);

export async function GET(req: NextRequest) {
  try {
    const sp = new URL(req.url).searchParams;
    const upcoming = sp.get("upcoming") === "1";
    const fromParam = sp.get("from");
    const toParam = sp.get("to");
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "100", 10) || 100, 1), 1000);

    let query = admin
      .from("visits")
      // status removed from DB; don't select it
      .select("id,client,date,phone,address")
      .order("date", { ascending: true });

    if (upcoming) {
      query = query.gte("date", new Date().toISOString());
    } else {
      if (fromParam) query = query.gte("date", fromParam);
      if (toParam) query = query.lte("date", toParam);
    }

    const { data, error } = await query.limit(limit);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ visits: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load visits" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = {
      client: String(body.client || "").trim(),
      date: String(body.date || ""),
      phone: String(body.phone || ""),
      address: String(body.address || "").trim(),
    };
    if (!payload.client || !payload.date) {
      return NextResponse.json({ error: "Client and date are required" }, { status: 400 });
    }
    const { data, error } = await admin.from("visits").insert([payload]).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ visit: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to add visit" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const update: any = {};
    if (body.client != null) update.client = String(body.client).trim();
    if (body.date != null) update.date = String(body.date);
    if (body.phone != null) update.phone = String(body.phone);
    if (body.address != null) update.address = String(body.address).trim();

    const { data, error } = await admin.from("visits").update(update).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ visit: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update visit" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const { error } = await admin.from("visits").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    // Always return JSON
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete visit" }, { status: 500 });
  }
}