"use client";

import { useEffect, useState } from "react";
import ManagementLayout from "../../components/ManagementLayout";
import { supabase } from "../../lib/supabaseClient";
import { formatDateTimeLabel } from "../../components/DateTimePicker";
import Link from "next/link";

type Visit = {
  id: string;
  client: string;
  date: string;
  phone?: string | null;
  address?: string | null;
};

type Order = {
  id: string;
  client: string;
  order_date: string;
  status?: string | null;
  items?: any;
};

export default function DashboardPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const nowIso = new Date().toISOString();

        // Upcoming visits (via API to avoid RLS issues)
        let upcomingVisits: Visit[] = [];
        try {
          const res = await fetch(`/api/visits?upcoming=1&limit=5`, { cache: "no-store" });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Failed to load visits");
          upcomingVisits = (json.visits as Visit[]) ?? [];
        } catch (e: any) {
          // Fallback: direct supabase (requires read policy)
          const { data, error } = await supabase
            .from("visits")
            .select("id,client,date,phone,address")
            .gte("date", nowIso)
            .order("date", { ascending: true })
            .limit(5);
          if (error) throw error;
          upcomingVisits = (data as Visit[]) ?? [];
        }

        // Upcoming orders (next 5 by order_date; keep status if present)
        const { data: upcomingOrders, error: oErr } = await supabase
          .from("orders")
          .select("id,client,order_date,status,items")
          .gte("order_date", nowIso)
          .order("order_date", { ascending: true })
          .limit(5);
        if (oErr) {
          console.error("[dashboard] orders load failed:", oErr.message);
        }

        if (!cancelled) {
          setVisits(upcomingVisits);
          setOrders((upcomingOrders as Order[]) ?? []);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error("[dashboard] load failed:", e?.message || e);
          setError(e?.message || "Failed to load dashboard data");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ManagementLayout title="Dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Visits */}
        <section className="rounded-lg border border-black/10 dark:border-white/15 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Upcoming Visits</h2>
            <Link href="/visits" className="text-sm text-blue-600 hover:underline" prefetch>
              See all
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading visits…</p>
          ) : error ? (
            <p className="text-sm text-red-600">Failed: {error}</p>
          ) : visits.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">No upcoming visits.</p>
          ) : (
            <ul className="divide-y divide-black/10 dark:divide-white/10">
              {visits.map((v) => (
                <li key={v.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{v.client}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formatDateTimeLabel(v.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {v.phone ? (
                      <a
                        href={`tel:${String(v.phone).replace(/[^+\d]/g, "")}`}
                        className="text-sm text-blue-600 hover:underline"
                        title="Call"
                      >
                        {v.phone}
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming Orders */}
        <section className="rounded-lg border border-black/10 dark:border-white/15 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Upcoming Orders</h2>
            <Link href="/orders" className="text-sm text-blue-600 hover:underline" prefetch>
              See all
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">No upcoming orders.</p>
          ) : (
            <ul className="divide-y divide-black/10 dark:divide-white/10">
              {orders.map((o) => (
                <li key={o.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{o.client}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDateTimeLabel(o.order_date)}
                      </p>
                    </div>
                    {o.status ? (
                      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs border-black/10 dark:border-white/15">
                        {o.status}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ManagementLayout>
  );
}