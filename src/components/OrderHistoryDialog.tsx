"use client";

import React, { useEffect } from "react";
import { formatDateTimeLabel } from "./DateTimePicker";

type OrderItem = { id: string; order_date: string };

type Props = {
  open: boolean;
  onClose: () => void;
  clientName: string | null;
  items: OrderItem[];
};

export default function OrderHistoryDialog({ open, onClose, clientName, items }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-lg border border-black/10 dark:border-white/15 bg-background p-4 shadow-xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Order history{clientName ? ` • ${clientName}` : ""}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-sm opacity-70">No orders found.</div>
        ) : (
          <ul className="divide-y divide-black/10 dark:divide-white/10 max-h-96 overflow-auto">
            {items.map((o) => (
              <li key={o.id} className="py-2 flex items-center justify-between text-sm">
                <span>{formatDateTimeLabel(o.order_date)}</span>
                <a href="/orders/" className="text-blue-600 hover:underline text-xs">Open</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}