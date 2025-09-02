"use client";
import Link from "next/link";
import React from "react";

type Props = {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href: string;
  icon?: React.ReactNode;
  className?: string;
};

export default function StatCard({ title, value, hint, href, icon, className }: Props) {
  return (
    <Link
      href={href}
      className={`rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-900 p-4 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
          <div className="mt-1 text-3xl font-semibold">{value}</div>
          {hint ? <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</div> : null}
        </div>
        {icon ? <div className="text-gray-400">{icon}</div> : null}
      </div>
      <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">View details →</div>
    </Link>
  );
}