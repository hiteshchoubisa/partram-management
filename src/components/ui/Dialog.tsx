"use client";
import React, { useEffect, useId } from "react";

type Size = "sm" | "md" | "lg" | "xl";
type Align = "start" | "center";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: Size;
  align?: Align;
  closeOnBackdrop?: boolean;
  showClose?: boolean;
  panelClassName?: string;
  id?: string; // optional id for aria-labelledby
};

const sizeMap: Record<Size, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export default function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  align = "start",
  closeOnBackdrop = true,
  showClose = true,
  panelClassName,
  id,
}: DialogProps) {
  const labelId = id ?? useId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex ${align === "center" ? "items-center" : "items-start"} justify-center bg-black/50 p-4 overflow-y-auto`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? labelId : undefined}
      onMouseDown={(e) => {
        // backdrop click
        if (e.target === e.currentTarget && closeOnBackdrop) onClose();
      }}
    >
      <div
        className={`w-full ${sizeMap[size]} rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-900 max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain ${panelClassName ?? ""}`}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            {title ? (
              <h2 id={labelId} className="text-lg font-semibold">
                {title}
              </h2>
            ) : <span />}
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-gray-500 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {children}

        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}