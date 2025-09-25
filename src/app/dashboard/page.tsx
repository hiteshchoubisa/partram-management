"use client";

import { useEffect, useState, useMemo } from "react";
import ManagementLayout from "../../components/ManagementLayout";
import { supabase } from "../../lib/supabaseClient";
import { formatDateTimeLabel } from "../../components/DateTimePicker";
import MonthlySalesWidget from "../../components/MonthlySalesWidget";
import Pagination from "../../components/ui/Pagination";

type Order = {
  id: string;
  client: string;
  order_date: string; // DB column
  status?: "Pending" | "Delivered" | null;
  items?: any;
};

type Client = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
};

const STATUS_TABS = ["Pending", "Delivered"] as const;
type OrderStatusTab = typeof STATUS_TABS[number];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [clients, setClients] = useState<Client[]>([]);

  const [statusTab, setStatusTab] = useState<OrderStatusTab>("Pending");
  const [statusOrders, setStatusOrders] = useState<Record<OrderStatusTab, Order[]>>({
    Pending: [],
    Delivered: [],
  });
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusErr, setStatusErr] = useState<string | null>(null);

  // Pagination state for status orders
  const [statusPage, setStatusPage] = useState(1);
  const statusPageSize = 10;

  useEffect(() => {
    void loadClients();
    void loadUpcomingOrders();
    void loadStatusOrders();
  }, []);

  useEffect(() => {
    function handleOrdersChanged() {
      loadStatusOrders();
    }
    window.addEventListener("orders:changed", handleOrdersChanged);
    return () => window.removeEventListener("orders:changed", handleOrdersChanged);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("orders_dashboard_status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload: any) => {
          const newStatus = payload.new?.status;
          const oldStatus = payload.old?.status;
          const needs =
            STATUS_TABS.includes(newStatus) ||
            STATUS_TABS.includes(oldStatus);
          if (needs) {
            loadStatusOrders();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, address, phone")
      .order("name", { ascending: true });
    if (!error && data) {
      setClients(data as Client[]);
    }
  }

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
        .or(`status.is.null,status.in.(${STATUS_TABS.join(",")})`)
        .order("order_date", { ascending: true });
      if (error) throw error;

      const map: Record<OrderStatusTab, Order[]> = {
        Pending: [],
        Delivered: [],
      };
      (data as Order[]).forEach((o) => {
        const st = (o.status === "Delivered" ? "Delivered" : "Pending") as OrderStatusTab;
        map[st].push(o);
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
      default:
        return "border-amber-300 text-amber-700";
    }
  }

  function getClientAddress(clientName: string) {
    const c = clients.find((cl) => cl.name === clientName);
    return c?.address || null;
  }

  // Pagination logic for status orders
  const currentStatusOrders = useMemo(() => {
    return statusOrders[statusTab] || [];
  }, [statusOrders, statusTab]);

  const totalStatusPages = useMemo(() => {
    return Math.max(1, Math.ceil(currentStatusOrders.length / statusPageSize));
  }, [currentStatusOrders.length]);

  const pagedStatusOrders = useMemo(() => {
    const start = (statusPage - 1) * statusPageSize;
    return currentStatusOrders.slice(start, start + statusPageSize);
  }, [currentStatusOrders, statusPage]);

  // Reset page when status tab changes
  useEffect(() => {
    setStatusPage(1);
  }, [statusTab]);

  // Clamp page when total pages change
  useEffect(() => {
    setStatusPage((p) => Math.min(p, totalStatusPages));
  }, [totalStatusPages]);

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
            {STATUS_TABS.map((st) => {
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
          <p className="text-loading">Loading orders…</p>
        ) : currentStatusOrders.length === 0 ? (
          <p className="text-sm opacity-70">No {statusTab.toLowerCase()} orders.</p>
        ) : (
          <>
            <ul className="divide-y divide-black/10 dark:divide-white/10">
              {pagedStatusOrders.map((o) => (
              <li key={o.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{o.client}</p>
                  {/* ✅ Show client address under name */}
                  {getClientAddress(o.client) ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getClientAddress(o.client)}
                    </p>
                  ) : null}
                  <p className="text-secondary-xs">
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
          
          {/* Pagination for status orders */}
          {currentStatusOrders.length > statusPageSize && (
            <div className="mt-4">
              <Pagination
                page={statusPage}
                pageSize={statusPageSize}
                totalItems={currentStatusOrders.length}
                onPageChange={setStatusPage}
              />
            </div>
          )}
          </>
        )}
      </section>
    </ManagementLayout>
  );
}