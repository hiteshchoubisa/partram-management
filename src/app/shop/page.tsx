"use client";

import { useEffect, useMemo, useState } from "react";
import ManagementLayout from "../../components/ManagementLayout";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import FormDialog from "../../components/ui/FormDialog";
import AsyncSelect from "react-select/async";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const PRODUCT_BUCKET = process.env.NEXT_PUBLIC_PRODUCT_BUCKET || "product-photos";

type Product = {
  id: string;
  name: string;
  price: number;
  mrp?: number;
  category?: string;
  description?: string;
  photoUrl?: string;
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  photoUrl?: string;
};

function resolvePhotoUrl(v?: string | null) {
  if (!v) return undefined;
  if (v.startsWith("http")) return v;
  return supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(v).data.publicUrl || undefined;
}

// (optional) reuse minimal styles so menu renders above dialog
const selectStyles = {
  menuPortal: (base: any) => ({ ...base, zIndex: 50 }),
  menu: (base: any) => ({ ...base, zIndex: 50 }),
};

async function loadClientOptions(input: string) {
  const term = input.trim();
  let q = supabase.from("clients").select("name,phone,address").order("name", { ascending: true }).limit(25);
  if (term) {
    q = q.or(
      `name.ilike.%${term}%,phone.ilike.%${term}%,address.ilike.%${term}%`
    );
  }
  const { data } = await q;
  return (data || []).map((c: any) => ({
    value: c.name,
    label: c.name,
    hint: c.phone || c.address || undefined,
  }));
}

