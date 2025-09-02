"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // trailingSlash is true, so include the slash
    window.location.replace("/orders/");
  }, []);
  return (
    <div className="p-6">
      <p>Redirecting to Orders…</p>
      <a href="/orders/" className="text-blue-600 underline">Go now</a>
    </div>
  );
}
