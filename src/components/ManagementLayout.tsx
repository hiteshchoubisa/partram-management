"use client";

import React from "react";
import Header from "./Header";

type Props = {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  containerClassName?: string;
};

export default function ManagementLayout({
  title,
  subtitle,
  actions,
  children,
  containerClassName,
}: Props) {
  return (
    <div className="min-h-screen font-sans">
      <Header />
      <main className="w-full">
        <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 ${containerClassName ?? ""}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              {subtitle ? (
                <p className="text-subtitle">{subtitle}</p>
              ) : null}
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}