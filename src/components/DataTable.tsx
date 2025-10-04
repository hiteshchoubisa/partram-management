"use client";

import React from "react";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  accessor?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
};

export type RowAction<T> = {
  label: string;
  onClick: (row: T) => void;
  kind?: "default" | "danger" | "primary";
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T, index: number) => string;
  emptyMessage?: string;
  actions?: RowAction<T>[];
  // Mobile card renderer. If not provided, a default "label: value" list is shown.
  cardRenderer?: (row: T) => React.ReactNode;
  // Optional classNames
  tableClassName?: string;
  wrapperClassName?: string;
  // NEW: custom renderer for actions cell (use for icon-only actions)
  rowActionsRenderer?: (row: T, index: number) => React.ReactNode;
};

function btnClasses(kind: RowAction<any>["kind"]) {
  if (kind === "danger")
    return "rounded-md border border-red-300 text-red-600 px-3 py-1 text-xs hover:bg-red-50";
  if (kind === "primary")
    return "rounded-md bg-blue-600 text-white px-3 py-1 text-xs font-medium hover:bg-blue-700";
  return "rounded-md border border-black/10 px-3 py-1 text-xs hover:bg-black/[.04]";
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  emptyMessage = "No records found.",
  actions,
  cardRenderer,
  tableClassName,
  wrapperClassName,
  rowActionsRenderer,
}: Props<T>) {
  const hasActionsCol = Boolean((actions && actions.length > 0) || rowActionsRenderer);

  return (
    <div className={wrapperClassName ?? "w-full"}>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-black/10 p-4 text-center text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          rows.map((row, idx) => {
            const key = rowKey(row, idx);
            return (
              <div
                key={key}
                className={cardRenderer ? "" : "relative rounded-lg border border-black/10 bg-white p-3"}
              >
                {cardRenderer ? (
                  cardRenderer(row)
                ) : (
                  <div className="space-y-1 text-sm">
                    {columns.map((col) => (
                      <div key={col.key} className="text-gray-700">
                        <span className="text-xs uppercase tracking-wide opacity-70">
                          {typeof col.header === "string" ? col.header : col.key}:{" "}
                        </span>
                        <span className="font-medium">
                          {col.accessor ? col.accessor(row, idx) : (row as any)[col.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {(!cardRenderer && rowActionsRenderer) && (
                  <div className="mt-3 flex items-center justify-end gap-2">
                    {rowActionsRenderer(row, idx)}
                  </div>
                )}

                {(!cardRenderer && actions && actions.length > 0 && !rowActionsRenderer) && (
                  <div className="mt-3 flex items-center gap-2">
                    {actions.map((a, i) => (
                      <button key={i} type="button" onClick={() => a.onClick(row)} className={btnClasses(a.kind)}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border border-black/10">
          <table className={tableClassName ?? "min-w-full text-left text-sm w-full"}>
            <thead className="bg-black/[.04]">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-3 font-semibold ${col.headerClassName ?? ""}`}>
                    {col.header}
                  </th>
                ))}
                {hasActionsCol ? (
                  <th className="px-4 py-3 font-semibold w-[80px] text-right">{/* actions */}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={columns.length + (hasActionsCol ? 1 : 0)}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const key = rowKey(row, idx);
                  return (
                    <tr key={key} className="border-t border-black/5">
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                          {col.accessor ? col.accessor(row, idx) : (row as any)[col.key]}
                        </td>
                      ))}
                      {hasActionsCol ? (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {rowActionsRenderer
                              ? rowActionsRenderer(row, idx)
                              : actions!.map((a, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => a.onClick(row)}
                                    className={btnClasses(a.kind)}
                                  >
                                    {a.label}
                                  </button>
                                ))}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}