"use client";

type Props = {
  phone?: string | null;
  className?: string;
};

export default function PhoneCell({ phone, className }: Props) {
  if (!phone) return <span>-</span>;
  const tel = String(phone).replace(/[^+\d]/g, "");
  return (
    <a href={`tel:${tel}`} className={className ?? "text-blue-600 hover:underline"}>
      {phone}
    </a>
  );
}