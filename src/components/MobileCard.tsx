"use client";
import React from "react";

type Row = { label: React.ReactNode; value: React.ReactNode };

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode; // e.g., status select
  rows?: Row[];
  children?: React.ReactNode; // any extra custom content
};

export default function MobileCard({ title, subtitle, right, rows, children }: Props) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{title}</div>
          {subtitle ? <div className="text-xs text-gray-500">{subtitle}</div> : null}
        </div>
        {right ?? null}
      </div>

      {rows && rows.length > 0 ? (
        <div className="mt-0 text-sm space-y-1">
          {rows.map((r, i) => (
            <div key={i} className="text-mobile-label">
              <span className="text-xs uppercase tracking-wide">{r.label}: </span>
              <span className="font-medium">{r.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {children}
    </>
  );
}