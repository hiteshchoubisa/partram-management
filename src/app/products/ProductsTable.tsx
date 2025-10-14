"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import DataTable, { Column } from "../../components/DataTable";
import MobileCard from "../../components/MobileCard";
import FormDialog from "../../components/ui/FormDialog";
import DeleteConfirmDialog from "../../components/ui/DeleteConfirmDialog";
import { supabase } from "../../lib/supabaseClient";
import Pagination from "../../components/ui/Pagination"; // added
import { generateProductId } from "../../lib/shortId";

// Use env or fallback
const PRODUCT_BUCKET = process.env.NEXT_PUBLIC_PRODUCT_BUCKET || "product-photos";

// If DB stores a storage path (e.g. "images/abc.jpg"), convert to public URL.
// If DB already stores a full URL, return it as-is.
function resolvePhotoUrl(v?: string | null) {
  if (!v) return undefined;
  if (v.startsWith("http")) return v;
  return supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(v).data.publicUrl || undefined;
}

// Resolve multiple image URLs from JSONB array
function resolveImageUrls(images: any): string[] {
  if (!images || !Array.isArray(images)) return [];
  return images
    .filter((img) => img && typeof img === 'string')
    .map((img) => resolvePhotoUrl(img))
    .filter((url) => url !== undefined) as string[];
}

function sanitizeFilename(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
}

async function uploadPhoto(file: File) {
  const path = `products/${generateProductId()}-${sanitizeFilename(file.name)}`;
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
    images: resolveImageUrls(row.images),
    imagePaths: row.images || [], // keep original storage paths
    // Keep legacy photo_url support for backward compatibility
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
  images: string[]; // resolved public URLs
  imagePaths: string[]; // storage paths saved in DB (images column)
  // Keep legacy photo_url support for backward compatibility
  photoUrl?: string; // data/object URL
  photoPath?: string; // storage path saved in DB (photo_url)
};

