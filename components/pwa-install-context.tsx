"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const Context = createContext<{
  prompt: InstallEvent | null;
  clear: () => void;
}>({ prompt: null, clear: () => {} });
export const useInstallPrompt = () => useContext(Context);
export function InstallPromptCapture({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const capture = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    const clear = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", clear);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", clear);
    };
  }, []);
  return (
    <Context.Provider value={{ prompt, clear: () => setPrompt(null) }}>
      {children}
    </Context.Provider>
  );
}