export default function ShopPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("All");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Clients for order
  const [clients, setClients] = useState<{ name: string; address?: string | null; phone?: string | null }[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [{ data, error }, clientsRes] = await Promise.all([
        supabase
          .from("products")
          .select("id,name,price,mrp,category,description,photo_url,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("name,phone,address").order("name", { ascending: true }),
      ]);

      if (!error && data) {
        setProducts(
          data.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            mrp: p.mrp != null ? Number(p.mrp) : undefined,
            category: (p.category ?? "").trim(),
            description: p.description ?? "",
            photoUrl: resolvePhotoUrl(p.photo_url ?? null),
          }))
        );
      }
      if (!clientsRes.error && clientsRes.data) {
        setClients((clientsRes.data as any[]).map((c) => ({ name: c.name, address: c.address ?? null,  phone: c.phone ?? null })));
      }
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) set.add(p.category || "Uncategorized");
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    if (selected === "All") return products;
    return products.filter((p) => (p.category || "Uncategorized") === selected);
  }, [products, selected]);

  const cartCount = useMemo(() => cart.reduce((n, it) => n + it.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, it) => sum + it.price * it.qty, 0), [cart]);

  function addToCart(p: Product) {
    setCart((prev) => {
      const ix = prev.findIndex((it) => it.productId === p.id);
      if (ix >= 0) {
        const next = [...prev];
        next[ix] = { ...next[ix], qty: next[ix].qty + 1 };
        return next;
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, price: p.price, qty: 1, photoUrl: p.photoUrl },
      ];
    });
  }

  function updateQty(productId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((it) => (it.productId === productId ? { ...it, qty: Math.max(1, qty) } : it))
        .filter((it) => it.qty > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((it) => it.productId !== productId));
  }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient || cart.length === 0) return;
    const payload = {
      client: selectedClient,
      order_date: new Date().toISOString(),
      status: "Pending",
      items: cart.map((it) => ({ productId: it.productId, qty: it.qty })),
    };
    const { error } = await supabase.from("orders").insert([payload]);
    if (!error) {
      setCart([]);
      setSelectedClient("");
      setCartOpen(false);
      router.push("/orders");
    } else {
      console.error("Create order failed:", error.message);
    }
  }

  return (
    <ManagementLayout
      title="Shop"
      subtitle="Browse products by category"
      actions={
        // Hide header actions on mobile to avoid duplicate buttons
        <div className="hidden sm:flex items-center gap-3">
          {products.length > 0 ? (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {filtered.length} / {products.length}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="rounded-md bg-black text-white px-3 py-1.5 text-sm hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={cart.length === 0}
            title={cart.length === 0 ? "Cart is empty" : "Open cart"}
          >
            Cart ({cartCount})
          </button>
        </div>
      }
    >
      {/* Filter toolbar */}
      <div className="mb-4 flex flex-col gap-2">
        <div className="hidden sm:flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelected("All")}
            className={`rounded-full border px-3 py-1 text-sm ${
              selected === "All"
                ? "bg-foreground text-background"
                : "border-black/10 dark:border-white/15 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelected(c)}
              className={`rounded-full border px-3 py-1 text-sm ${
                selected === c
                  ? "bg-foreground text-background"
                  : "border-black/10 dark:border-white/15 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="sm:hidden">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
          >
            <option value="All">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading products…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">No products in this category.</p>
      ) : (
        <>
          {/* Mobile: List view */}
          <ul className="sm:hidden divide-y divide-black/10 dark:divide-white/10 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-900">
            {filtered.map((p) => (
              <li key={p.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{p.category || "Uncategorized"}</div>
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className="text-base font-bold text-red-700 md:text-sm md:font-medium md:text-current"
                      >
                        {inr.format(p.price)}
                      </span>
                      {typeof p.mrp === "number" && p.mrp > p.price ? (
                        <span className="text-xs text-gray-500 line-through">{inr.format(p.mrp)}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      className="rounded-md bg-black text-white px-3 py-2 text-xs hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                 
                </div>
              </li>
            ))}
          </ul>

          {/* Tablet/Desktop: Grid view */}
          <div className="hidden sm:grid grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-black/10 dark:border-white/15 overflow-hidden bg-white dark:bg-zinc-900"
              >
                <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">No Image</div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{p.category || "Uncategorized"}</div>
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className="text-base font-bold text-red-700 md:text-sm md:font-medium md:text-current"
                    >
                      {inr.format(p.price)}
                    </span>
                    {typeof p.mrp === "number" && p.mrp > p.price ? (
                      <span className="text-xs text-gray-500 line-through">{inr.format(p.mrp)}</span>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      className="w-full rounded-md bg-black text-white px-3 py-2 text-sm hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add to cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Mobile fixed cart bar */}
      <div className="sm:hidden">
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 dark:border-white/15 bg-white dark:bg-zinc-900 px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm">
              Cart: {cartCount} • Total: {inr.format(cartTotal)}
            </span>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={cart.length === 0}
              aria-label="Open cart"
            >
              Cart ({cartCount})
            </button>
          </div>
        </div>
        {/* Spacer so content isn't hidden behind the fixed bar */}
        <div className="h-16" />
      </div>

      {/* Cart dialog */}
      <FormDialog
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Create Order"
        onSubmit={createOrder}
        submitLabel="Place Order"
        submitDisabled={cart.length === 0 || !selectedClient}
        size="md"
        align="start"
      >
        <div>
          <label htmlFor="client" className="block text-sm font-medium mb-1">
            Client
          </label>
          <AsyncSelect
            inputId="client"
            cacheOptions
            defaultOptions={clients.slice(0, 50).map((c) => ({
              value: c.name,
              label: c.name,
              hint: c.phone || c.address || undefined,
            }))}
            loadOptions={loadClientOptions}
            value={
              selectedClient
                ? ({ value: selectedClient, label: selectedClient } as any)
                : null
            }
            onChange={(opt: any) => setSelectedClient(opt?.value ?? "")}
            placeholder="Search client…"
            isClearable
            menuPortalTarget={
              typeof window !== "undefined" ? document.body : undefined
            }
            styles={selectStyles as any}
            formatOptionLabel={(opt: any) => (
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{opt.label}</span>
                {opt.hint ? (
                  <span className="text-[11px] opacity-70 truncate">{opt.hint}</span>
                ) : null}
              </div>
            )}
          />
        </div>

        <div className="md:col-span-2">
          <div className="mt-3 rounded-lg border border-black/10 dark:border-white/15 divide-y">
            {cart.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">Cart is empty</div>
            ) : (
              cart.map((it) => (
                <div key={it.productId} className="p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                    {it.photoUrl ? (
                      <img src={it.photoUrl} className="h-full w-full object-cover" alt={it.name} />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{it.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{inr.format(it.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`qty-${it.productId}`} className="sr-only">Qty</label>
                    <input
                      id={`qty-${it.productId}`}
                      type="number"
                      min={1}
                      value={it.qty}
                      onChange={(e) => updateQty(it.productId, Number(e.target.value || 1))}
                      className="w-16 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeFromCart(it.productId)}
                      className="rounded-md border border-black/10 dark:border-white/15 px-2 py-1 text-xs hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 ? (
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-sm text-red-600 hover:underline"
              >
                Clear cart
              </button>
              <div className="text-sm font-medium">Total: {inr.format(cartTotal)}</div>
            </div>
          ) : null}
        </div>
      </FormDialog>
    </ManagementLayout>
  );
}