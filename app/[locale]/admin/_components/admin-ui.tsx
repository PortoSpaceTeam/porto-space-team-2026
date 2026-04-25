"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DialogContent } from "@/components/ui/dialog";
import { AlertDialogContent } from "@/components/ui/alert-dialog";
import { TabsList } from "@/components/ui/tabs";

type DialogContentProps = React.ComponentProps<typeof DialogContent>;

export function AdminDialogContent({
  className,
  size = "md",
  ...props
}: DialogContentProps & { size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-3xl",
  };
  return (
    <DialogContent
      className={cn(
        "w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden",
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

type AlertContentProps = React.ComponentProps<typeof AlertDialogContent>;

export function AdminAlertDialogContent({
  className,
  ...props
}: AlertContentProps) {
  return (
    <AlertDialogContent
      className={cn(
        "w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden",
        className
      )}
      {...props}
    />
  );
}

type TabsListProps = React.ComponentProps<typeof TabsList>;

export function AdminTabsList({ className, ...props }: TabsListProps) {
  return (
    <div className="w-full max-w-full overflow-x-auto">
      <TabsList className={cn("w-max min-w-full", className)} {...props} />
    </div>
  );
}

export function AdminTableShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-w-0 w-full rounded-none border bg-card overflow-hidden",
        className
      )}
    >
      <div className="w-full overflow-x-auto">{children}</div>
    </div>
  );
}
