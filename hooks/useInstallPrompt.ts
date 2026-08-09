"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own standalone flag — not covered by the media query above.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Tracks the browser's native install prompt: null until installable, cleared once installed. */
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptToInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };

  return { canInstall: !!prompt, promptToInstall };
}
