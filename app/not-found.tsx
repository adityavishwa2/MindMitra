import { Text } from "@/components/translation";
import Link from "next/link";
export default function Page() {
  return (
    <div className="auth-page">
      <span className="big-spark">✧</span>
      <h1>
        <Text value="A little off the path." />
      </h1>
      <p>
        <Text value="This page isn’t available, or it doesn’t belong to your account." />
      </p>
      <Link className="button" href="/dashboard">
        <Text value="Back to your learning space" />
      </Link>
    </div>
  );
}
