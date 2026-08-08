"use client";

import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

type CapsuleIconButtonProps<T extends ElementType> = {
  as?: T;
  icon: ElementType;
  label: string;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

/** Icon-only button that expands into a labeled capsule on hover, focus, or touch. */
export function CapsuleIconButton<T extends ElementType = "button">({
  as,
  icon: Icon,
  label,
  className,
  ...props
}: CapsuleIconButtonProps<T>) {
  const Comp = (as ?? "button") as ElementType;
  const extra = as ? {} : { type: "button" };

  return (
    <Comp
      aria-label={label}
      className={cn(
        "group inline-flex h-8 max-w-8 items-center gap-1.5 overflow-hidden rounded-full px-2 text-muted-foreground transition-all duration-300 ease-out",
        "hover:max-w-40 hover:bg-accent hover:px-3 hover:text-accent-foreground",
        "focus-visible:max-w-40 focus-visible:bg-accent focus-visible:px-3 focus-visible:text-accent-foreground focus-visible:outline-none",
        "active:max-w-40 active:bg-accent active:px-3 active:text-accent-foreground",
        className,
      )}
      {...extra}
      {...props}
    >
      <Icon className="size-4 shrink-0" />
      <span
        className={cn(
          "max-w-0 overflow-hidden text-xs font-medium whitespace-nowrap opacity-0 transition-all duration-300",
          "group-hover:max-w-32 group-hover:opacity-100",
          "group-focus-visible:max-w-32 group-focus-visible:opacity-100",
          "group-active:max-w-32 group-active:opacity-100",
        )}
      >
        {label}
      </span>
    </Comp>
  );
}
