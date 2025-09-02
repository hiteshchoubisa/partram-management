"use client";
import React from "react";
import Dialog from "./Dialog";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function DeleteConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title = "Delete",
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      align="center"
      showClose
    >
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700"
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}