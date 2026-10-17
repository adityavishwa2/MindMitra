import { Brand } from "@/components/shell";
export default function Page() {
  return (
    <article className="legal">
      <Brand />
      <h1 className="section-gap">A thoughtful place to learn.</h1>
      <p className="notice">
        Draft terms. Obtain legal review and configure the operator’s identity
        and contact before public launch.
      </p>
      <h2>Educational use</h2>
      <p>
        MindMitra is an independent learning application, not an examination
        authority. No exam result, selection, or medical improvement is
        guaranteed. Brain games are recreational.
      </p>
      <h2>Question sources</h2>
      <p>
        Questions are published only after source and reuse review. Collection
        availability is limited to the actual published inventory. Original
        sources and answer-key statuses are shown. Report disputed material to
        the operator once contact details are configured.
      </p>
      <h2>Respectful use</h2>
      <p>
        Do not attempt to access another person’s private records, impersonate
        users, circumvent access controls, or upload material without
        authorization.
      </p>
      <h2>Availability and corrections</h2>
      <p>
        Content and services may be corrected or withdrawn. Account deletion and
        export tools are provided. Hosting, support, legal jurisdiction, and
        applicable user rights must be finalized by the operator before public
        use.
      </p>
    </article>
  );
}
