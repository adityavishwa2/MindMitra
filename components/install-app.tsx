"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { useInstallPrompt } from "@/components/pwa-install-context";
export function InstallApp() {
  const { prompt, clear } = useInstallPrompt();
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const onInstalled = () => {
      setInstalled(true);
    };
    queueMicrotask(() =>
      setInstalled(
        window.matchMedia("(display-mode: standalone)").matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      ),
    );
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return (
    <section className="card section-gap">
      <h2>Install MindMitra</h2>
      {installed ? (
        <p>MindMitra is running as an installed app.</p>
      ) : (
        <>
          <p>
            Add MindMitra to your home screen for quick access. On Chrome or
            Edge, use the install button when available or the browser’s Install
            app menu. On iPhone or iPad, open this site in Safari, tap Share,
            then Add to Home Screen.
          </p>
          {prompt && (
            <Button
              onClick={async () => {
                try {
                  await prompt.prompt();
                  const choice = await prompt.userChoice;
                  clear();
                  setMessage(
                    choice.outcome === "accepted"
                      ? "Installation requested."
                      : "You can install later from your browser menu.",
                  );
                } catch {
                  setMessage(
                    "Use your browser’s Install app or Add to Home Screen menu.",
                  );
                }
              }}
            >
              Install MindMitra
            </Button>
          )}
          <p>
            Installation requires HTTPS on the published site and a compatible
            browser. Signing in and loading papers requires an internet
            connection; the app does not download the full question library for
            offline use.
          </p>
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
