"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Product = { id: string; name: string; price: number; category: string };
type Order = { id: string; order_date: string; items: any[] };
type CategorySales = {
  category: string;
  items: {
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }[];
  totalQuantity: number;
  totalRevenue: number;
};

interface Props {
  variant?: "full" | "simple";
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function ItemsSalesWidget({ variant = "simple" }: Props) {
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
        supabase.from("products").select("id,name,price,category"),
        supabase
          .from("orders")
          .select("id,order_date,items")
          .gte("order_date", fromIso)
          .order("order_date", { ascending: true }),
      ]);

      if (prodRes.error) setError(prodRes.error.message);
      else setProducts(
        (prodRes.data || []).map((p: any) => ({ 
          id: p.id, 
          name: p.name, 
          price: Number(p.price),
          category: p.category || "Uncategorized"
        }))
      );

      if (ordRes.error) setError(ordRes.error.message);
      else setOrders((ordRes.data || []) as any[]);

      setLoading(false);
    })();
  }, []);

  const categorySales = useMemo<CategorySales[]>(() => {
    if (!orders.length || !products.length) return [];

    const productMap = new Map(products.map((p) => [p.id, p]));
    const categoryMap = new Map<string, CategorySales>();

    // Initialize categories
    const categories = [...new Set(products.map(p => p.category))];
    categories.forEach(category => {
      categoryMap.set(category, {
        category,
        items: [],
        totalQuantity: 0,
        totalRevenue: 0
      });
    });

    // Initialize all products in their categories
    products.forEach(product => {
      const categoryData = categoryMap.get(product.category);
      if (categoryData) {
        categoryData.items.push({
          productId: product.id,
          productName: product.name,
          totalQuantity: 0,
          totalRevenue: 0
        });
      }
    });

    // Process orders
    for (const order of orders) {
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          if (!item || item.kind !== "product" || !item.productId) continue;
          
          const product = productMap.get(item.productId);
          if (product) {
            const quantity = Number(item.qty) || 0;
            const revenue = product.price * quantity;
            
            const categoryData = categoryMap.get(product.category);
            if (categoryData) {
              const productItem = categoryData.items.find(i => i.productId === product.id);
              if (productItem) {
                productItem.totalQuantity += quantity;
                productItem.totalRevenue += revenue;
                categoryData.totalQuantity += quantity;
                categoryData.totalRevenue += revenue;
              }
            }
          }
        }
      }
    }

    // Filter out categories with no sales and sort items within each category
    return Array.from(categoryMap.values())
      .filter(category => category.totalQuantity > 0)
      .map(category => ({
        ...category,
        items: category.items
          .filter(item => item.totalQuantity > 0)
          .sort((a, b) => b.totalQuantity - a.totalQuantity)
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [orders, products]);

  const totalItemsSold = useMemo(() => {
    return categorySales.reduce((sum, category) => sum + category.totalQuantity, 0);
  }, [categorySales]);

  const totalRevenue = useMemo(() => {
    return categorySales.reduce((sum, category) => sum + category.totalRevenue, 0);
  }, [categorySales]);

  return (
    <div className="rounded-lg border border-black/10 p-4 bg-white">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">Items Sales by Category</h3>
          <p className="text-xs opacity-70">All items organized by category</p>
        </div>
        {loading && <span className="text-xs opacity-60">Loading…</span>}
        {error && !loading && (
          <span className="text-xs text-red-600">{error}</span>
        )}
      </div>

      {!loading && !error && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mt-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-semibold text-blue-600">{totalItemsSold}</div>
              <div className="text-xs text-blue-700">Total Items Sold</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">{inr.format(totalRevenue)}</div>
              <div className="text-xs text-green-700">Total Revenue</div>
            </div>
          </div>

          {/* Categories in Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorySales.map((category) => (
              <div key={category.category} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="mb-3">
                  <h4 className="font-semibold text-sm text-gray-800 capitalize">
                    {category.category}
                  </h4>
                  <div className="text-xs text-gray-600 mt-1">
                    {category.totalQuantity} items • {inr.format(category.totalRevenue)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {item.productName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.totalQuantity} units
                        </div>
                      </div>
                      <div className="text-xs font-medium text-green-600 ml-2">
                        {inr.format(item.totalRevenue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {categorySales.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-sm">No sales data available</div>
              <div className="text-xs mt-1">Items will appear here once orders are placed</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
