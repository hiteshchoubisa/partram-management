export function normalizePhone(v: string | null | undefined) {
  return String(v ?? "").replace(/[^\d]/g, "");
}

export function isValidPhone10(v: string | null | undefined) {
  return /^\d{10}$/.test(normalizePhone(v));
}

type UsePhoneValidationOpts<T> = {
  value: string; // current form value (raw or digits)
  list: T[]; // items to check duplicates against
  getPhone: (item: T) => string | null | undefined;
  getId?: (item: T) => string | number | undefined;
  currentId?: string | number; // exclude when editing
};

export function usePhoneValidation<T>({
  value,
  list,
  getPhone,
  getId,
  currentId,
}: UsePhoneValidationOpts<T>) {
  const digits = normalizePhone(value);
  const valid = isValidPhone10(digits);

  const duplicate = list.some((item) => {
    const p = normalizePhone(getPhone(item));
    if (!p) return false;
    if (getId && currentId !== undefined) {
      if (getId(item) === currentId) return false;
    }
    return p === digits;
  });

  let error: string | undefined;
  if (!valid) error = "Enter 10 digit phone number.";
  else if (duplicate) error = "This phone number already exists.";

  return { digits, valid, duplicate, error };
}