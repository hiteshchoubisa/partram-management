"use client";

import { useEffect, useState } from "react";
import ManagementLayout from "../../components/ManagementLayout";
import { supabase } from "../../lib/supabaseClient";
import { formatDateTimeLabel } from "../../components/DateTimePicker";
import Link from "next/link";
import MonthlySalesWidget from "../../components/MonthlySalesWidget";

type Order = {
  id: string;
  client: string;
  order_date: string; // DB column
  status?: string | null;
  items?: any;
};

const STATUS_TABS = ["Pending", "Delivered", "Completed"] as const;
type OrderStatusTab = typeof STATUS_TABS[number];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<OrderStatusTab>("Pending");
  const [statusOrders, setStatusOrders] = useState<Record<OrderStatusTab, Order[]>>({
    Pending: [],
    Delivered: [],
    Completed: [],
  });
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusErr, setStatusErr] = useState<string | null>(null);

  useEffect(() => {
    void loadUpcomingOrders();
    void loadStatusOrders();
  }, []);

  async function loadUpcomingOrders() {
    try {
      setOrdersErr(null);
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const { data, error } = await supabase
        .from("orders")
        .select("id, client, order_date, status, items")
        .gte("order_date", today)
        .order("order_date", { ascending: true })
        .limit(10);
      if (error) throw error;
      setOrders((data as Order[]) ?? []);
    } catch (e: any) {
      console.error("[dashboard] orders load failed:", e?.message);
      setOrdersErr(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function loadStatusOrders() {
    try {
      setStatusErr(null);
      setStatusLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("id, client, order_date, status")
        .in("status", STATUS_TABS as any)
        .order("order_date", { ascending: true });
      if (error) throw error;

      const map: Record<OrderStatusTab, Order[]> = {
        Pending: [],
        Delivered: [],
        Completed: [],
      };
      (data as Order[]).forEach(o => {
        const st = (o.status || "Pending") as OrderStatusTab;
        if (map[st]) map[st].push(o);
      });
      setStatusOrders(map);
    } catch (e: any) {
      console.error("[dashboard] status orders load failed:", e?.message);
      setStatusErr(e?.message || "Failed to load orders by status");
    } finally {
      setStatusLoading(false);
    }
  }

  function statusBadgeClass(s?: string | null) {
    switch (s) {
      case "Delivered":
        return "border-green-300 text-green-700";
      case "Completed":
        return "border-blue-300 text-blue-700";
      default:
        return "border-amber-300 text-amber-700";
    }
  }

  return (
    <ManagementLayout title="Dashboard">
      <section className="mb-8">
        <MonthlySalesWidget />
      </section>

      {/* Orders by Status Section */}
      <section className="rounded-lg border border-black/10 dark:border-white/15 p-4 mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Orders by Status</h2>
          <div className="flex gap-2">
            {STATUS_TABS.map(st => {
              const count = statusOrders[st]?.length || 0;
              const active = statusTab === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusTab(st)}
                  className={`rounded-md border px-3 py-1.5 text-xs sm:text-sm transition ${
                    active
                      ? "bg-foreground text-background"
                      : "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                  title={st}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {statusErr && !statusLoading ? (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {statusErr}
          </div>
        ) : null}

        {statusLoading ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading orders…</p>
        ) : statusOrders[statusTab].length === 0 ? (
          <p className="text-sm opacity-70">No {statusTab.toLowerCase()} orders.</p>
        ) : (
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {statusOrders[statusTab].map(o => (
              <li key={o.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{o.client}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {formatDateTimeLabel(o.order_date)}
                  </p>
                </div>
                <span
                  className={
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs " +
                    statusBadgeClass(o.status)
                  }
                >
                  {o.status || "Pending"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      
    </ManagementLayout>
  );
}