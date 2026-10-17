"use client";
import { Button as BaseButton } from "./ui/button";
import { Text } from "./translation";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import type { ReactNode } from "react";
export function Button({
  children,
  href,
  secondary = false,
  ...props
}: {
  children: ReactNode;
  href?: string;
  secondary?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const c = `button ${secondary ? "secondary" : ""}`;
  return href ? (
    <BaseButton asChild className={c}>
      <Link href={href}>{children}</Link>
    </BaseButton>
  ) : (
    <BaseButton className={c} {...props}>
      {children}
    </BaseButton>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="icon-box">
        <BookOpen size={24} />
      </span>
      <h3>
        <Text value={title} />
      </h3>
      <p>{children}</p>
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="page-heading">
      <span className="eyebrow">
        <Text value={eyebrow} />
      </span>
      <h1>
        <Text value={title} />
      </h1>
      <p>
        <Text value={description} />
      </p>
    </header>
  );
}
export function FeatureCard({
  icon,
  title,
  text,
  href,
  color = "purple",
}: {
  icon: ReactNode;
  title: string;
  text: string;
  href: string;
  color?: string;
}) {
  return (
    <Link href={href} className={`card feature ${color}`}>
      <div className="spread">
        <span className="icon-box">{icon}</span>
        <ArrowUpRight size={19} />
      </div>
      <h3>
        <Text value={title} />
      </h3>
      <p>
        <Text value={text} />
      </p>
    </Link>
  );
}
