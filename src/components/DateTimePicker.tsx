"use client";
import React, { useState } from "react";
import DatePicker from "react-datepicker";

type Props = {
  id?: string;
  value: string;            // "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  dateOnly?: boolean;
  className?: string;
  required?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  disablePast?: boolean;
  // NEW: close popover after a selection
  closeOnSelect?: boolean;
  // OPTIONAL: expose open state changes if you need it
  onOpenChange?: (open: boolean) => void;
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function fmtDateTime(d: Date) { return `${fmtDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function parseValue(v?: string) { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
function startOfToday() { const n = new Date(); n.setHours(0,0,0,0); return n; }
function sameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function startOfDayOf(d: Date) { const n = new Date(d); n.setHours(0,0,0,0); return n; }
function endOfDayOf(d: Date) { const n = new Date(d); n.setHours(23,59,59,999); return n; }

export default function DateTimePicker({
  id, value, onChange, dateOnly = false, className, required, min, max, placeholder, disablePast, closeOnSelect = true, onOpenChange,
}: Props) {
  const selected = parseValue(value);
  const now = new Date();
  const [open, setOpen] = useState(false);

  const minDate = React.useMemo(() => {
    if (min) return parseValue(min) ?? undefined;
    return disablePast ? startOfToday() : undefined;
  }, [min, disablePast]);

  const maxDate = React.useMemo(() => (max ? parseValue(max) ?? undefined : undefined), [max]);

  // Compute time bounds only when showing time
  const timeBounds = React.useMemo(() => {
    if (dateOnly) return { minTime: undefined as Date | undefined, maxTime: undefined as Date | undefined };
    // Use selected day if present, else today
    const day = selected ?? now;
    if (disablePast && sameDay(day, now)) {
      return { minTime: now, maxTime: endOfDayOf(day) };
    }
    return { minTime: startOfDayOf(day), maxTime: endOfDayOf(day) };
  }, [dateOnly, disablePast, selected, now]);

  function setOpenSafe(v: boolean) {
    setOpen(v);
    onOpenChange?.(v);
  }

  function handleChange(d: Date | null) {
    if (!d) return onChange("");
    if (disablePast) {
      const todayStart = startOfToday();
      if (d < todayStart) d = todayStart;
      if (!dateOnly && sameDay(d, now) && d < now) d = now;
    }
    onChange(dateOnly ? fmtDate(d) : fmtDateTime(d));
    if (closeOnSelect) setOpenSafe(false);
  }

  return (
    <DatePicker
      id={id}
      selected={selected}
      onChange={handleChange}
      showTimeSelect={!dateOnly}
      dateFormat={dateOnly ? "yyyy-MM-dd" : "yyyy-MM-dd HH:mm"}
      placeholderText={placeholder}
      className={
        className ??
        "w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
      }
      required={required}
      minDate={minDate}
      maxDate={maxDate}
      // Pass both or neither to satisfy react-datepicker
      {...(!dateOnly ? { minTime: timeBounds.minTime, maxTime: timeBounds.maxTime } : {})}
      isClearable={false}
      shouldCloseOnSelect={!dateOnly}
    />
  );
}

export function formatDateTimeLabel(s: string) {
  if (!s) return "";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch { return s; }
}