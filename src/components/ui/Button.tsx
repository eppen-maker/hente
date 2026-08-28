import Link from "next/link";
import type { Route } from "next";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium tracking-tight " +
  "transition-[background-color,color,border-color,transform,box-shadow] duration-200 ease-out " +
  "disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-px select-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-canvas rounded-md hover:bg-ink-soft shadow-soft hover:shadow-lift",
  secondary:
    "bg-transparent text-ink rounded-md border border-line-strong hover:border-ink hover:bg-sand/50",
  ghost: "bg-transparent text-ink rounded-md hover:bg-sand/70",
  inverse:
    "bg-canvas text-ink rounded-md hover:bg-white shadow-soft",
  link:
    "text-ink underline decoration-line-strong underline-offset-[6px] hover:decoration-ink px-0",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[0.95rem]",
  lg: "h-13 px-8 text-base",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  fullWidth?: boolean;
}

function classes({ variant = "primary", size = "md", fullWidth, className }: CommonProps) {
  return cn(
    BASE,
    VARIANTS[variant],
    variant === "link" ? "h-auto" : SIZES[size],
    fullWidth && "w-full",
    className,
  );
}

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function Button({
  variant,
  size,
  className,
  fullWidth,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classes({ variant, size, fullWidth, className, children })}
      {...rest}
    >
      {children}
    </button>
  );
}

interface ButtonLinkProps extends CommonProps {
  href: Route | string;
  prefetch?: boolean;
  target?: string;
  rel?: string;
  onClick?: () => void;
  "aria-label"?: string;
}

export function ButtonLink({
  href,
  variant,
  size,
  className,
  fullWidth,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      href={href as Route}
      className={classes({ variant, size, fullWidth, className, children })}
      {...rest}
    >
      {children}
    </Link>
  );
}
