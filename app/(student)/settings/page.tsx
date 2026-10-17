import { Text } from "@/components/translation";
import { Heading } from "@/components/ui";
import { AccountActions } from "@/components/forms";
import { ThemeToggle } from "@/components/shell";
import Link from "next/link";
export default function Page() {
  return (
    <>
      <Heading
        eyebrow="YOUR SPACE, YOUR CHOICES"
        title="Make yourself comfortable."
        description="Manage your account, appearance, and privacy."
      />
      <div className="grid-2">
        <div className="card">
          <h3>
            <Text value="A little change of scenery" />
          </h3>
          <div className="spread">
            <p>
              <Text value="Switch between light and dark themes." />
            </p>
            <ThemeToggle />
          </div>
          <p>
            <Text value="Change your language and goals in" />{" "}
            <Link className="text-link" href="/profile">
              <Text value="your profile →" />
            </Link>
          </p>
          <p>
            <Text value="MindMitra respects your device’s reduced motion preference." />
          </p>
        </div>
        <div className="card">
          <h3>
            <Text value="Your account and data" />
          </h3>
          <p>
            <Text value="Export your private records or delete your account. Deletion cannot be undone." />
          </p>
          <AccountActions />
        </div>
      </div>
    </>
  );
}
