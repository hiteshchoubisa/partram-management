"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { Column } from "../../components/DataTable";
import MobileCard from "../../components/MobileCard";
import FormDialog from "../../components/ui/FormDialog";
import DeleteConfirmDialog from "../../components/ui/DeleteConfirmDialog";
import { supabase } from "../../lib/supabaseClient";
import { Trash2, Plus } from "lucide-react";
import PasswordInput from "../../components/ui/PasswordInput";

type UserRecord = {
  id: string;
  name: string;
  phone: string; // username = phone
  role?: "user" | "admin" | "mass_admin" | null;
};

type FormState = {
  name: string;
  phone: string;     // username = phone
  password: string;  // will be hashed to password_hash
  role: "user" | "admin";
};

async function sha256Hex(text: string) {
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function UsersTable() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [deleting, setDeleting] = useState<UserRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    password: "",
    role: "user",
  });

  useEffect(() => {
    (async () => {
      try {
        setLoadError(null);
        const { data, error } = await supabase
          .from("users")
          .select("id,name,phone,role")
          .order("name", { ascending: true })
          .limit(1000);
        if (error) throw error;
        setUsers((data as UserRecord[]) ?? []);
      } catch (e: any) {
        console.error("[users] load failed:", e.message);
        setLoadError(e.message);
        setUsers([]);
      }
    })();
  }, []);

  useEffect(() => {
    // read role from cookie set at login
    const role = typeof document !== "undefined"
      ? document.cookie.match(/(?:^|;\s*)pm_role=([^;]+)/)?.[1]
      : null;
    setCanManage(role === "admin" || role === "mass_admin");
  }, []);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  const isValid = useMemo(() => {
    const phoneOk = /^\d{10}$/.test(form.phone.trim());
    return form.name.trim().length > 0 && phoneOk && form.password.trim().length > 0;
  }, [form]);

  function openAdd() {
    if (!canManage) return;
    setForm({ name: "", phone: "", password: "", role: "user" });
    setIsOpen(true);
  }
  function closeModal() { setIsOpen(false); }

  function openDelete(u: UserRecord) {
    if (!canManage) return;
    setDeleting(u);
  }
  function cancelDelete() { setDeleting(null); }

  async function confirmDelete() {
    if (!deleting || !canManage) return;
    try {
      setLoadError(null);
      const { error } = await supabase.from("users").delete().eq("id", deleting.id);
      if (error) throw error;
      setUsers((p) => p.filter((u) => u.id !== deleting.id));
    } catch (e: any) {
      console.error("[users] delete failed:", e.message);
      setLoadError(e.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !canManage) return;
    setLoadError(null);
    try {
      const password_hash = await sha256Hex(form.password.trim());
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            name: form.name.trim(),
            phone: form.phone.trim(),
            role: form.role,
            password_hash,
          },
        ])
        .select("id,name,phone,role")
        .single();
      if (error) throw error;
      setUsers((prev) => [data as UserRecord, ...prev]);
      closeModal();
    } catch (err: any) {
      console.error("[users] add failed:", err.message);
      setLoadError(err.message);
    }
  }

  const columns: Column<UserRecord>[] = [
    { key: "name", header: "Name", accessor: (u) => u.name },
    { key: "phone", header: "Phone (Username)", accessor: (u) => u.phone },
    { key: "role", header: "Role", accessor: (u) => u.role || "user" },
  ];

  return (
    <div className="w-full">
      {loadError ? (
        <div className="mb-3 rounded-md border border-red-300 text-red-700 bg-red-50 px-3 py-2 text-sm">
          Failed to load users: {loadError}
        </div>
      ) : null}

      {!canManage ? (
        <div className="mb-3 rounded-md border border-yellow-200 text-yellow-800 bg-yellow-50 px-3 py-2 text-sm">
          You have read-only access.
        </div>
      ) : null}

      <div className="mb-3 flex items-center justify-end">
        {canManage && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-3 py-2 text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
        )}
      </div>

      <DataTable
        rows={users}
        columns={columns}
        rowKey={(u) => u.id}
        emptyMessage="No users found."
        rowActionsRenderer={(u) =>
          canManage ? (
            <>
              <button
                type="button"
                aria-label="Delete"
                onClick={() => openDelete(u)}
                className="rounded-md p-2 hover:bg-black/5 dark:hover:bg.white/10 text-red-600 dark:text-red-400"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : null
        }
        cardRenderer={(u) => (
          <MobileCard
            title={u.name}
            subtitle={u.phone}
            right={
              canManage ? (
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => openDelete(u)}
                  className="rounded-md p-2 hover:bg-black/5 dark:hover:bg.white/10 text-red-600 dark:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null
            }
            rows={[{ label: "Role", value: u.role || "user" }]}
          />
        )}
      />

      <FormDialog
        open={isOpen}
        onClose={closeModal}
        title="Add User"
        onSubmit={handleSubmit}
        submitLabel="Add"
        submitDisabled={!isValid}
        size="md"
        align="start"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full rounded-md border border-black/10 dark:border.white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Full name"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone (Username)</label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value.replace(/[^\d]/g, ""))}
            className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="10-digit phone"
            required
            pattern="\d{10}"
            minLength={10}
            maxLength={10}
            title="Enter 10 digit phone number"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
          <PasswordInput
            id="password"
            value={form.password}
            onChange={(e) => handleChange("password", (e.target as HTMLInputElement).value)}
            placeholder="Set initial password"
            required
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium mb-1">Role</label>
          <select
            id="role"
            value={form.role}
            onChange={(e) => handleChange("role", e.target.value as FormState["role"])}
            className="w-full rounded-md border border-black/10 dark:border.white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </FormDialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete User"
        message={<>Delete user “{deleting?.name}” ({deleting?.phone})?</>}
      />
    </div>
  );
}