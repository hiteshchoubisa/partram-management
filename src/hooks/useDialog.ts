"use client";
import { useCallback, useState } from "react";

export default function useDialog<T = void>() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const show = useCallback((payload?: T) => {
    setData((payload as T) ?? null);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    setData(null);
  }, []);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  return { open, data, setData, show, hide, toggle };
}