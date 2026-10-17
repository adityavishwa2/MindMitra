import { Text } from "@/components/translation";
import { Brand, LanguageToggle } from "@/components/shell";
import { GoogleButton } from "@/components/login";
import Link from "next/link";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="auth-page">
      <div className="row">
        <Brand />
        <LanguageToggle />
      </div>
      <div className="auth-card">
        <span className="big-spark">✦</span>
        <span className="eyebrow">
          <Text value="YOUR NEXT CHAPTER STARTS HERE" />
        </span>
        <h1>
          <Text value="A little closer" />
          <br />
          <Text value="to your goals." />
        </h1>
        <p>
          <Text value="Welcome to your space to learn, recharge, and grow. We’re glad you’re here." />
        </p>
        {error && (
          <p className="notice" role="alert">
            <Text value="Sign-in didn’t finish. Please try again. Only verified Google accounts are supported." />
          </p>
        )}
        <GoogleButton
          configured={
            !!(
              process.env.GOOGLE_CLIENT_ID &&
              process.env.GOOGLE_CLIENT_SECRET &&
              process.env.NEXTAUTH_SECRET
            )
          }
        />
        <small>
          <Text value="Only your basic profile and email. No access to your Gmail, contacts, or Drive." />
        </small>
        <p className="fine-print">
          <Text value="By continuing, you agree to our" />
          <Link href="/terms">
            <Text value="Terms" />
          </Link>
          <Text value="and" />{" "}
          <Link href="/privacy">
            <Text value="Privacy notice" />
          </Link>
          .
        </p>
      </div>
      <Link href="/">
        <Text value="← Back to MindMitra" />
      </Link>
    </div>
  );
}
