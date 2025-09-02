"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // trailingSlash is true, include the slash
    window.location.replace("/dashboard/");
  }, []);
  return (
    <div className="p-6">
      <p>Redirecting to Dashboard…</p>
      <a href="/dashboard/" className="text-blue-600 underline">Go now</a>
    </div>
  );
}
