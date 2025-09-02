import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export default function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const base =
    className ??
    "w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-blue-500/50";

  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={base} />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}