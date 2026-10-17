import { Brand } from "@/components/shell";
export default function Page() {
  return (
    <article className="legal">
      <Brand />
      <h1 className="section-gap">Your learning is personal.</h1>
      <p className="notice">
        Draft privacy notice. Owner and legal review are required before public
        registration.
      </p>
      <h2>What the application stores</h2>
      <p>
        When you use Google sign-in, MindMitra stores your basic profile, email,
        and account connection. It also stores your chosen preferences, practice
        answers, planner tasks, game results, bookmarks, and recorded watch
        sessions. It does not request Gmail, contacts, or Drive permissions.
      </p>
      <h2>Your choices</h2>
      <p>
        Profiles are private by default. You can export your data and
        permanently delete your account in Settings. Administrators review
        educational content. Learning scores are private; an optional
        contributor leaderboard displays your chosen alias and approved paper
        totals, never your email. You can change or clear your alias on the
        contribution page.
      </p>
      <h2>Paper contributions</h2>
      <p>
        Submitted files, source details and permission evidence are visible to
        you and administrators. Approved questions are published for practice.
        Review notes are shared with the uploader. Deleting your account removes
        your uploads and leaderboard credit; published papers retain their
        separate source and verification records. Administrators can view
        account information and aggregate learning activity to operate the
        service.
      </p>
      <h2>Providers and cookies</h2>
      <p>
        Authentication uses essential HTTP-only session cookies. Embedded videos
        load from YouTube’s privacy-enhanced domain only after you select Play
        and are governed by that provider’s policies. Device preferences and
        unsynced answers may use local storage.
      </p>
      <h2>Children and consent</h2>
      <p>
        Public registration must remain closed until the operator establishes
        the applicable age, parental consent, notice, and deletion procedures
        for its audience. This build does not yet implement a parental-consent
        service.
      </p>
      <h2>Retention and contact</h2>
      <p>
        The operator must publish its identity, privacy contact, retention
        periods, backup deletion schedule, hosting regions, and incident process
        before launch. No operational contact has been configured.
      </p>
    </article>
  );
}
