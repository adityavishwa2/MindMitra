import { Text } from "@/components/translation";
import Link from "next/link";
export default function Page() {
  return (
    <div className="auth-page">
      <span className="big-spark">☁</span>
      <h1>
        <Text value="A little pause in the connection." />
      </h1>
      <p>
        <Text value="Reconnect to continue. Private exam pages and question content are never cached by the service worker." />
      </p>
      <Link className="button" href="/dashboard">
        <Text value="Try your learning space again" />
      </Link>
    </div>
  );
}
