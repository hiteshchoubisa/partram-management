"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabaseClient";
import DataTable from "@/components/DataTable";
import MobileCard from "@/components/MobileCard";
import ManagementLayout from "@/components/ManagementLayout";
import FormDialog from "@/components/ui/FormDialog";
import DeleteConfirmDialog from "@/components/ui/DeleteConfirmDialog";
import useDialog from "@/hooks/useDialog";
import useForm from "@/hooks/useForm";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
  updated_at: string;
}

function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const addDialog = useDialog();
  const editDialog = useDialog();
  const deleteDialog = useDialog();

  const addForm = useForm({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "user",
  });

  const editForm = useForm({
    name: "",
    email: "",
    phone: "",
    role: "user",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError("Failed to fetch users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    addForm.reset();
    addDialog.open();
  };

  const handleEdit = (user: User) => {
    editForm.setForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
    editDialog.open(user);
  };

  const handleDelete = (user: User) => {
    deleteDialog.open(user);
  };

  const handleAddSubmit = async () => {
    try {
      const { error } = await supabase
        .from("users")
        .insert([{
        name: addForm.form.name,
        email: addForm.form.email,
        phone: addForm.form.phone,
        role: addForm.form.role,
        password_hash: addForm.form.password, // In production, hash this password
        }]);

      if (error) throw error;
      
      addDialog.close();
      addForm.reset();
      fetchUsers();
    } catch (err) {
      setError("Failed to add user");
      console.error(err);
    }
  };

  const handleEditSubmit = async () => {
    try {
      const userToEdit = editDialog.data as User;
      const { error } = await supabase
        .from("users")
        .update({
        name: editForm.form.name,
        email: editForm.form.email,
        phone: editForm.form.phone,
        role: editForm.form.role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userToEdit.id);

      if (error) throw error;
      
      editDialog.close();
      editForm.reset();
      fetchUsers();
    } catch (err) {
      setError("Failed to update user");
      console.error(err);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const userToDelete = deleteDialog.data as User;
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userToDelete.id);

      if (error) throw error;
      
      deleteDialog.close();
      fetchUsers();
    } catch (err) {
      setError("Failed to delete user");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="text-loading mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  const columns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "role", header: "Role" },
    { key: "created_at", header: "Created", accessor: (user: User) => new Date(user.created_at).toLocaleDateString() },
  ];


  return (
    <ManagementLayout
      title="User Management"
      subtitle="Manage system users. Add, edit, or delete user accounts."
      actions={
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-md border border-red-300 text-red-700 bg-red-50 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(user, index) => user.id}
        mobileCard={(user, index) => (
          <div key={user.id} className="bg-white  rounded-lg shadow p-4">
            <MobileCard
              title={user.name}
              subtitle={user.email}
              rows={[
                { label: "Phone", value: user.phone },
                { label: "Role", value: user.role },
                { label: "Created", value: new Date(user.created_at).toLocaleDateString() },
              ]}
            >
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleEdit(user)}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 text-white px-3 py-1 text-xs font-medium hover:bg-blue-700"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(user)}
                  className="inline-flex items-center gap-1 rounded-md bg-red-600 text-white px-3 py-1 text-xs font-medium hover:bg-red-700"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </MobileCard>
          </div>
        )}
      />

      {/* Add User Dialog */}
      <FormDialog
        open={addDialog.open}
        onClose={addDialog.close}
        title="Add New User"
        onSubmit={handleAddSubmit}
        submitText="Add User"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700  mb-1">
              Name
            </label>
            <input
              type="text"
              value={addForm.form.name}
              onChange={(e) => addForm.setField("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white  text-gray-900 "
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700  mb-1">
              Email
            </label>
            <input
              type="email"
              value={addForm.form.email}
              onChange={(e) => addForm.setField("email", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white  text-gray-900 "
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700  mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={addForm.form.phone}
              onChange={(e) => addForm.setField("phone", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white  text-gray-900 "
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700  mb-1">
              Password
            </label>
            <input
              type="password"
              value={addForm.form.password}
              onChange={(e) => addForm.setField("password", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white  text-gray-900 "
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700  mb-1">
              Role
            </label>
            <select
              value={addForm.form.role}
              onChange={(e) => addForm.setField("role", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white  text-gray-900 "
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </FormDialog>

      {/* Edit User Dialog */}
      <FormDialog
        open={editDialog.open}
        onClose={editDialog.close}
        title="Edit User"
        onSubmit={handleEditSubmit}
        submitText="Update User"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700  mb-1">
              Name
            </label>
            <input
              type="text"
              value={editForm.form.name}
              onChange={(e) => editForm.setField("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white  text-gray-900 "
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700  mb-1">
              Email
            </label>
            <input
              type="email"
              value={editForm.form.email}
              onChange={(e) => editForm.setField("email", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white  text-gray-900 "
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700  mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={editForm.form.phone}
              onChange={(e) => editForm.setField("phone", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white  text-gray-900 "
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700  mb-1">
              Role
            </label>
            <select
              value={editForm.form.role}
              onChange={(e) => editForm.setField("role", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white  text-gray-900 "
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </FormDialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onClose={deleteDialog.close}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete user "${deleteDialog.data?.name}"? This action cannot be undone.`}
      />
    </ManagementLayout>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute adminOnly>
      <UsersContent />
    </ProtectedRoute>
  );
}
