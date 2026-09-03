"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";

export type ActionState = { ok: true; data?: unknown } | { ok: false; error: string } | null;

/**
 * Thin wrapper around a server action: renders the fields, the submit button
 * and the resulting success/error message. Keeps admin forms declarative.
 */
export function ActionForm({
  action,
  submitLabel,
  successMessage,
  children,
  className,
  size = "md",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  successMessage?: string | ((data: unknown) => string);
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      {children}

      {state && state.ok === false ? <p className="mt-3 text-sm text-red-700">{state.error}</p> : null}
      {state && state.ok === true && successMessage ? (
        <p className="mt-3 text-sm text-emerald-700">
          {typeof successMessage === "function" ? successMessage(state.data) : successMessage}
        </p>
      ) : null}

      <Button type="submit" size={size} className="mt-4" disabled={pending}>
        {pending ? "Lagrer…" : submitLabel}
      </Button>
    </form>
  );
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  step,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  step?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? undefined}
        className="field mt-1.5"
      />
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 6,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue ?? undefined}
        className="field mt-1.5 font-mono text-sm"
      />
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      <select name={name} defaultValue={defaultValue} className="field mt-1.5">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-navy-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-navy-900" />
      {label}
    </label>
  );
}
