"use client";
import { Text } from "@/components/translation";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "./ui";
export function GoogleButton({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        disabled={!configured || busy}
        onClick={() => {
          setBusy(true);
          signIn("google", { callbackUrl: "/onboarding" });
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.4ZM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H3v2.6A10 10 0 0 0 12 22ZM6.3 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.3-2.6ZM12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.5l3.3 2.6A6 6 0 0 1 12 5.9Z"
          />
        </svg>
        {busy ? "Connecting…" : "Continue with Google"}
      </Button>
      {!configured && (
        <p className="notice">
          <Text value="Google sign-in needs OAuth credentials in the server environment. See the setup guide in the repository." />
        </p>
      )}
    </>
  );
}
