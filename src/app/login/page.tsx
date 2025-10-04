"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Check if user exists in our users table first
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError || !userData) {
        setError("User not found in system");
        setLoading(false);
        return;
      }

      // Password check - try direct comparison first
      if (userData.password_hash !== password) {
        // If direct comparison fails, try SHA-256 hash
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        if (userData.password_hash !== hashedPassword) {
          setError("Invalid email or password");
          setLoading(false);
          return;
        }
      }

      // Create a session by setting a cookie
      document.cookie = `pm_auth=1; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
      document.cookie = `pm_user=${encodeURIComponent(JSON.stringify({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      }))}; path=/; max-age=${60 * 60 * 24 * 7}`;

      // Force page reload to update auth context
      window.location.href = "/dashboard";
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50  py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 ">
            <svg className="h-6 w-6 text-green-600 " fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 ">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 ">
            Patram Management System
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300  placeholder-gray-500  text-gray-900  rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm bg-white "
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300  placeholder-gray-500  text-gray-900  rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm bg-white "
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50  p-4">
              <div className="text-sm text-red-700 ">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-green-600 hover:text-green-500  "
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
