"use client";
import { useLocale } from "./providers";
import { translate } from "@/lib/i18n";
export function Text({ value }: { value: string }) {
  const { language } = useLocale();
  return <>{` ${translate(value, language)} `}</>;
}
