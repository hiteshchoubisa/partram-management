"use client";
import React from "react";
import Dialog, { DialogProps } from "./Dialog";

type Props = Omit<DialogProps, "children" | "footer" | "title"> & {
  title: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  children: React.ReactNode;
};

export default function FormDialog({
  open,
  onClose,
  title,
  onSubmit,
  children,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  submitDisabled,
  size = "md",
  align = "start",
  ...rest
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      align={align}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            form="form-dialog-form"
            disabled={submitDisabled}
            className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      }
      {...rest}
    >
      <form id="form-dialog-form" onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
        {children}
      </form>
    </Dialog>
  );
}