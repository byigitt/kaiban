import type { HTMLAttributes } from "react";
import { TbLayoutKanban } from "react-icons/tb";

import { cn } from "@/lib/utils";

export interface AppIconProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

export function AppIcon({
  className,
  size = 28,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
  ...props
}: AppIconProps) {
  const isDecorative = ariaLabel == null || ariaLabel.length === 0;

  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-2 text-primary-foreground shadow-sm ring-1 ring-inset ring-primary/30",
        className
      )}
      aria-label={ariaLabel}
      aria-hidden={isDecorative ? "true" : ariaHidden}
      role={isDecorative ? undefined : "img"}
    >
      <TbLayoutKanban size={size} aria-hidden="true" focusable="false" />
    </span>
  );
}
