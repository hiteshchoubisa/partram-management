"use client";

import { useEffect, useMemo, useState } from "react";
import ManagementLayout from "../../components/ManagementLayout";
import Pagination from "../../components/ui/Pagination";
import { supabase } from "../../lib/supabaseClient";
import { formatDateTimeLabel } from "../../components/DateTimePicker";
import DataTable, { Column } from "../../components/DataTable"; // fixed
import MobileCard from "../../components/MobileCard";

type Client = {
  id: string;
  name: string;
  phone?: string | null;
};

type Order = {
  id: string;
  client: string; // matches Client.name in your schema
  order_date: string;
};

type Pref = { everyDays: number; lastRemindedAt?: string | null };

const LS_KEY = "client-reminder-prefs";
const DEFAULT_EVERY_DAYS = 30;

// Storage helpers
function loadPrefs(): Record<string, Pref> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function savePrefs(p: Record<string, Pref>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {}
}

// Date helpers
function daysBetween(aIso?: string | null, bIso?: string | null): number | null {
  if (!aIso || !bIso) return null;
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!isFinite(a) || !isFinite(b)) return null;
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return diff;
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// Helpers to build WhatsApp link (default country: India +91)
function toWhatsappNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return "91" + digits;
  if (digits.startsWith("0") && digits.length === 11) return "91" + digits.slice(1);
  return digits.length >= 8 ? digits : null;
}
function buildWaLink(name: string, phone?: string | null, nextDueAt?: string | null) {
  const num = toWhatsappNumber(phone);
  if (!num) return null;
  const when = nextDueAt ? ` on ${formatDateTimeLabel(nextDueAt)}` : "";
  const msg = `Hi ${name}, this is a reminder for your next order${when}. Please reply to schedule.`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

// Row model for UI
type ReminderRow = {
  clientId: string;
  clientName: string;
  phone?: string | null;
  lastOrderAt?: string | null;
  everyDays: number;
  lastRemindedAt?: string | null;
  nextDueAt: string; // ISO
  dueLabel: "Past Due" | "Due Today" | "Upcoming";
};

export default function RemindersPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prefs, setPrefs] = useState<Record<string, Pref>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // search
  const [q, setQ] = useState("");

  // Load client prefs from localStorage
  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  // Fetch clients and recent orders
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const sinceIso = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString(); // last 1 year

        const [cRes, oRes] = await Promise.all([
          supabase.from("clients").select("id,name,phone").order("name", { ascending: true }),
          supabase
            .from("orders")
            .select("id,client,order_date")
            .gte("order_date", sinceIso)
            .order("order_date", { ascending: false }), // latest first
        ]);

        if (cancel) return;

        if (cRes.error) throw cRes.error;
        if (oRes.error) throw oRes.error;

        setClients((cRes.data as Client[]) ?? []);
        setOrders((oRes.data as Order[]) ?? []);
        setLoading(false);
      } catch (e: any) {
        if (cancel) return;
        setErr(e?.message || "Failed to load reminders");
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Build rows
  const rows = useMemo<ReminderRow[]>(() => {
    const nowIso = new Date().toISOString();

    // Map latest order per client name
    const latestOrderByClient = new Map<string, string>(); // clientName -> last order_date ISO
    for (const o of orders) {
      if (!o.client || !o.order_date) continue;
      if (!latestOrderByClient.has(o.client)) {
        latestOrderByClient.set(o.client, o.order_date);
      }
    }

    return clients.map((c) => {
      const pref = prefs[c.id] ?? { everyDays: DEFAULT_EVERY_DAYS };
      const lastOrderAt = latestOrderByClient.get(c.name) ?? null;

      // If user marked reminded after last order, base due on the later of the two
      const baseIso = (() => {
        if (!pref.lastRemindedAt) return lastOrderAt ?? nowIso;
        if (!lastOrderAt) return pref.lastRemindedAt;
        return new Date(pref.lastRemindedAt) > new Date(lastOrderAt)
          ? pref.lastRemindedAt
          : lastOrderAt;
      })();

      const nextDueAt = addDays(baseIso, Math.max(1, pref.everyDays));
      const cmp = new Date(nextDueAt).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
      const dueLabel = cmp < 0 ? "Past Due" : cmp === 0 ? "Due Today" : "Upcoming";

      return {
        clientId: c.id,
        clientName: c.name,
        phone: c.phone ?? null,
        lastOrderAt,
        everyDays: Math.max(1, pref.everyDays),
        lastRemindedAt: pref.lastRemindedAt ?? null,
        nextDueAt,
        dueLabel,
      };
    });
  }, [clients, orders, prefs]);

  // Filter and sort (due first)
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = ql
      ? rows.filter(
          (r) =>
            r.clientName.toLowerCase().includes(ql) ||
            (r.phone || "").toString().includes(ql)
        )
      : rows.slice();

    list.sort((a, b) => {
      // Due first: Past Due, Due Today, then by nextDueAt ascending
      const rank = (r: ReminderRow) => (r.dueLabel === "Past Due" ? 0 : r.dueLabel === "Due Today" ? 1 : 2);
      const dr = rank(a) - rank(b);
      if (dr !== 0) return dr;
      return new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime();
    });

    return list;
  }, [rows, q]);

  // Pagination slice
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length]);
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  // Update helpers
  function updateEveryDays(clientId: string, nextDays: number) {
    setPrefs((prev) => {
      const out = { ...prev, [clientId]: { ...(prev[clientId] ?? {}), everyDays: Math.max(1, nextDays) } };
      savePrefs(out);
      return out;
    });
  }

  // Build columns for desktop table (DataTable handles desktop; cardRenderer handles mobile)
  const columns: Column<ReminderRow>[] = [
    { key: "client", header: "Client", accessor: (r) => r.clientName },
    {
      key: "phone",
      header: "Phone",
      accessor: (r) =>
        r.phone ? (
          <a
            href={`tel:${String(r.phone).replace(/[^+\d]/g, "")}`}
            className="text-blue-600 hover:underline"
          >
            {r.phone}
          </a>
        ) : (
          "-"
        ),
    },
    {
      key: "lastOrderAt",
      header: "Last Order",
      accessor: (r) => (r.lastOrderAt ? formatDateTimeLabel(r.lastOrderAt) : "—"),
    },
    {
      key: "everyDays",
      header: "Every (days)",
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={r.everyDays}
            onChange={(e) =>
              updateEveryDays(r.clientId, parseInt(e.target.value || "1", 10))
            }
            className="w-24 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateEveryDays(r.clientId, 15)}
              className="rounded border border-black/10 dark:border-white/15 px-2 py-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/10"
              title="Set 15 days"
            >
              15d
            </button>
            <button
              type="button"
              onClick={() => updateEveryDays(r.clientId, 30)}
              className="rounded border border-black/10 dark:border-white/15 px-2 py-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/10"
              title="Set 30 days"
            >
              30d
            </button>
          </div>
        </div>
      ),
    },
    {
      key: "nextDueAt",
      header: "Next Due",
      accessor: (r) => formatDateTimeLabel(r.nextDueAt),
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) => (
        <span
          className={
            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs " +
            (r.dueLabel === "Past Due"
              ? "border-red-300 text-red-700"
              : r.dueLabel === "Due Today"
              ? "border-amber-300 text-amber-700"
              : "border-black/10 dark:border-white/15")
          }
        >
          {r.dueLabel}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (r) => {
        const wa = buildWaLink(r.clientName, r.phone, r.nextDueAt);
        return (
          <button
            type="button"
            onClick={() => wa && window.open(wa, "_blank", "noopener,noreferrer")}
            disabled={!wa}
            className={`rounded-md border px-3 py-1 text-sm ${
              wa
                ? "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
                : "border-black/10 dark:border-white/15 opacity-50 cursor-not-allowed"
            }`}
            title={wa ? "Send WhatsApp" : "Missing/invalid phone"}
          >
            WhatsApp
          </button>
        );
      },
    },
  ];

  return (
    <ManagementLayout title="Reminders">
      <div className="mb-4 flex items-center gap-2">
        <input
          type="search"
          placeholder="Search clients…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-sm rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
      ) : err ? (
        <div className="mb-3 rounded-md border border-red-300 text-red-700 bg-red-50 px-3 py-2 text-sm">
          {err}
        </div>
      ) : (
        <>
          {/* One DataTable for both desktop and mobile */}
          <DataTable
            rows={paged}
            columns={columns}
            rowKey={(r) => r.clientId}
            emptyMessage="No clients found."
            cardRenderer={(r) => {
              const wa = buildWaLink(r.clientName, r.phone, r.nextDueAt);
              return (
                <MobileCard
                  key={r.clientId}
                  title={r.clientName}
                  subtitle={`Next: ${formatDateTimeLabel(r.nextDueAt)}`}
                  right={
                    <button
                      type="button"
                      onClick={() => wa && window.open(wa, "_blank", "noopener,noreferrer")}
                      disabled={!wa}
                      className={`rounded-md border px-3 py-1 text-xs ${
                        wa
                          ? "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
                          : "border-black/10 dark:border-white/15 opacity-50 cursor-not-allowed"
                      }`}
                      title={wa ? "Send WhatsApp" : "Missing/invalid phone"}
                    >
                      WhatsApp
                    </button>
                  }
                  rows={[
                    {
                      label: "Phone",
                      value: r.phone ? (
                        <a
                          href={`tel:${String(r.phone).replace(/[^+\d]/g, "")}`}
                          className="text-blue-600 hover:underline"
                        >
                          {r.phone}
                        </a>
                      ) : (
                        "-"
                      ),
                    },
                    {
                      label: "Last Order",
                      value: r.lastOrderAt ? formatDateTimeLabel(r.lastOrderAt) : "—",
                    },
                    {
                      label: "Every (days)",
                      value: (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={r.everyDays}
                            onChange={(e) =>
                              updateEveryDays(r.clientId, parseInt(e.target.value || "1", 10))
                            }
                            className="w-20 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateEveryDays(r.clientId, 15)}
                              className="rounded border border-black/10 dark:border-white/15 px-2 py-0.5 text-[11px] hover:bg-black/5 dark:hover:bg-white/10"
                              title="Set 15 days"
                            >
                              15d
                            </button>
                            <button
                              type="button"
                              onClick={() => updateEveryDays(r.clientId, 30)}
                              className="rounded border border-black/10 dark:border-white/15 px-2 py-0.5 text-[11px] hover:bg-black/5 dark:hover:bg-white/10"
                              title="Set 30 days"
                            >
                              30d
                            </button>
                          </div>
                        </div>
                      ),
                    },
                    {
                      label: "Status",
                      value: (
                        <span
                          className={
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs " +
                            (r.dueLabel === "Past Due"
                              ? "border-red-300 text-red-700"
                              : r.dueLabel === "Due Today"
                              ? "border-amber-300 text-amber-700"
                              : "border-black/10 dark:border-white/15")
                          }
                        >
                          {r.dueLabel}
                        </span>
                      ),
                    },
                  ]}
                />
              );
            }}
          />

          <div className="mt-3">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </ManagementLayout>
  );
}