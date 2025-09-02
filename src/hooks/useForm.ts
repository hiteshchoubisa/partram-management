"use client";
import { useCallback, useState } from "react";

export default function useForm<T extends object>(initial: T) {
  const [form, setForm] = useState<T>(initial);
  const setField = useCallback(<K extends keyof T>(k: K, v: T[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
  }, []);
  const reset = useCallback((next?: T) => setForm(next ?? initial), [initial]);
  return { form, setForm, setField, reset };
}