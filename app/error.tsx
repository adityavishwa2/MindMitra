"use client";
import { Text } from "@/components/translation";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h2>
        <Text value="That step didn’t quite land." />
      </h2>
      <p>
        <Text value="We couldn’t load this page. Try again in a moment." />
      </p>
      <button className="button section-gap" onClick={reset}>
        <Text value="Try again" />
      </button>
    </div>
  );
}