type FormState = {
  name: string;
  description: string;
  price: string; // keep as string in form, parse on submit
  mrp: string;
  category: string;
  imageFiles: File[];
  imageUrls: string[];
  // Keep legacy photo support for backward compatibility
  photoFile: File | null;
  photoUrl?: string;
  // Track which existing images to keep/remove
  existingImagePaths: string[];
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
    imageFiles: [],
    imageUrls: [],
    photoFile: null,
    photoUrl: undefined,
    existingImagePaths: [],
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
    setForm({ 
      name: "", 
      description: "", 
      price: "", 
      mrp: "", 
      category: "", 
      imageFiles: [], 
      imageUrls: [], 
      photoFile: null, 
      photoUrl: undefined,
      existingImagePaths: []
    });
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
      imageFiles: [],
      imageUrls: p.images,
      photoFile: null,
      photoUrl: p.photoUrl,
      existingImagePaths: p.imagePaths || [],
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

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    
    // Check if we already have 4 images
    if (form.imageFiles.length >= 4) {
      alert('Maximum 4 images allowed per product');
      return;
    }
    
    const url = URL.createObjectURL(file);
    setForm((prev) => ({
      ...prev,
      imageFiles: [...prev.imageFiles, file],
      imageUrls: [...prev.imageUrls, url]
    }));
  }

  function removeImage(index: number) {
    setForm((prev) => {
      const newFiles = [...prev.imageFiles];
      const newUrls = [...prev.imageUrls];
      const existingPaths = [...prev.existingImagePaths];
      
      // Check if this is a new file (blob URL) or existing image
      const isNewFile = newUrls[index] && newUrls[index].startsWith('blob:');
      
      if (isNewFile) {
        // Revoke object URL to avoid memory leaks
        try {
          URL.revokeObjectURL(newUrls[index]);
        } catch {}
        
        // Remove from new files
        newFiles.splice(index, 1);
        newUrls.splice(index, 1);
      } else {
        // This is an existing image - remove from existing paths
        const imageUrl = newUrls[index];
        const pathIndex = existingPaths.findIndex(path => 
          imageUrl.includes(path) || imageUrl.endsWith(path)
        );
        
        if (pathIndex !== -1) {
          existingPaths.splice(pathIndex, 1);
        }
        
        // Remove from display URLs
        newUrls.splice(index, 1);
      }
      
      return {
        ...prev,
        imageFiles: newFiles,
        imageUrls: newUrls,
        existingImagePaths: existingPaths
      };
    });
  }

  function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
      // Upload new image files
      const newImagePaths: string[] = [];
      if (form.imageFiles.length > 0) {
        for (const file of form.imageFiles) {
          const path = await uploadPhoto(file);
          newImagePaths.push(path);
        }
      }

      // Handle images for editing vs new products
      if (editing) {
        // For editing: keep existing images that weren't removed + add new ones
        payload.images = [...form.existingImagePaths, ...newImagePaths];
      } else {
        // For new products: only new images
        payload.images = newImagePaths;
      }

      // Keep legacy photo_url support for backward compatibility
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
          // Remove old files that were deleted
          const originalPaths = editing.imagePaths || [];
          const removedPaths = originalPaths.filter(path => !form.existingImagePaths.includes(path));
          
          if (removedPaths.length > 0) {
            await supabase.storage.from(PRODUCT_BUCKET).remove(removedPaths).catch(() => {});
          }
          
          // Optionally remove old photo if replaced
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
                    images: resolveImageUrls(data.images),
                    imagePaths: data.images || [],
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
              images: resolveImageUrls(data.images),
              imagePaths: data.images || [],
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
        .select("id,name,price,mrp,category,description,photo_url,images,created_at")
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

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up any remaining object URLs
      form.imageUrls.forEach(url => {
        if (url && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch {}
        }
      });
      if (form.photoUrl && form.photoUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(form.photoUrl);
        } catch {}
      }
    };
  }, []);

  const productColumns: Column<Product>[] = [
    {
      key: "featuredImage",
      header: "",
      accessor: (p) => {
        const displayImages = p.images.length > 0 ? p.images : (p.photoUrl ? [p.photoUrl] : []);
        const featuredImage = displayImages[0]; // First image is featured
        return featuredImage ? (
          <div className="relative">
            <img
              src={featuredImage}
              alt={`${p.name} featured`}
              className="h-10 w-10 rounded-md object-cover border border-black/10 dark:border-white/15"
            />
            {displayImages.length > 1 && (
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                {displayImages.length}
              </div>
            )}
          </div>
        ) : null;
      },
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
        <p className="text-secondary-sm">Manage your products. Add, edit, or delete.</p>
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
        cardRenderer={(p) => {
          const displayImages = p.images.length > 0 ? p.images : (p.photoUrl ? [p.photoUrl] : []);
          const featuredImage = displayImages[0]; // First image is featured
          return (
            <div className="relative">
              {featuredImage && (
                <div className="absolute top-15 right-1 z-20">
                  <div className="relative">
                    <img
                      src={featuredImage}
                      alt={`${p.name} featured`}
                      className="w-16 h-16 rounded-md object-cover border border-black/10 dark:border-white/15"
                    />
                    {displayImages.length > 1 && (
                      <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                        {displayImages.length}
                      </div>
                    )}
                  </div>
                </div>
              )}
            <MobileCard
              title={p.name}
              right={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="rounded-md border border-black/10 dark:border-white/15 p-2 hover:bg-black/5 dark:hover:bg-white/10"
                    title="Edit product"
                    aria-label="Edit product"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDelete(p)}
                    className="rounded-md border border-red-300 text-red-600 p-2 hover:bg-red-50 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-400/10"
                    title="Delete product"
                    aria-label="Delete product"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              }
              rows={[
                { label: "Price", value: inr.format(p.price) },
                { label: "MRP", value: typeof p.mrp === "number" && p.mrp > p.price ? inr.format(p.mrp) : "-" },
                ...(p.category ? [{ label: "Category", value: p.category }] : []),
              ]}
            >
              {p.description ? (
                <p className="description-text">{p.description}</p>
              ) : null}
            </MobileCard>
          </div>
        );
        }}
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

        {/* Product Images - Max 4 */}
        <div className="md:col-span-2">
          <label htmlFor="images" className="block text-sm font-medium mb-1">
            Product Images (Max 4) - First image will be featured
          </label>
          {form.imageUrls.length < 4 && (
            <input
              id="images"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-background file:hover:opacity-90"
            />
          )}
          {form.imageUrls.length >= 4 && (
            <p className="text-sm text-gray-500 mb-2">Maximum 4 images reached</p>
          )}
          {form.imageUrls.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {form.imageUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="h-24 w-full rounded object-cover bg-black/5 dark:bg-white/5"
                  />
                  {index === 0 && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Featured
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
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