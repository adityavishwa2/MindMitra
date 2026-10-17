"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const LocaleContext = createContext({
  language: "en",
  setLanguage: (value: string) => {
    void value;
  },
  t: (en: string, hi: string) => {
    void hi;
    return en;
  },
});
export const useLocale = () => useContext(LocaleContext);
export function Providers({ children }: { children: ReactNode }) {
  const [query] = useState(() => new QueryClient());
  const [language, setLang] = useState("en");
  useEffect(() => {
    queueMicrotask(() => setLang(localStorage.getItem("mm-language") ?? "en"));
    document.documentElement.dataset.theme =
      localStorage.getItem("mm-theme") ?? "light";
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js");
  }, []);
  const setLanguage = useCallback((v: string) => {
    setLang(v);
    localStorage.setItem("mm-language", v);
    document.documentElement.lang = v;
  }, []);
  return (
    <SessionProvider>
      <QueryClientProvider client={query}>
        <LocaleContext.Provider
          value={{
            language,
            setLanguage,
            t: (en, hi) => (language === "hi" ? hi : en),
          }}
        >
          {children}
        </LocaleContext.Provider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
