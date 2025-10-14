"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { Column } from "../../components/DataTable";
import MobileCard from "../../components/MobileCard";
import FormDialog from "../../components/ui/FormDialog";
import DeleteConfirmDialog from "../../components/ui/DeleteConfirmDialog";
import Pagination from "../../components/ui/Pagination";
import { supabase } from "../../lib/supabaseClient";
import { Pencil, Trash2 } from "lucide-react";
import PhoneInput from "../../components/ui/PhoneInput";
import PhoneCell from "../../components/ui/PhoneCell";
import { usePhoneValidation } from "../../lib/phone";

type Client = {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  company?: string | null; // make optional
  city?: string | null;    // make optional
  email?: string | null;
  pincode?: string | null;
  state?: string | null;
  country?: string | null;
};

type FormState = {
  name: string;
  phone: string;
  address: string;
  email: string;
  city: string;
  pincode: string;
  state: string;
  country: string;
};

export default function ClientsTable() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", phone: "", address: "", email: "", city: "", pincode: "", state: "", country: "" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.address ?? "").toLowerCase().includes(q) ||
      (c.phone ? String(c.phone).toLowerCase().includes(q) : false) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.city ?? "").toLowerCase().includes(q) ||
      (c.state ?? "").toLowerCase().includes(q) ||
      (c.country ?? "").toLowerCase().includes(q) ||
      (c.pincode ?? "").toLowerCase().includes(q)
    );
  }, [clients, query]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredClients.length / pageSize)),
    [filteredClients.length]
  );

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pagedClients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, page]);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: key === "phone" ? (value as string).replace(/[^\d]/g, "").slice(0, 10) : value,
    }));
  }

  const phoneCheck = usePhoneValidation({
    value: form.phone,
    list: clients,
    getPhone: (c) => c.phone ?? "",
    getId: (c) => c.id,
    currentId: editing?.id,
  });

  const isValid = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.address.trim().length > 0 &&
      phoneCheck.valid &&
      !phoneCheck.duplicate
    );
  }, [form.name, form.address, phoneCheck.valid, phoneCheck.duplicate]);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", phone: "", address: "", email: "", city: "", pincode: "", state: "", country: "" });
    setIsOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({ 
      name: c.name, 
      phone: c.phone ?? "", 
      address: c.address ?? "",
      email: c.email ?? "",
      city: c.city ?? "",
      pincode: c.pincode ?? "",
      state: c.state ?? "",
      country: c.country ?? "",
    });
    setIsOpen(true);
  }

  function openDelete(c: Client) {
    setDeleting(c);
  }

  function closeModal() {
    setIsOpen(false);
  }

  function cancelDelete() {
    setDeleting(null);
  }

  // Load from Supabase (safe typing + fallback)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // try full shape
      const full = await supabase
        .from("clients")
        .select("id,name,phone,address,company,city,email,pincode,state,country")
        .order("name", { ascending: true });

      // fallback without optional cols
      const resp = full.error
        ? await supabase.from("clients").select("id,name,phone,address,email,city,pincode,state,country").order("name", { ascending: true })
        : full;

      if (cancelled) return;

      if (resp.error) {
        console.error("[clients] fetch failed:", resp.error.message);
        setLoadError(resp.error.message);
        setClients([]);
        return;
      }

      const rows = (resp.data as any[]) ?? [];
      setClients(
        rows.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone ?? null,
          address: c.address ?? null,
          company: "company" in c ? c.company ?? null : null,
          city: "city" in c ? c.city ?? null : null,
          email: "email" in c ? c.email ?? null : null,
          pincode: "pincode" in c ? c.pincode ?? null : null,
          state: "state" in c ? c.state ?? null : null,
          country: "country" in c ? c.country ?? null : null,
        }))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Create/Update
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      setFormError(!phoneCheck.valid ? "Enter a valid 10-digit phone number." : phoneCheck.duplicate ? "This phone number already exists." : "Please fill all required fields.");
      return;
    }
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      phone: phoneCheck.digits, // store normalized
      address: form.address.trim(),
      email: form.email.trim() || null,
      city: form.city.trim() || null,
      pincode: form.pincode.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || null,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", editing.id)
        .select("*")
        .single();
      if (error) {
        if ((error as any).code === "23505") setFormError("This phone number already exists.");
        else setFormError(error.message);
        return;
      }
      if (data) setClients((p) => p.map((c) => (c.id === (data as any).id ? (data as any) : c)));
    } else {
      const { data, error } = await supabase.from("clients").insert([payload]).select("*").single();
      if (error) {
        if ((error as any).code === "23505") setFormError("This phone number already exists.");
        else setFormError(error.message);
        return;
      }
      if (data) setClients((p) => [data as any, ...p]);
    }
    closeModal();
  }

  // Delete
  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (!error) setClients((p) => p.filter((c) => c.id !== id));
    setDeleting(null);
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

  // Columns for desktop table
  const clientColumns: Column<Client>[] = [
    { key: "name", header: "Name", accessor: (c) => c.name },
    { key: "phone", header: "Phone", accessor: (c) => (c.phone ? <PhoneCell phone={c.phone} /> : "-") },
    { key: "email", header: "Email", accessor: (c) => c.email || "-" },
    { key: "city", header: "City", accessor: (c) => c.city || "-" },
    { key: "address", header: "Address", accessor: (c) => c.address || "-" },
  ];

  return (
    <div className="w-full">
      {/* Debug/visible error if fetch fails */}
      {loadError ? (
        <div className="mb-3 rounded-md border border-red-300 text-red-700 bg-red-50 px-3 py-2 text-sm">
          Failed to load clients: {loadError}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <p className="text-secondary-sm">
            Manage your clients. Search by name or address.
          </p>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            placeholder="Search name, phone or address..."
            className="w-full sm:w-72 rounded-md border border-black/10  bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Search clients by name, phone or address"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            + Add Client
          </button>
        </div>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={filteredClients.length}
        onPageChange={setPage}
      />

      <DataTable
        rows={pagedClients}
        columns={clientColumns}
        rowKey={(c) => c.id}
        emptyMessage={
          query
            ? "No clients match your search."
            : "No clients yet. Click “Add Client” to create one."
        }
        rowActionsRenderer={(c) => (
          <>
            <button
              type="button"
              aria-label="Edit"
              onClick={() => openEdit(c)}
              className="rounded-md p-2 hover:bg-black/5 "
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Delete"
              onClick={() => openDelete(c)}
              className="rounded-md p-2 hover:bg-black/5  text-red-600 "
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
        cardRenderer={(c) => (
          <MobileCard
            title={c.name}
            // Remove phone from subtitle to avoid duplicate display (it still appears in rows)
            subtitle={c.company || c.city || ""}
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                  className="rounded-md p-2 hover:bg-black/5 "
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={(e) => { e.stopPropagation(); openDelete(c); }}
                  className="rounded-md p-2 hover:bg-black/5  text-red-600 "
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            }
            rows={[
              {
                label: "Phone",
                value: c.phone ? (
                  <a href={`tel:${String(c.phone).replace(/[^+\d]/g, "")}`} className="text-blue-600 hover:underline">
                    {c.phone}
                  </a>
                ) : "-",
              },
              { label: "Address", value: c.address || "-" },
            ]}
          />
        )}
      />

      <FormDialog
        open={isOpen}
        onClose={closeModal}
        title={editing ? "Edit Client" : "Add Client"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save" : "Add"}
        submitDisabled={!isValid}
        size="sm"
        align="start"
      >
        {formError ? (
          <div className="mb-2 rounded-md border border-red-300 text-red-700 bg-red-50 px-3 py-2 text-sm">
            {formError}
          </div>
        ) : null}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full rounded-md border border-black/10  bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Enter full name"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full rounded-md border border-black/10  bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="name@example.com"
          />
        </div>

        <PhoneInput
          id="phone"
          label="Phone"
          value={form.phone}
          onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
          required
          error={phoneCheck.error}
        />

        <div>
          <label htmlFor="address" className="block text-sm font-medium mb-1">Address</label>
          <textarea
            id="address"
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            className="w-full rounded-md border border-black/10  bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Street, Area, City"
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="city" className="block text-sm font-medium mb-1">City</label>
            <input
              id="city"
              type="text"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              className="w-full rounded-md border border-black/10  bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="City"
            />
          </div>
          <div>
            <label htmlFor="pincode" className="block text-sm font-medium mb-1">Pincode</label>
            <input
              id="pincode"
              type="text"
              inputMode="numeric"
              value={form.pincode}
              onChange={(e) => handleChange("pincode", e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
              className="w-full rounded-md border border-black/10  bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="e.g. 302001"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium mb-1">State</label>
            <input
              id="state"
              type="text"
              value={form.state}
              onChange={(e) => handleChange("state", e.target.value)}
              className="w-full rounded-md border border-black/10  bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="State"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium mb-1">Country</label>
            <input
              id="country"
              type="text"
              value={form.country}
              onChange={(e) => handleChange("country", e.target.value)}
              className="w-full rounded-md border border-black/10  bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Country"
            />
          </div>
        </div>
      </FormDialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Client"
        message={
          <>Are you sure you want to delete “{deleting?.name}”? This action cannot be undone.</>
        }
      />
    </div>
  );
}