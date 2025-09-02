"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import DateTimePicker, { formatDateTimeLabel } from "../../components/DateTimePicker";
import DataTable, { Column } from "../../components/DataTable";
import MobileCard from "../../components/MobileCard";
import FormDialog from "../../components/ui/FormDialog";
import Pagination from "../../components/ui/Pagination";
import DeleteConfirmDialog from "../../components/ui/DeleteConfirmDialog";
import { supabase } from "../../lib/supabaseClient";
import { supabaseHealth } from "../../lib/supabaseHealth";
import AsyncSelect from "react-select/async";

type Product = {
  id: string;
  name: string;
  price: number;
  mrp?: number;
  category?: string;
  description?: string;
  photoUrl?: string;
};

type OrderItem = {
  productId: string;
  qty: number;
};

type Order = {
  id: string;
  client: string;
  orderDate: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  status: "Pending" | "Delivered";
  items: OrderItem[];
};

type FormState = {
  client: string;
  orderDate: string;
  status: "Pending" | "Delivered"; // default; edited inline in table
  items: OrderItem[];
};

type Client = { id: string; name: string; phone?: string | null };

const newId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
};

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export default function OrdersTable() {
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>(() => []);
  const [clients, setClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);

  const [form, setForm] = useState<FormState>({
    client: "",
    orderDate: "",
    status: "Pending", // not shown in popup
    items: [{ productId: "", qty: 1 }],
  });

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(orders.length / pageSize)),
    [orders.length]
  );
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, page]);

  // Load products, orders, and clients from Supabase
  useEffect(() => {
    (async () => {
      const [prodRes, ordRes, cliRes] = await Promise.all([
        supabase.from("products").select("id,name,price,mrp,category,description,photo_url"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("clients").select("id,name,phone").order("name", { ascending: true }),
      ]);

      if (!prodRes.error && prodRes.data) {
        setAvailableProducts(
          prodRes.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            mrp: p.mrp != null ? Number(p.mrp) : undefined,
            category: p.category ?? "",
            description: p.description ?? "",
            photoUrl: p.photo_url ?? undefined,
          }))
        );
      }

      if (!ordRes.error && ordRes.data) {
        setOrders(ordRes.data.map(mapOrderRow));
      }

      if (!cliRes.error && cliRes.data) {
        setClients((cliRes.data as any[]).map((c) => ({ id: c.id, name: c.name, phone: c.phone ?? null })));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const res = await supabaseHealth();
      if (!res.ok) console.error("[supabase] health check failed:", res.error?.message);
      else console.log("[supabase] connected. clients count ~", res.count);
    })();
  }, []);

  function mapOrderRow(row: any): Order {
    return {
      id: row.id,
      client: row.client,
      orderDate: row.order_date ?? row.orderDate,
      status: row.status,
      items: Array.isArray(row.items) ? row.items : [],
    };
  }

  const isValid = useMemo(() => {
    const base = form.client.trim().length > 0 && form.orderDate.trim().length > 0;
    const hasItems =
      form.items.length > 0 &&
      form.items.every(
        (it) => it.productId && it.productId.trim().length > 0 && Number.isFinite(it.qty) && it.qty > 0
      );
    return base && hasItems;
  }, [form]);

  function openAdd() {
    setEditing(null);
    setForm({ client: "", orderDate: "", status: "Pending", items: [{ productId: "", qty: 1 }] });
    setIsOpen(true);
  }

  function openEdit(o: Order) {
    setEditing(o);
    setForm({
      client: o.client,
      orderDate: o.orderDate,
      status: o.status, // preserved but not editable in popup
      items: o.items.map((it) => ({ ...it })),
    });
    setIsOpen(true);
  }

  function openDelete(o: Order) {
    setDeleting(o);
  }

  function cancelDelete() {
    setDeleting(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (!error) setOrders((prev) => prev.filter((o) => o.id !== id));
    setDeleting(null);
  }

  function closeModal() {
    setIsOpen(false);
  }

  function setItem<K extends keyof OrderItem>(index: number, key: K, value: OrderItem[K]) {
    setForm((prev) => {
      const items = prev.items.slice();
      items[index] = { ...items[index], [key]: value };
      return { ...prev, items };
    });
  }

  function addItemRow() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { productId: "", qty: 1 }] }));
  }

  function removeItemRow(index: number) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  function updateStatus(orderId: string, next: Order["status"]) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: next } : o)));
    supabase.from("orders").update({ status: next }).eq("id", orderId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    const payload = {
      client: form.client.trim(),
      order_date: form.orderDate, // ISO string recommended
      status: form.status,
      items: form.items.map((it) => ({ productId: it.productId, qty: it.qty })),
    };

    if (editing) {
      const { data, error } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", editing.id)
        .select("*")
        .single();
      if (!error && data) {
        const mapped = mapOrderRow(data);
        setOrders((prev) => prev.map((o) => (o.id === mapped.id ? mapped : o)));
      }
    } else {
      const { data, error } = await supabase.from("orders").insert([payload]).select("*").single();
      if (!error && data) setOrders((prev) => [mapOrderRow(data), ...prev]);
    }
    setIsOpen(false);
  }

  function orderTotal(o: Order) {
    return o.items.reduce((sum, it) => {
      const prod = availableProducts.find((p) => p.id === it.productId);
      return sum + (prod ? prod.price * it.qty : 0);
    }, 0);
  }

  function orderProductNames(o: Order) {
    const names = o.items
      .map((it) => availableProducts.find((p) => p.id === it.productId)?.name || "")
      .filter(Boolean);
    return names.join(", ");
  }

  const totalAmount = useMemo(() => {
    return form.items.reduce((sum, it) => {
      const prod = availableProducts.find((p) => p.id === it.productId);
      return sum + (prod ? prod.price * (Number.isFinite(it.qty) ? it.qty : 0) : 0);
    }, 0);
  }, [form.items, availableProducts]);

  // Helpers for react-select options
  type RSOption<TMeta = any> = { value: string; label: string; hint?: string; meta?: TMeta };

  const loadClientOptions = (input: string): Promise<RSOption[]> => {
    const q = input.trim().toLowerCase();
    const opts = clients
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q))
      .slice(0, 100)
      .map((c) => ({ value: c.name, label: c.name, hint: c.phone ?? undefined }));
    return Promise.resolve(opts);
  };

  const loadProductOptions = (input: string): Promise<RSOption<{ price: number }>[]> => {
    const q = input.trim().toLowerCase();
    const opts = availableProducts
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, 200)
      .map((p) => ({
        value: p.id,
        label: p.name,
        hint: inr.format(p.price),
        meta: { price: p.price },
      }));
    return Promise.resolve(opts);
  };

  // Minimal styling to match your UI
  const selectStyles = {
    control: (base: any) => ({
      ...base,
      minHeight: 36,
      backgroundColor: "transparent",
      borderColor: "rgba(0,0,0,0.1)",
      boxShadow: "none",
      ":hover": { borderColor: "rgba(0,0,0,0.2)" },
    }),
    menu: (base: any) => ({ ...base, zIndex: 50 }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  };

  // Desktop table columns
  const orderColumns: Column<Order>[] = [
    { key: "client", header: "Client", accessor: (o) => o.client },
    { key: "orderDate", header: "Order Date", accessor: (o) => formatDateTimeLabel(o.orderDate) },
    {
      key: "status",
      header: "Status",
      accessor: (o) => (
        <select
          value={o.status}
          onChange={(e) => updateStatus(o.id, e.target.value as Order["status"])}
          className="rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-xs outline-none"
        >
          <option value="Pending">Pending</option>
          <option value="Delivered">Delivered</option>
        </select>
      ),
    },
    { key: "products", header: "Products", accessor: (o) => orderProductNames(o) || "-" },
    { key: "amount", header: "Amount", accessor: (o) => inr.format(orderTotal(o)) },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage orders. Inline status, date & time picker, and auto total.
        </p>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          + Add Order
        </button>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={orders.length}
        onPageChange={setPage}
      />
      <DataTable
        rows={pagedOrders}
        columns={orderColumns}
        rowKey={(o) => o.id}
        emptyMessage='No orders yet. Click “Add Order” to create one.'
        rowActionsRenderer={(o) => (
          <>
            <button
              type="button"
              aria-label="Edit"
              onClick={() => openEdit(o)}
              className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Delete"
              onClick={() => openDelete(o)}
              className="rounded-md p-2 hover:bg-black/5 dark:hover:bg-white/10 text-red-600 dark:text-red-400"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
        cardRenderer={(o) => (
          <MobileCard
            title={o.client}
            subtitle={formatDateTimeLabel(o.orderDate)}
            right={
              <select
                value={o.status}
                onChange={(e) => updateStatus(o.id, e.target.value as Order["status"])}
                className="rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-xs"
              >
                <option value="Pending">Pending</option>
                <option value="Delivered">Delivered</option>
              </select>
            }
            rows={[
              { label: "Products", value: orderProductNames(o) || "-" },
              { label: "Amount", value: inr.format(orderTotal(o)) },
            ]}
          />
        )}
      />

      <FormDialog
        open={isOpen}
        onClose={closeModal}
        title={editing ? "Edit Order" : "Add Order"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save" : "Add"}
        submitDisabled={!isValid}
        size="lg"
        align="start"
      >
        {/* Client: react-select Async */}
        <div>
          <label htmlFor="client" className="block text-sm font-medium mb-1">Client</label>
          <AsyncSelect
            inputId="client"
            cacheOptions
            defaultOptions={clients.slice(0, 50).map((c) => ({ value: c.name, label: c.name, hint: c.phone ?? undefined }))}
            loadOptions={loadClientOptions}
            value={form.client ? { value: form.client, label: form.client } as any : null}
            onChange={(opt: any) => setForm((p) => ({ ...p, client: opt?.value ?? "" }))}
            placeholder="Search client…"
            isClearable
            menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
            styles={selectStyles as any}
            formatOptionLabel={(opt: any) => (
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{opt.label}</span>
                {opt.hint ? <span className="text-[11px] opacity-70 truncate">{opt.hint}</span> : null}
              </div>
            )}
          />
        </div>

        <div>
          <label htmlFor="orderDate" className="block text-sm font-medium mb-1">Order Date & Time</label>
          <DateTimePicker
            id="orderDate"
            value={form.orderDate}
            onChange={(val) => setForm((p) => ({ ...p, orderDate: val }))}
            dateOnly={false}
            disablePast
            closeOnSelect
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Items</label>
            <button
              type="button"
              onClick={addItemRow}
              className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1 text-xs hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-3">
            {form.items.map((it, idx) => {
              const selected = availableProducts.find((p) => p.id === it.productId);
              return (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  {/* Product: react-select Async with price hint */}
                  <div className="md:col-span-7">
                    <AsyncSelect
                      cacheOptions
                      defaultOptions={availableProducts.slice(0, 100).map((p) => ({
                        value: p.id,
                        label: p.name,
                        hint: inr.format(p.price),
                        meta: { price: p.price },
                      }))}
                      loadOptions={loadProductOptions}
                      value={
                        selected
                          ? ({ value: selected.id, label: selected.name, meta: { price: selected.price } } as any)
                          : null
                      }
                      onChange={(opt: any) => setItem(idx, "productId", opt?.value ?? "")}
                      placeholder="Search product…"
                      isClearable
                      menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                      styles={selectStyles as any}
                      formatOptionLabel={(opt: any) => (
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate">{opt.label}</span>
                          {opt.meta?.price != null ? (
                            <span className="text-[11px] opacity-70">{inr.format(Number(opt.meta.price))}</span>
                          ) : (
                            opt.hint ? <span className="text-[11px] opacity-70">{opt.hint}</span> : null
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) =>
                      setItem(idx, "qty", Math.max(1, Number.parseInt(e.target.value || "1", 10)))
                    }
                    className="md:col-span-3 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Qty"
                    required
                  />

                  <div className="md:col-span-2 flex items-center justify-end gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {selected ? inr.format(selected.price * it.qty) : "-"}
                    </span>
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="rounded-md border border-red-300 text-red-600 px-2 py-1 text-xs hover:bg-red-50 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-400/10"
                        aria-label="Remove item"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-2 text-sm text-gray-600 dark:text-gray-400">
          Total: <span className="font-medium">{inr.format(totalAmount)}</span>
        </div>
      </FormDialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Order"
        message={
          <>Delete order for “{deleting?.client}” dated {deleting ? formatDateTimeLabel(deleting.orderDate) : ""}?</>
        }
      />
    </div>
  );
}