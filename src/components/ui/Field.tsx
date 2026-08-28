"use client";

import { useId, type ReactNode, type SelectHTMLAttributes } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "./cn";

const CONTROL =
  "w-full rounded-lg border bg-surface px-4 py-3 text-[0.95rem] text-ink placeholder:text-ink-faint " +
  "transition-colors duration-200 outline-none focus:border-ink";

interface FieldShellProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

function FieldShell({ label, htmlFor, error, hint, children, className }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-eyebrow text-ink-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[#8a3a2a]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

export function TextField({ label, error, hint, className, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(CONTROL, error ? "border-[#c08878]" : "border-line")}
        {...rest}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export function TextAreaField({ label, error, hint, className, ...rest }: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        rows={4}
        aria-invalid={Boolean(error)}
        className={cn(CONTROL, "resize-y", error ? "border-[#c08878]" : "border-line")}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children">;

export function SelectField({
  label,
  error,
  hint,
  className,
  options,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <select
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(CONTROL, "appearance-none pr-10", error ? "border-[#c08878]" : "border-line")}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236f6b60' stroke-width='1.5'><path d='m6 9 6 6 6-6'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 1rem center",
        }}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
