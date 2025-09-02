import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceRole);

export async function POST(req: Request) {
  try {
    const { phone, password } = await req.json();
    const normPhone = String(phone || "").trim().replace(/[^\d+]/g, "");
    const pass = String(password || "");

    if (!normPhone || !pass) {
      return NextResponse.json({ error: "Phone and password are required" }, { status: 400 });
    }

    const { data: user, error } = await admin
      .from("users")
      .select("id,name,phone,role,password_hash")
      .eq("phone", normPhone)
      .limit(1)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const hash = crypto.createHash("sha256").update(pass).digest("hex");
    if (hash !== user.password_hash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    });
    res.cookies.set("pm_auth", "1", { path: "/", sameSite: "lax" });
    res.cookies.set("pm_role", String(user.role || "user"), { path: "/", sameSite: "lax" }); // add this
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Login failed" }, { status: 500 });
  }
}