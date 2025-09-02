"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PasswordInput from "../../components/ui/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");

      // Ensure Header sees it immediately (cookie also set by API)
      document.cookie = "pm_auth=1; Path=/; SameSite=Lax";
      document.cookie = `pm_role=${json.user?.role || "user"}; Path=/; SameSite=Lax`;
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 header-bg">
      <Image
        src="/logo.svg"
        alt="Patram Management"
        width={140}
        height={28}
        priority
      />
      <div className="w-full max-w-sm rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-900 p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Use any phone and password to continue.</p>

        {error ? (
          <div className="rounded-md border border-red-300 text-red-700 bg-red-50 px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone (Username)</label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="10-digit phone"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              placeholder="Your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}