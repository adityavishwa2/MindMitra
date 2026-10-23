# Hide or delete papers

In **Content Studio → Review papers**, open the **Published** tab. Each paper has **Hide from students** and **Delete paper** controls. The same controls appear on the individual review page and in **Paper library**. Pending/rejected uploads also have Delete paper.

- **Hide from students** removes the paper from the student practice catalogue and prevents new attempts. The paper, questions, previous attempts and results remain stored. Linked submissions move to the Unpublished tab, so they stop receiving contributor credit.
- **Delete paper** requires explicit confirmation and permanently removes a paper and its linked upload/review submission. Pending uploads can also be deleted. Conversion workers cannot restore a deleted submission.
- Papers with existing practice sessions cannot be permanently deleted through this control. The interface explains that Hide should be used to preserve learner history. Audit records and shared source evidence remain retained.

Only administrators can perform these actions. Requests check authentication and request origin, and decisions are audited. This change requires no schema migration. Keep your .env and database when installing the updated source and restart the application.

Verification: production build, TypeScript and ESLint passed. Browser/database checks cover hiding, confirmation-based deletion, preservation of practice history, rejection of deletion with existing attempts, and student/cross-origin access rejection.
