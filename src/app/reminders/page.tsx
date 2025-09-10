"use client";

import { useEffect, useMemo, useState } from "react";
import ManagementLayout from "../../components/ManagementLayout";
import Pagination from "../../components/ui/Pagination";
import { supabase } from "../../lib/supabaseClient";
import DateTimePicker, { formatDateTimeLabel } from "../../components/DateTimePicker";
import DataTable, { Column } from "../../components/DataTable"; // fixed
import MobileCard from "../../components/MobileCard";
import OrderHistoryDialog from "../../components/OrderHistoryDialog";
import FormDialog from "../../components/ui/FormDialog";
import { Pencil } from "lucide-react";

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

type ClientReminderPref = { client_id: string; every_days: number; last_reminded_at?: string | null };

const DEFAULT_EVERY_DAYS = 30;

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

// Your business WhatsApp number (digits only, no +). Set via env.
const WHATSAPP_BIZ = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/[^\d]/g, "");

// Compose message with “quick reply” links
function buildWaLink(name: string, phone?: string | null, nextDueAt?: string | null) {
  const num = toWhatsappNumber(phone);
  if (!num) return null;

  const when = nextDueAt ? ` on ${formatDateTimeLabel(nextDueAt)}` : "";

  // Your business number (for quick reply deep links)
  const yesLink = WHATSAPP_BIZ
    ? `https://wa.me/${WHATSAPP_BIZ}?text=${encodeURIComponent("Yes")}`
    : "";
  const laterLink = WHATSAPP_BIZ
    ? `https://wa.me/${WHATSAPP_BIZ}?text=${encodeURIComponent("Remind me in 5 days")}`
    : "";

  // NOTE: Real “buttons” (quick reply / call-to-action) require WhatsApp Cloud API
  // interactive message templates. This is the fallback using clickable links.
  const lines = [
    `Hi ${name}, Patram Works here.`,
    `Friendly reminder for your next order${when}.`,
    `Thank you!`,
  ];

  const msg = lines.join("\n");
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

function getDueAccent(dueLabel: "Past Due" | "Due Today" | "Upcoming") {
  switch (dueLabel) {
    case "Past Due":
      return { row: "bg-red-50 border-red-300" };
    case "Due Today":
      return { row: "bg-amber-50 border-amber-300" };
    case "Upcoming":
      return { row: "bg-green-50 border-green-300" };
    default:
      return { row: "" };
  }
}

const WhatsAppIcon = () => (
  <svg
    viewBox="0 0 32 32"
    className="h-4 w-4"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M16.04 2c-7.73 0-14 6.27-14 14 0 2.47.64 4.82 1.86 6.92L2 30l7.25-1.9A13.9 13.9 0 0 0 16.04 30c7.73 0 14-6.27 14-14s-6.27-14-14-14zm0 25.5c-2.23 0-4.41-.6-6.3-1.73l-.45-.27-4.3 1.13 1.15-4.19-.29-.43A11.49 11.49 0 0 1 4.54 16c0-6.32 5.15-11.46 11.5-11.46 6.34 0 11.5 5.14 11.5 11.46 0 6.32-5.16 11.5-11.5 11.5zm6.31-8.66c-.34-.17-2.02-.99-2.33-1.1-.31-.11-.53-.17-.75.17-.22.34-.86 1.1-1.05 1.32-.19.21-.39.23-.73.06-.34-.17-1.43-.53-2.73-1.69-1.01-.9-1.69-2.02-1.89-2.36-.2-.34-.02-.52.15-.69.15-.15.34-.39.51-.58.17-.19.22-.34.34-.56.11-.23.06-.43-.03-.6-.09-.17-.75-1.8-1.03-2.47-.27-.65-.55-.56-.75-.57l-.64-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.06.15.19 2.11 3.22 5.12 4.52.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 2.02-.83 2.31-1.64.29-.81.29-1.5.2-1.64-.09-.14-.31-.22-.65-.38z" />
  </svg>
);

export default function RemindersPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prefsDb, setPrefsDb] = useState<Record<string, ClientReminderPref>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [historyModalFor, setHistoryModalFor] = useState<string | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState<{
    clientId: string;
    clientName: string;
    everyDays: number;
    lastRemindedAt: string | null;
    mode: "add" | "edit";
  } | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // search
  const [q, setQ] = useState("");
  // New: filter view
  const [view, setView] = useState<"all" | "upcoming" | "outdated">("all");

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

  // Initial load: clients, orders, prefs
  useEffect(() => {
    (async () => {
      try {
        const [cRes, oRes, pRes] = await Promise.all([
          supabase.from("clients").select("id,name,phone"),
          supabase.from("orders").select("id,client,order_date"),
          supabase.from("client_reminders").select("client_id,every_days,last_reminded_at"),
        ]);

        if (cRes.error) throw cRes.error;
        if (oRes.error) throw oRes.error;
        if (pRes.error) throw pRes.error;

        setClients((cRes.data as Client[]) || []);
        setOrders((oRes.data as Order[]) || []);
        const map: Record<string, ClientReminderPref> = {};
        for (const p of (pRes.data as ClientReminderPref[]) || []) map[p.client_id] = p;
        setPrefsDb(map);
      } catch (e: any) {
        console.error("[reminders] load failed:", e?.message);
      }
    })();
  }, []);

  // Realtime: when orders change, refresh orders to recompute due
  useEffect(() => {
    const channel = supabase
      .channel("reminders_orders_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          supabase
            .from("orders")
            .select("id,client,order_date")
            .then(({ data, error }) => {
              if (!error) setOrders((data as Order[]) || []);
            });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Unified accessor
  function getEveryDays(clientId: string): number {
    return prefsDb[clientId]?.every_days ?? DEFAULT_EVERY_DAYS;
  }
  function getLastRemindedAt(clientId: string): string | null {
    return prefsDb[clientId]?.last_reminded_at ?? null;
  }

  async function upsertReminder(clientId: string, everyDays: number, lastRemindedAt: string | null) {
    try {
      const { data, error } = await supabase
        .from("client_reminders")
        .upsert({
          client_id: clientId,
          every_days: Math.max(1, everyDays),
          last_reminded_at: lastRemindedAt,
        })
        .select("client_id,every_days,last_reminded_at")
        .single();
      if (error) throw error;
      setPrefsDb((prev) => ({ ...prev, [clientId]: data as ClientReminderPref }));
    } catch (e: any) {
      console.error("[reminders] upsertReminder failed:", e?.message);
    }
  }

 
  function historyForClient(clientName: string): Order[] {
    const key = clientName.trim().toLowerCase();
    return orders
      .filter(
        (o) =>
          (o.client || "").trim().toLowerCase() === key &&
          o.order_date
      )
      .sort(
        (a, b) =>
          new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
      );
  }

  function openAddReminder(client: Client) {
    setReminderForm({
      clientId: client.id,
      clientName: client.name,
      everyDays: getEveryDays(client.id),
      lastRemindedAt: getLastRemindedAt(client.id),
      mode: prefsDb[client.id] ? "edit" : "add",
    });
    setReminderOpen(true);
  }

  function openEditReminder(row: ReminderRow) {
    setReminderForm({
      clientId: row.clientId,
      clientName: row.clientName,
      everyDays: row.everyDays,
      lastRemindedAt: getLastRemindedAt(row.clientId),
      mode: "edit",
    });
    setReminderOpen(true);
  }

  async function submitReminderForm(e: React.FormEvent) {
    e.preventDefault();
    if (!reminderForm) return;
    await upsertReminder(
      reminderForm.clientId,
      reminderForm.everyDays,
      reminderForm.lastRemindedAt
    );
    setReminderOpen(false);
    setReminderForm(null);
  }

  // Build rows
  const rows = useMemo<ReminderRow[]>(() => {
    const nowIso = new Date().toISOString();
    const latestOrderByClient = new Map<string, string>();
    for (const o of orders) {
      if (!o.client || !o.order_date) continue;
      if (!latestOrderByClient.has(o.client)) latestOrderByClient.set(o.client, o.order_date);
      else {
        const prev = latestOrderByClient.get(o.client)!;
        if (new Date(o.order_date) > new Date(prev)) latestOrderByClient.set(o.client, o.order_date);
      }
    }
    return clients.map((c) => {
      const lastOrderAt = latestOrderByClient.get(c.name) ?? null;
      const everyDays = getEveryDays(c.id);
      const lastRemindedAt = getLastRemindedAt(c.id);
      // Base date = later of last order or last reminded
      const baseIso = (() => {
        if (lastOrderAt && lastRemindedAt) {
          return new Date(lastRemindedAt) > new Date(lastOrderAt) ? lastRemindedAt : lastOrderAt;
        }
        return lastRemindedAt || lastOrderAt || nowIso;
      })();
      const nextDueAt = addDays(baseIso, everyDays);
      const cmp = new Date(nextDueAt).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
      const dueLabel = cmp < 0 ? "Past Due" : cmp === 0 ? "Due Today" : "Upcoming";
      return {
        clientId: c.id,
        clientName: c.name,
        phone: c.phone ?? null,
        lastOrderAt,
        everyDays,
        lastRemindedAt,
        nextDueAt,
        dueLabel,
      };
    });
  }, [clients, orders, prefsDb]);

  // New: counts per bucket (for chips)
  const { counts } = useMemo(() => {
    let past = 0,
      today = 0,
      up = 0;
    for (const r of rows) {
      if (r.dueLabel === "Past Due") past++;
      else if (r.dueLabel === "Due Today") today++;
      else up++;
    }
    return { counts: { past, today, up, all: rows.length } };
  }, [rows]);

  // Filter and sort (due first)
  const filtered = useMemo(() => {
    // bucket filter first
    let list =
      view === "outdated"
        ? rows.filter((r) => r.dueLabel === "Past Due")
        : view === "upcoming"
        ? rows.filter((r) => r.dueLabel === "Due Today" || r.dueLabel === "Upcoming")
        : rows.slice();

    const ql = q.trim().toLowerCase();
    if (ql) {
      list = list.filter(
        (r) =>
          r.clientName.toLowerCase().includes(ql) ||
          (r.phone || "").toString().includes(ql)
      );
    }

    // Due first: Past Due, Due Today, then by nextDueAt ascending
    list.sort((a, b) => {
      const rank = (r: ReminderRow) =>
        r.dueLabel === "Past Due" ? 0 : r.dueLabel === "Due Today" ? 1 : 2;
      const dr = rank(a) - rank(b);
      if (dr !== 0) return dr;
      return new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime();
    });

    return list;
  }, [rows, q, view]);

  // Pagination slice
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length]);
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  // Update helpers
  function updateEveryDaysInline(clientId: string, val: number) {
    const clean = Math.max(1, val || 1);
    // optimistic update
    setPrefsDb((prev) => ({
      ...prev,
      [clientId]: {
        client_id: clientId,
        every_days: clean,
        last_reminded_at: prev[clientId]?.last_reminded_at ?? null,
      },
    }));
    void upsertReminder(clientId, clean, getLastRemindedAt(clientId));
  }

  // Columns: add "Late by" when viewing outdated
  const columns: Column<ReminderRow>[] = useMemo(() => {
    const nowIso = new Date().toISOString();
    const base: Column<ReminderRow>[] = [
      {
        key: "client",
        header: "Client",
        accessor: (r) => (
          <button
            type="button"
            onClick={() => setHistoryModalFor(r.clientName)}
            className="text-left text-blue-600 hover:underline"
            title="View order history"
          >
            {r.clientName}
          </button>
        ),
      },
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
          <input
            type="number"
            min={1}
            value={r.everyDays}
            onChange={(e) =>
              updateEveryDaysInline(r.clientId, parseInt(e.target.value || "1", 10))
            }
            className="w-24 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
          />
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
                ? "border-red-300 text-red-700 bg-red-50"
                : r.dueLabel === "Due Today"
                ? "border-amber-300 text-amber-700 bg-amber-50"
                : /* Upcoming */ "border-green-300 text-green-700 bg-green-50")
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => wa && window.open(wa, "_blank", "noopener,noreferrer")}
                disabled={!wa}
                className={`rounded-md border px-2 py-1 text-xs flex items-center justify-center gap-1 ${
                  wa
                    ? "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 text-green-600"
                    : "border-black/10 dark:border-white/15 opacity-50 cursor-not-allowed"
                }`}
                title={wa ? "Send WhatsApp" : "Missing/invalid phone"}
              >
                <WhatsAppIcon />
                <span className="sr-only">WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => openEditReminder(r)}
                className="rounded-md border border-black/10 dark:border-white/15 px-2 py-1 text-xs flex items-center gap-1 hover:bg-black/5 dark:hover:bg:white/10"
                title="Edit reminder settings"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            </div>
          );
        },
      },
    ];

    if (view === "outdated") {
      base.splice(5, 0, {
        key: "lateBy",
        header: "Late by",
        accessor: (r) => {
          const late = daysBetween(r.nextDueAt, nowIso) ?? 0;
          return late > 0 ? `${late}d` : "—";
        },
      });
    }

    return base;
  }, [view, prefsDb]);

  return (
    <ManagementLayout title="Reminders">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("all")}
            className={`rounded-md border px-3 py-1.5 text-xs sm:text-sm ${
              view === "all"
                ? "bg-foreground text-background"
                : "border-black/10 dark:border-white/15"
            }`}
            title="Show all"
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setView("upcoming")}
            className={`rounded-md border px-3 py-1.5 text-xs sm:text-sm ${
              view === "upcoming"
                ? "bg-foreground text-background"
                : "border-black/10 dark:border-white/15"
            }`}
            title="Due today and upcoming"
          >
            Upcoming ({counts.today + counts.up})
          </button>
          <button
            type="button"
            onClick={() => setView("outdated")}
            className={`rounded-md border px-3 py-1.5 text-xs sm:text-sm ${
              view === "outdated"
                ? "bg-foreground text-background"
                : "border-black/10 dark:border-white/15"
            }`}
            title="Outdated (Past Due – follow up needed)"
          >
            Outdated ({counts.past})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full max-w-md">
          <input
            type="search"
            placeholder="Search clients…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            type="button"
            onClick={() => {
              // open first client without reminder, else just open generic
              const target = clients.find((c) => !prefsDb[c.id]) || clients[0];
              if (target) openAddReminder(target);
            }}
            className="rounded-md bg-foreground text-background px-3 py-2 text-xs sm:text-sm font-medium hover:opacity-90"
          >
            Add Reminder
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading…</p>
      ) : err ? (
        <div className="mb-3 rounded-md border border-red-300 text-red-700 bg-red-50 px-3 py-2 text-sm">
          {err}
        </div>
      ) : (
        <>
          <div className="mb-3">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setPage}
            />
          </div>

          <DataTable
            rows={paged}
            columns={columns}
            rowKey={(r) => r.clientId}
            emptyMessage={
              view === "outdated"
                ? "No outdated (past-due) clients."
                : view === "upcoming"
                ? "No upcoming reminders."
                : "No clients found."
            }
            cardRenderer={(r) => {
              const wa = buildWaLink(r.clientName, r.phone, r.nextDueAt);
              const accent = getDueAccent(r.dueLabel);

              // Make accent classes only apply on md+ (hide colored box on mobile)
              const accentResponsive = accent.row
                ? accent.row
                    .split(" ")
                    .filter(Boolean)
                    .map((c) => `md:${c}`)
                    .join(" ")
                : "";

              return (
                <div className={`md:rounded-lg md:border ${accentResponsive}`}>
                  <MobileCard
                    key={r.clientId}
                    title={/* unchanged */ (
                      <button
                        type="button"
                        onClick={() => setHistoryModalFor(r.clientName)}
                        className="text-left hover:underline"
                        title="View order history"
                      >
                        {r.clientName}
                      </button>
                    )}
                    subtitle={
                      <span className="text-blue-600 font-medium">
                        Next: {formatDateTimeLabel(r.nextDueAt)}
                      </span>
                    }
                    right={
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => wa && window.open(wa, "_blank", "noopener,noreferrer")}
                          disabled={!wa}
                          className={`rounded-md border px-3 py-1 text-xs flex items-center justify-center gap-1 ${
                            wa
                              ? "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 text-green-600"
                              : "border-black/10 dark:border-white/15 opacity-50 cursor-not-allowed"
                          }`}
                          title={wa ? "Send WhatsApp" : "Missing/invalid phone"}
                        >
                          <WhatsAppIcon />
                          <span className="sr-only">WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditReminder(r)}
                          className="rounded-md border border-black/10 dark:border-white/15 p-2 text-xs flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"
                          title="Edit reminder"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit reminder</span>
                        </button>
                      </div>
                    }
                    rows={[
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
                              onChange={(e) => updateEveryDaysInline(r.clientId, parseInt(e.target.value || "1", 10))}
                              className="w-24 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateEveryDaysInline(r.clientId, 15)}
                                className="rounded border border-black/10 dark:border-white/15 px-2 py-0.5 text-xs hover:bg-black/5 dark:hover:bg:white/10"
                                title="Set 15 days"
                              >
                                15d
                              </button>
                              <button
                                type="button"
                                onClick={() => updateEveryDaysInline(r.clientId, 30)}
                                className="rounded border border-black/10 dark:border-white/15 px-2 py-0.5 text-xs hover:bg-black/5 dark:hover:bg:white/10"
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
                                ? "border-red-300 text-red-700 bg-red-50"
                                : r.dueLabel === "Due Today"
                                ? "border-amber-300 text-amber-700 bg-amber-50"
                                : "border-green-300 text-green-700 bg-green-50")
                            }
                          >
                            {r.dueLabel}
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>
              );
            }}
          />
          <OrderHistoryDialog
            open={!!historyModalFor}
            onClose={() => setHistoryModalFor(null)}
            clientName={historyModalFor}
            items={historyModalFor ? historyForClient(historyModalFor) : []}
          />
        </>
      )}
      <FormDialog
        open={reminderOpen}
        onClose={() => {
          setReminderOpen(false);
          setReminderForm(null);
        }}
        title={
          reminderForm
            ? `${reminderForm.mode === "add" ? "Add" : "Edit"} Reminder • ${reminderForm.clientName}`
            : "Reminder"
        }
        onSubmit={submitReminderForm}
        submitLabel="Save"
        submitDisabled={!reminderForm}
        size="md"
      >
        {reminderForm && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Every (days)</label>
              <input
                type="number"
                min={1}
                value={reminderForm.everyDays}
                onChange={(e) =>
                  setReminderForm((f) =>
                    f ? { ...f, everyDays: Math.max(1, parseInt(e.target.value || "1", 10)) } : f
                  )
                }
                className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Reminded At (optional)</label>
              <DateTimePicker
                value={reminderForm.lastRemindedAt || ""}
                onChange={(val) =>
                  setReminderForm((f) => (f ? { ...f, lastRemindedAt: val || null } : f))
                }
                dateOnly={false}
                placeholder="Not set"
              />
              {reminderForm.lastRemindedAt && (
                <button
                  type="button"
                  onClick={() =>
                    setReminderForm((f) => (f ? { ...f, lastRemindedAt: null } : f))
                  }
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Clear date
                </button>
              )}
            </div>
            <p className="text-[11px] opacity-70">
              Next due = later of last order or last reminded + every (days).
            </p>
          </div>
        )}
      </FormDialog>
    </ManagementLayout>
  );
}