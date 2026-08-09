"use client";

import { Download } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

/** Dropdown item that only renders once the browser offers a real install prompt, and hides itself once installed. */
export function InstallPwaButton() {
  const { canInstall, promptToInstall } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <DropdownMenuItem
      onSelect={async (e) => {
        e.preventDefault();
        await promptToInstall();
      }}
    >
      <Download className="size-4" /> Install App
    </DropdownMenuItem>
  );
}
