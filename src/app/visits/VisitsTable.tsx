"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { Column } from "../../components/DataTable";
import MobileCard from "../../components/MobileCard";
import FormDialog from "../../components/ui/FormDialog";
import DeleteConfirmDialog from "../../components/ui/DeleteConfirmDialog";
import Pagination from "../../components/ui/Pagination";
import DateTimePicker, { formatDateTimeLabel } from "../../components/DateTimePicker";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import PhoneInput from "../../components/ui/PhoneInput";
import { isValidPhone10, normalizePhone } from "../../lib/phone";

type Visit = {
  id: string;
  client: string;
  date: string;
  // UI-only status (not saved to DB)
  uiStatus?: "Pending" | "Completed";
  phone?: string | null;
  address?: string | null;
  message?: string | null; // + message
};

type FormState = {
  client: string;
  date: string;
  phone: string;
  address: string;
  message: string; // + message
};

export default function VisitsTable() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [deleting, setDeleting] = useState<Visit | null>(null);
  const [editing, setEditing] = useState<Visit | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [form, setForm] = useState<FormState>({
    client: "",
    date: "",
    phone: "",
    address: "",
    message: "", // + message
  });

  const [uiStatus, setUiStatus] = useState<"Pending" | "Completed">("Pending");

  // Load visits (optionally via API to avoid anon issues)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/visits", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load visits");
        if (!cancelled) {
          const rows = (json.visits as any[]) ?? [];
          setVisits(rows.map((v) => ({ ...v, uiStatus: "Pending" })));
        }
      } catch (e: any) {
        // fallback to anon read if API missing
        const { data, error } = await supabase.from("visits").select("*").order("date", { ascending: true });
        if (!cancelled) {
          if (error) {
            setLoadError(e?.message || error.message);
            setVisits([]);
          } else {
            setVisits((data as any[]) ?? []);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pagination
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(visits.length / pageSize)),
    [visits.length]
  );
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);

  const pagedVisits = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visits.slice(start, start + pageSize);
  }, [visits, page]);

  const isValid = useMemo(() => {
    return form.client.trim().length > 0 && form.date && isValidPhone10(form.phone);
  }, [form.client, form.date, form.phone]);

  function openAdd() {
    setEditing(null);
    setFormError(null);
    setUiStatus("Pending");
    setForm({ client: "", date: "", phone: "", address: "", message: "" }); // + message
    setIsOpen(true);
  }

  function openEdit(v: Visit) {
    setEditing(v);
    setFormError(null);
    setUiStatus(v.uiStatus ?? "Pending");
    setForm({
      client: v.client,
      date: v.date,
      phone: v.phone ?? "",
      address: v.address ?? "",
      message: v.message ?? "", // + message
    });
    setIsOpen(true);
  }

  function openDelete(v: Visit) {
    setDeleting(v);
  }

  function closeModal() {
    setIsOpen(false);
  }

  function cancelDelete() {
    setDeleting(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      setLoadError(null);
      const res = await fetch(`/api/visits/${encodeURIComponent(deleting.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setVisits((p) => p.filter((v) => v.id !== deleting.id));
    } catch (e: any) {
      console.error("[visits] delete failed:", e?.message);
      setLoadError(e?.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setFormError(null);

    const payload = {
      client: form.client.trim(),
      date: form.date,
      phone: normalizePhone(form.phone),
      address: form.address.trim(),
      message: form.message.trim() ? form.message.trim() : null, // + message
    };

    try {
      if (editing) {
        const res = await fetch("/api/visits", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Update failed");
        setVisits((p) =>
          p.map((v) =>
            v.id === json.visit.id ? { ...json.visit, uiStatus } : v
          )
        );
      } else {
        const res = await fetch("/api/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload), // includes message
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Add failed");
        setVisits((p) => [{ ...json.visit, uiStatus }, ...p]);
      }
      setIsOpen(false);
    } catch (err: any) {
      console.error("[visits] submit failed:", err.message);
      setFormError(err.message);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isOpen) setIsOpen(false);
        if (deleting) setDeleting(null);
      }
    }
    if (isOpen || deleting) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, deleting]);

  const visitColumns: Column<Visit>[] = [
    { key: "client", header: "Client", accessor: (v) => v.client },
    { key: "date", header: "Date", accessor: (v) => formatDateTimeLabel(v.date) },
    {
      key: "status",
      header: "Status",
      accessor: (v) => (
        <select
          value={v.uiStatus ?? "Pending"}
          onChange={(e) => {
            const next = e.target.value === "Completed" ? "Completed" : "Pending";
            setVisits((prev) =>
              prev.map((x) => (x.id === v.id ? { ...x, uiStatus: next } : x))
            );
          }}
          className="rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
        </select>
      ),
    },
    { key: "phone", header: "Phone", accessor: (v) => v.phone || "-" },
    { key: "address", header: "Address", accessor: (v) => v.address || "-" },
    { key: "message", header: "Message", accessor: (v) => v.message || "-" }, // + message
  ];

  return (
    <div className="w-full">
      {loadError ? (
        <div className="mb-3 rounded-md border border-red-300 text-red-700 bg-red-50 px-3 py-2 text-sm">
          Failed to load visits: {loadError}
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-3 py-2 text-sm font-medium hover:opacity-90"
        >
          + Add Visit
        </button>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={visits.length}
        onPageChange={setPage}
      />

      {/* Table/cards */}
      <DataTable
        rows={pagedVisits}
        columns={visitColumns}
        rowKey={(v) => v.id}
        emptyMessage='No visits yet. Click “Add Visit” to create one.'
        rowActionsRenderer={(v) => (
          <>
            <button
              type="button"
              aria-label="Edit"
              onClick={() => openEdit(v)}
              className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Delete"
              onClick={() => openDelete(v)}
              className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10 text-red-600 dark:text-red-400"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
        cardRenderer={(v) => (
          <MobileCard
            title={v.client}
            subtitle={formatDateTimeLabel(v.date)}
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(v);
                  }}
                  className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDelete(v);
                  }}
                  className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10 text-red-600 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            }
            rows={[
              {
                label: "Status",
                value: (
                  <select
                    value={v.uiStatus ?? "Pending"}
                    onChange={(e) => {
                      const next = e.target.value === "Completed" ? "Completed" : "Pending";
                      setVisits((prev) =>
                        prev.map((x) => (x.id === v.id ? { ...x, uiStatus: next } : x))
                      );
                    }}
                    className="rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                ),
              },
              {
                label: "Phone",
                value: v.phone ? (
                  <a
                    href={`tel:${(v.phone || "").replace(/[^+\d]/g, "")}`}
                    className="text-blue-600 hover:underline"
                  >
                    {v.phone}
                  </a>
                ) : (
                  "-"
                ),
              },
              { label: "Address", value: v.address || "-" },
              { label: "Message", value: v.message || "-" }, // + message
            ]}
          />
        )}
      />

      {/* Form dialog */}
      <FormDialog
        open={isOpen}
        onClose={closeModal}
        title={editing ? "Edit Visit" : "Add Visit"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save" : "Add"}
        submitDisabled={!isValid}
        size="md"
        align="start"
      >
        {formError ? (
          <div className="mb-2 rounded-md border border-red-300 text-red-700 bg-red-50 px-3 py-2 text-sm">
            {formError}
          </div>
        ) : null}
        <div>
          <label htmlFor="client" className="block text-sm font-medium mb-1">
            Client
          </label>
          <input
            id="client"
            type="text"
            value={form.client}
            onChange={(e) => handleChange("client", e.target.value)}
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Client name"
            required
          />  
        </div>

        <div>
          <PhoneInput
            id="visit-phone"
            label="Phone"
            value={form.phone}
            onChange={(v) => handleChange("phone", v)}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="address" className="block text-sm font-medium mb-1">
            Address
          </label>
          <textarea
            id="address"
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Street, Area, City"
            rows={3}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="message" className="block text-sm font-medium mb-1">
            Message (optional)
          </label>
          <textarea
            id="message"
            value={form.message}
            onChange={(e) => handleChange("message", e.target.value)}
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Notes or message for this visit"
            rows={3}
          />
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium mb-1">
            Date & Time
          </label>
          <DateTimePicker
            id="date"
            value={form.date}
            onChange={(val) => handleChange("date", val)}
            dateOnly={false}
            disablePast
          />
        </div>
      </FormDialog>

      {/* Delete dialog */}
      <DeleteConfirmDialog
        open={!!deleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Visit"
        message={
          <>
            Delete visit for “{deleting?.client}”
            {deleting?.date ? ` on ${formatDateTimeLabel(deleting.date)}` : ""}?
          </>
        }
      />
    </div>
  );
}