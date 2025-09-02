"use client";

type Props = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (next: number) => void;
  className?: string;
};

export default function Pagination({ page, pageSize, totalItems, onPageChange, className }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null; // hide if not needed

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const goPrev = () => onPageChange(Math.max(1, page - 1));
  const goNext = () => onPageChange(Math.min(totalPages, page + 1));

  return (
    <div className={`mb-3 flex items-center justify-between text-sm ${className ?? ""}`}>
      <span className="text-gray-600 dark:text-gray-400">
        Showing {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={page === 1}
          className="rounded-md border px-2 py-1 disabled:opacity-50"
        >
          Prev
        </button>
        <span>
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={page === totalPages}
          className="rounded-md border px-2 py-1 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}