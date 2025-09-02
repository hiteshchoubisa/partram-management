"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { Column } from "../../components/DataTable";
import MobileCard from "../../components/MobileCard";
import FormDialog from "../../components/ui/FormDialog";
import DeleteConfirmDialog from "../../components/ui/DeleteConfirmDialog";
import { supabase } from "../../lib/supabaseClient";
import Pagination from "../../components/ui/Pagination"; // added

// Use env or fallback
const PRODUCT_BUCKET = process.env.NEXT_PUBLIC_PRODUCT_BUCKET || "product-photos";

// If DB stores a storage path (e.g. "images/abc.jpg"), convert to public URL.
// If DB already stores a full URL, return it as-is.
function resolvePhotoUrl(v?: string | null) {
  if (!v) return undefined;
  if (v.startsWith("http")) return v;
  return supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(v).data.publicUrl || undefined;
}

function sanitizeFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
}

async function uploadPhoto(file: File) {
  const path = `products/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
  const { data, error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
  if (error) throw error;
  return data.path; // store this in products.photo_url
}

// If you already have a mapProductRow, extend it; else add this helper
function mapProductRow(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    mrp: row.mrp != null ? Number(row.mrp) : undefined,
    category: row.category ?? "",
    description: row.description ?? "",
    photoUrl: resolvePhotoUrl(row.photo_url ?? row.photoUrl ?? null),
    photoPath: row.photo_url ?? undefined, // keep original storage path
  };
}

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  mrp?: number; // Allow undefined
  category: string;
  photoUrl?: string; // data/object URL
  photoPath?: string; // storage path saved in DB (photo_url)
};

type FormState = {
  name: string;
  description: string;
  price: string; // keep as string in form, parse on submit
  mrp: string;
  category: string;
  photoFile: File | null;
  photoUrl?: string;
};

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export default function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([]); // start empty; load from Supabase

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    price: "",
    mrp: "",
    category: "",
    photoFile: null,
    photoUrl: undefined,
  });

  // pagination state
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const priceNum = Number.parseFloat(form.price);
  const mrpNum = Number.parseFloat(form.mrp);

  const isValid = useMemo(() => {
    const fieldsOk =
      form.name.trim() &&
      form.description.trim() &&
      form.category.trim() &&
      !Number.isNaN(priceNum) &&
      !Number.isNaN(mrpNum) &&
      priceNum > 0 &&
      mrpNum > 0;
    const relationOk = !Number.isNaN(priceNum) && !Number.isNaN(mrpNum) ? mrpNum >= priceNum : false;
    return Boolean(fieldsOk && relationOk);
  }, [form, priceNum, mrpNum]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.info("[storage] bucket =", PRODUCT_BUCKET);
    }
  }, []);

  // clamp page when list size changes
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(products.length / pageSize)),
    [products.length]
  );
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  // slice rows for current page
  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }, [products, page]);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", description: "", price: "", mrp: "", category: "", photoFile: null, photoUrl: undefined });
    setIsOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      mrp: String(p.mrp),
      category: p.category,
      photoFile: null,
      photoUrl: p.photoUrl,
    });
    setIsOpen(true);
  }

  function openDelete(p: Product) {
    setDeleting(p);
  }

  function closeModal() {
    setIsOpen(false);
  }

  function cancelDelete() {
    setDeleting(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) setProducts((prev) => prev.filter((p) => p.id !== id));
    setDeleting(null);
  }

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setForm((prev) => ({ ...prev, photoFile: null, photoUrl: undefined }));
      return;
    }
    const url = URL.createObjectURL(file);
    setForm((prev) => {
      // Revoke previous object URL to avoid leaks
      if (prev.photoUrl && prev.photoUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(prev.photoUrl);
        } catch {}
      }
      return { ...prev, photoFile: file, photoUrl: url };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    const payload: any = {
      name: form.name.trim(),
      price: Number(form.price ?? 0),
      mrp: form.mrp ? Number(form.mrp) : null,
      category: form.category?.trim() || null,
      description: form.description?.trim() || null,
    };

    try {
      // If a new file is selected, upload and set photo_url
      let newPhotoPath: string | null = null;
      if (form.photoFile) {
        newPhotoPath = await uploadPhoto(form.photoFile);
        payload.photo_url = newPhotoPath;
      }

      if (editing) {
        const { data, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editing.id)
          .select("*")
          .single();
        if (!error && data) {
          // Optionally remove old file if replaced
          if (form.photoFile && editing.photoPath && editing.photoPath !== newPhotoPath) {
            await supabase.storage.from(PRODUCT_BUCKET).remove([editing.photoPath]).catch(() => {});
          }
          setProducts((prev) =>
            prev.map((p) =>
              p.id === data.id
                ? {
                    id: data.id,
                    name: data.name,
                    price: Number(data.price),
                    mrp: data.mrp != null ? Number(data.mrp) : undefined,
                    category: data.category ?? "",
                    description: data.description ?? "",
                    photoUrl: resolvePhotoUrl(data.photo_url ?? null),
                    photoPath: data.photo_url ?? undefined,
                  }
                : p
            )
          );
        }
      } else {
        const { data, error } = await supabase.from("products").insert([payload]).select("*").single();
        if (!error && data) {
          setProducts((prev) => [
            {
              id: data.id,
              name: data.name,
              price: Number(data.price),
              mrp: data.mrp != null ? Number(data.mrp) : undefined,
              category: data.category ?? "",
              description: data.description ?? "",
              photoUrl: resolvePhotoUrl(data.photo_url ?? null),
              photoPath: data.photo_url ?? undefined,
            },
            ...prev,
          ]);
        }
      }
      closeModal();
    } catch (err) {
      console.error("Photo upload failed:", (err as any)?.message || err);
    }
  }

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,price,mrp,category,description,photo_url,created_at")
        .order("created_at", { ascending: false });
      if (!error && data) setProducts(data.map(mapProductRow));
    })();
  }, []);

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

  const productColumns: Column<Product>[] = [
    {
      key: "photo",
      header: "",
      accessor: (p) =>
        p.photoUrl ? (
          <img
            src={p.photoUrl}
            alt={p.name}
            className="h-10 w-10 rounded-md object-cover border border-black/10 dark:border-white/15"
          />
        ) : null,
    },
    { key: "name", header: "Name", accessor: (p) => p.name },
    { key: "price", header: "Price", accessor: (p) => inr.format(p.price) },
    {
      key: "mrp",
      header: "MRP",
      accessor: (p) => (typeof p.mrp === "number" && p.mrp > p.price ? inr.format(p.mrp) : "-"),
    },
    { key: "category", header: "Category", accessor: (p) => p.category || "-" },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">Manage your products. Add, edit, or delete.</p>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          + Add Product
        </button>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={products.length}
        onPageChange={setPage}
      />

      <DataTable
        rows={pagedProducts} // was products
        columns={productColumns}
        rowKey={(p) => p.id}
        emptyMessage='No products yet. Click “Add Product” to create one.'
        actions={[
          { label: "Edit", onClick: (p) => openEdit(p) },
          { label: "Delete", onClick: (p) => openDelete(p), kind: "danger" },
        ]}
        cardRenderer={(p) => (
          <MobileCard
            title={p.name}
            right={
              p.photoUrl ? (
                <img
                  src={p.photoUrl}
                  alt={p.name}
                  className="h-14 w-14 rounded-md object-cover border border-black/10 dark:border-white/15"
                />
              ) : undefined
            }
            rows={[
              { label: "Price", value: inr.format(p.price) },
              { label: "MRP", value: typeof p.mrp === "number" && p.mrp > p.price ? inr.format(p.mrp) : "-" },
              ...(p.category ? [{ label: "Category", value: p.category }] : []),
            ]}
          >
            {p.description ? (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-3">{p.description}</p>
            ) : null}
          </MobileCard>
        )}
      />

      <FormDialog
        open={isOpen}
        onClose={closeModal}
        title={editing ? "Edit Product" : "Add Product"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save" : "Add"}
        submitDisabled={!isValid}
        size="md"
        align="start"
      >
        {/* Move your existing form fields here */}
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Product name"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1">Category</label>
          <input
            id="category"
            type="text"
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Category"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Details about the product"
            rows={3}
            required
          />
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium mb-1">Price</label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => handleChange("price", e.target.value)}
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="0.00"
            required
          />
        </div>

        {/* MRP */}
        <div>
          <label htmlFor="mrp" className="block text-sm font-medium mb-1">MRP</label>
          <input
            id="mrp"
            type="number"
            min="0"
            step="0.01"
            value={form.mrp}
            onChange={(e) => handleChange("mrp", e.target.value)}
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="0.00"
          />
        </div>

        {/* Optional photo URL (if you store it) */}
        <div className="md:col-span-2">
          <label htmlFor="photo" className="block text-sm font-medium mb-1">
            Photo
          </label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                photoFile: e.target.files?.[0] ?? null,
                // Optional preview
                photoUrl: e.target.files?.[0] ? URL.createObjectURL(e.target.files[0]) : undefined,
              }))
            }
            className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-background file:hover:opacity-90"
          />
          {form.photoUrl && (
            <div className="mt-3">
              <img
                src={form.photoUrl}
                alt="Preview"
                className="h-24 w-24 rounded object-contain bg-black/5 dark:bg-white/5"
              />
            </div>
          )}
        </div>
      </FormDialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={<>Delete product “{deleting?.name}”?</>}
      />
    </div>
  );
}