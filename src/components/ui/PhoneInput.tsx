"use client";
import { useMemo } from "react";

type Props = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
};

export default function PhoneInput({
  id,
  value,
  onChange,
  label,
  placeholder = "e.g. 9876543210",
  required,
  disabled,
  error,
  className,
}: Props) {
  const digits = useMemo(() => value.replace(/[^\d]/g, ""), [value]);

  return (
    <div>
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium mb-1">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        value={digits}
        onChange={(e) => onChange(e.currentTarget.value.replace(/[^\d]/g, "").slice(0, 10))}
        className={
          className ??
          "w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
        }
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        pattern="\d{10}"
        minLength={10}
        maxLength={10}
        title="Enter 10 digit phone number"
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}