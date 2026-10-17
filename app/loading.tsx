import { Text } from "@/components/translation";
export default function Loading() {
  return (
    <div
      className="main-content"
      role="status"
      aria-label="Loading your learning space"
    >
      <div
        className="card"
        style={{ minHeight: 200, background: "var(--lavender)" }}
      />
      <div className="metrics">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="card" style={{ height: 110 }} />
        ))}
      </div>
      <p>
        <Text value="Getting your space ready…" />
      </p>
    </div>
  );
}
