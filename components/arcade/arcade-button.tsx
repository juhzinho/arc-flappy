"use client"

import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes } from "react"

type NeonVariant = "green" | "pink" | "cyan" | "yellow"

interface ArcadeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NeonVariant
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
}

const variantStyles: Record<NeonVariant, string> = {
  green:
    "border-[var(--neon-green)] text-[var(--neon-green)] shadow-[0_0_8px_var(--neon-green),inset_0_0_8px_rgba(0,255,136,0.1)] hover:bg-[rgba(0,255,136,0.15)] hover:shadow-[0_0_16px_var(--neon-green),inset_0_0_16px_rgba(0,255,136,0.15)]",
  pink:
    "border-[var(--neon-pink)] text-[var(--neon-pink)] shadow-[0_0_8px_var(--neon-pink),inset_0_0_8px_rgba(255,0,170,0.1)] hover:bg-[rgba(255,0,170,0.15)] hover:shadow-[0_0_16px_var(--neon-pink),inset_0_0_16px_rgba(255,0,170,0.15)]",
  cyan:
    "border-[var(--neon-cyan)] text-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan),inset_0_0_8px_rgba(0,204,255,0.1)] hover:bg-[rgba(0,204,255,0.15)] hover:shadow-[0_0_16px_var(--neon-cyan),inset_0_0_16px_rgba(0,204,255,0.15)]",
  yellow:
    "border-[var(--neon-yellow)] text-[var(--neon-yellow)] shadow-[0_0_8px_var(--neon-yellow),inset_0_0_8px_rgba(255,204,0,0.1)] hover:bg-[rgba(255,204,0,0.15)] hover:shadow-[0_0_16px_var(--neon-yellow),inset_0_0_16px_rgba(255,204,0,0.15)]",
}

const sizeStyles: Record<"sm" | "md" | "lg", string> = {
  sm: "px-3 py-1.5 text-[8px]",
  md: "px-5 py-2.5 text-[10px]",
  lg: "px-8 py-4 text-xs",
}

export function ArcadeButton({
  variant = "green",
  size = "md",
  className,
  children,
  disabled,
  ...props
}: ArcadeButtonProps) {
  return (
    <button
      className={cn(
        "relative cursor-pointer border-2 bg-transparent font-sans uppercase tracking-wider transition-all duration-200",
        "active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
