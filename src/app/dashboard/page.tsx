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

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [pendingErr, setPendingErr] = useState<string | null>(null);
  const [pendingLoading, setPendingLoading] = useState(true);

  useEffect(() => {
    void loadUpcomingOrders();
    void loadPendingOrders();
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

  async function loadPendingOrders() {
    try {
      setPendingErr(null);
      setPendingLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("id, client, order_date, status")
        .eq("status", "Pending")
        .order("order_date", { ascending: true });
      if (error) throw error;
      setPendingOrders((data as Order[]) ?? []);
    } catch (e: any) {
      console.error("[dashboard] pending orders load failed:", e?.message);
      setPendingErr(e?.message || "Failed to load pending orders");
    } finally {
      setPendingLoading(false);
    }
  }

  return (
    <ManagementLayout title="Dashboard">
      <section className="mb-8">
        <MonthlySalesWidget />
      </section>

      {/* Pending Orders Section */}
      <section className="rounded-lg border border-black/10 dark:border-white/15 p-4 mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Pending Orders</h2>
          <Link href="/orders" className="text-sm text-blue-600 hover:underline" prefetch>
            Manage
          </Link>
        </div>
        {pendingErr && !pendingLoading ? (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {pendingErr}
          </div>
        ) : null}
        {pendingLoading ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading pending orders…</p>
        ) : pendingOrders.length === 0 ? (
          <p className="text-sm opacity-70">No pending orders.</p>
        ) : (
          <ul className="divide-y divide-black/10 dark:divide-white/10">
            {pendingOrders.map((o) => (
              <li key={o.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{o.client}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {formatDateTimeLabel(o.order_date)}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs border-amber-300 text-amber-700">
                  {o.status || "Pending"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming Orders Section */}
      <section className="rounded-lg border border-black/10 dark:border-white/15 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Upcoming Orders</h2>
          <Link href="/orders" className="text-sm text-blue-600 hover:underline" prefetch>
            See all
          </Link>
        </div>

        {ordersErr && !loading ? (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {ordersErr}
          </div>
        ) : null}

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
    </ManagementLayout>
  );
}