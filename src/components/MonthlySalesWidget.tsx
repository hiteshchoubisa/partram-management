"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Product = { id: string; price: number };
type Order = { id: string; order_date: string; items: any[] };
type MonthTotal = { key: string; label: string; total: number };

interface Props {
  variant?: "full" | "simple"; // simple = only graph + total
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  // Some locales return 'Sept' – normalize to 'Sep'
  let lbl = d.toLocaleString(undefined, { month: "short" });
  if (lbl === "Sept") lbl = "Sep";
  return lbl;
}

export default function MonthlySalesWidget({ variant = "simple" }: Props) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const from = new Date();
      from.setMonth(from.getMonth() - 6);
      from.setDate(1);
      const fromIso = from.toISOString().slice(0, 10);

      const [prodRes, ordRes] = await Promise.all([
        supabase.from("products").select("id,price"),
        supabase
          .from("orders")
          .select("id,order_date,items")
          .gte("order_date", fromIso)
          .order("order_date", { ascending: true }),
      ]);

      if (prodRes.error) setError(prodRes.error.message);
      else setProducts(
        (prodRes.data || []).map((p: any) => ({ id: p.id, price: Number(p.price) }))
      );

      if (ordRes.error) setError(ordRes.error.message);
      else setOrders((ordRes.data || []) as any[]);

      setLoading(false);
    })();
  }, []);

  const monthTotals = useMemo<MonthTotal[]>(() => {
    const skeleton = buildSkeleton();
    if (!orders.length) return skeleton;

    const productMap = new Map(products.map((p) => [p.id, p.price]));
    const byMonth = new Map<string, number>();

    function orderTotal(o: Order): number {
      let sum = 0;
      if (Array.isArray(o.items)) {
        for (const it of o.items) {
          if (!it) continue;
          if (it.kind === "product") {
            const price = productMap.get(String(it.productId || it.id)) ?? 0;
            const qty = Number(it.qty) || 0;
            sum += price * qty;
          } else if (it.kind === "custom") {
            sum += Number(it.price) || 0;
          } else if (it.productId) {
            const price = productMap.get(String(it.productId)) ?? 0;
            const qty = Number(it.qty) || 0;
            sum += price * qty;
          }
        }
      }
      return sum;
    }

    for (const o of orders) {
      const d = new Date(o.order_date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) || 0) + orderTotal(o));
    }

    return skeleton.map((s) => ({
      ...s,
      total: byMonth.get(s.key) ?? 0,
    }));
  }, [orders, products]);

  const currentTotal = monthTotals.at(-1)?.total ?? 0;

  return (
    <div className="rounded-lg border border-black/10  p-4 bg-white ">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">Monthly Sales</h3>
          <p className="text-xs opacity-70">Last 6 months + current</p>
        </div>
        {loading && <span className="text-xs opacity-60">Loading…</span>}
        {error && !loading && (
          <span className="text-xs text-red-600">{error}</span>
        )}
      </div>

      <div className="flex items-end gap-2 mt-4">
        {monthTotals.map((m) => {
          const max = Math.max(1, ...monthTotals.map((x) => x.total));
          const h = Math.round((m.total / max) * 70); // height px
            return (
              <div key={m.key} className="flex flex-col items-center flex-1">
                <div
                  className="w-full rounded-t-md bg-blue-500/70  transition-all"
                  style={{ height: h + "px" }}
                  title={`${monthLabel(m.key)}: ${inr.format(m.total)}`}
                />
                <span className="mt-1 text-[10px] font-medium">
                  {monthLabel(m.key)}
                </span>
              </div>
            );
        })}
      </div>

      <div className="mt-4">
        <div className="text-xs opacity-70">Current Month Total</div>
        <div className="font-semibold text-sm">{inr.format(currentTotal)}</div>
      </div>

      {variant === "full" && (
        <div className="mt-2 text-[11px] opacity-60">
          (Full mode would show trends / comparisons)
        </div>
      )}
    </div>
  );
}

function buildSkeleton(): MonthTotal[] {
  const out: MonthTotal[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ key, label: monthLabel(key), total: 0 });
  }
  return out;
}