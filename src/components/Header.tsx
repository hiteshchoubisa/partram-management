"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

const nav = [
  { href: "/dashboard/", label: "Dashboard" },
  { href: "/orders/", label: "Orders" },
  { href: "/clients/", label: "Clients" },
  { href: "/products/", label: "Products" },
  { href: "/shop/", label: "Shop" },
  { href: "/reminders/", label: "Reminders" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  // Prefetch key routes once (no-op in dev, helps in production)
  useEffect(() => {
    const r: any = router as any;
    if (typeof r?.prefetch === "function") {
      nav.forEach((n) => r.prefetch(n.href));
    }
  }, [router]); // nav is static

  // Close on ESC and lock body scroll when drawer is open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setAuthed(document.cookie.includes("pm_auth=1"));
  }, []);

  return (
    <header className="header-bg w-full p-4 border-b border-zinc-200 dark:border-zinc-800">
      <div className="h-10 flex justify-between items-center">
        <Link href="/dashboard" className="flex items-center gap-2" prefetch>
          <Image
            src="/logo-patram.svg"
            alt="Patram Management"
            width={140}
            height={28}
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-6 text-sm items-center">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onMouseEnter={() => {
                const r: any = router as any;
                if (typeof r?.prefetch === "function") r.prefetch(item.href);
              }}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`hover:underline ${isActive(item.href) ? "underline underline-offset-4 font-medium" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Toggle menu"
          aria-controls="mobile-drawer"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {open ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <>
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-drawer"
        className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        {/* Panel */}
        <aside
          className={`absolute right-0 top-0 h-full w-72 bg-white dark:bg-zinc-900 shadow-lg transform transition-transform ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
        >
          <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-200 dark:border-zinc-800">
            <span className="font-semibold">Menu</span>
            <button
              type="button"
              className="rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="px-4 py-3 space-y-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onMouseEnter={() => {
                  const r: any = router as any;
                  if (typeof r?.prefetch === "function") r.prefetch(item.href);
                }}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`block rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${isActive(item.href) ? "font-medium underline underline-offset-4" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </header>
  );
}