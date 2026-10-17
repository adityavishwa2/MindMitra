# MASTER DEVELOPMENT PROMPT FOR CHATGPT CODEX

## Project: MindMitra — Learn, Play, Grow

### YOUR ROLE

You are an expert full-stack software engineer, senior UI/UX designer, educational technology architect, database engineer, security engineer, and game developer.

Your responsibility is to design, develop, test, and prepare a complete, production-quality educational web application called **MindMitra**.

Do not simply create a concept, wireframe, landing page, or static prototype. Build a working full-stack application with functional authentication, databases, quizzes, games, progress tracking, educational videos, and an administration system.

The platform should be intuitive enough for a first-time smartphone user, visually engaging enough to attract younger students, and powerful enough to support serious competitive examination preparation.

Use clean architecture, maintainable code, reusable components, secure defaults, and modern development practices.

If an existing repository is provided, inspect it first and integrate your work without destroying unrelated existing functionality.

## 1. PRODUCT VISION

**MindMitra — Learn Smarter. Play Happier. Grow Every Day.**

Create an all-in-one educational ecosystem for Indian students preparing for competitive examinations.

The application must solve three problems:

**Problem 1: Traditional exam preparation becomes exhausting.**

Students often spend hours solving questions. When they feel mentally tired, they switch to Instagram Reels, YouTube Shorts, or other entertainment platforms and lose their study momentum.

**Solution:** Provide entertaining, animated mini-games and puzzles inside the educational platform. Students should be able to take short, enjoyable breaks without switching applications.

**Problem 2: Students need a trustworthy previous-year question practice platform.**

Many quiz applications mix genuine previous-year questions with generated or unrelated questions without proper identification.

**Solution:** Build a dedicated competitive examination section containing only authentic, traceable previous-year examination questions. Every question must belong to the examination, year, paper, and shift stated in its metadata.

**Problem 3: Students struggle to track what they have completed.**

**Solution:** Build intelligent progress dashboards showing papers completed, examination years attempted, remaining questions, accuracy, weak subjects, time spent practicing, and long-term improvement.

The entire product should promote healthy learning habits, meaningful relaxation, consistency, and confidence.

## 2. REQUIRED TECHNOLOGY STACK

Build a full-stack TypeScript application using modern, stable, supported versions of the following technologies.

### Frontend

- Next.js with App Router.
- React and TypeScript.
- Tailwind CSS.
- shadcn/ui with accessible Radix-based components.
- Framer Motion or Motion for delightful animations.
- Lucide icons.
- Recharts for analytics and reporting.
- Zustand or a similarly lightweight solution for local interactive state.
- TanStack Query where beneficial for server state.
- React Hook Form and Zod for validated forms.

### Backend

- Next.js route handlers and server-side services.
- PostgreSQL relational database.
- Prisma ORM with migrations.
- Auth.js with Google OAuth authentication.
- Secure server-side input validation and authorization.
- Background processing for document imports, video metadata refreshes, and large data jobs when necessary.

### Additional capabilities

- PWA support for home-screen installation.
- Responsive layouts for phones, tablets, laptops, and desktop computers.
- Cloud-compatible asset storage.
- YouTube embed integration or another legally authorized video provider.
- Email-free, password-free sign-in using Google.
- Reliable analytics calculated from actual user activity.

Prefer an architecture that can initially run at low cost, with a clear upgrade path as the user base increases.

Avoid expensive mandatory AI APIs and paid services where equivalent functionality can be implemented reliably without them.

Keep secrets in environment variables and provide a `.env.example` file.

Verify library APIs against current official documentation rather than relying on outdated examples.

## 3. VISUAL DESIGN AND UI/UX

The interface is one of the highest priorities.

I want a visually exceptional product that combines the professional cleanliness of a modern learning platform with the friendly, delightful interactions of a premium casual game.

The website must never feel like an overcrowded government exam portal.

### Design direction

Use a visual style combining:

- Premium educational technology.
- Soft gradients.
- Rounded cards and buttons.
- Playful but sophisticated illustrations.
- Subtle shadows.
- Smooth animations.
- Clear typography.
- Comfortable spacing.
- High readability.
- Minimal visual clutter.

### Recommended color palette

Create a beautiful, consistent design system using this starting palette:

| Role           | Color                     |
| -------------- | ------------------------- |
| Primary        | #6558F5 — Vibrant Indigo  |
| Secondary      | #14B8A6 — Fresh Teal      |
| Accent         | #FFB86B — Warm Apricot    |
| Highlight      | #FB7185 — Soft Coral      |
| Background     | #F8FAFF — Very Light Blue |
| Surface        | #FFFFFF — White           |
| Primary Text   | #17213D — Deep Navy       |
| Secondary Text | #64748B — Slate           |
| Success        | #16A34A                   |
| Warning        | #F59E0B                   |
| Error          | #DC2626                   |

These are starting values, not an excuse to overuse bright colors. Refine the palette professionally for harmonious contrast, WCAG accessibility, and a polished appearance.

Also create a complete dark mode with appropriately adjusted contrast.

### Typography

Use a modern font such as Inter, Plus Jakarta Sans, or another comparable font with appropriate Hindi-script support.

Use clear visual hierarchy:

- Large welcoming headings.
- Readable examination question text.
- High-contrast option selections.
- Simple dashboard metrics.
- Large touch targets.
- Comfortable line spacing.

### Buttons and animations

Every major interactive element should feel responsive and polished.

Implement:

- Hover elevation for cards.
- Subtle button press scaling.
- Animated progress indicators.
- Soft page transitions.
- Animated navigation indicators.
- Correct-answer feedback animations.
- Achievement celebrations using lightweight particles or confetti.
- Animated game cards.
- Loading skeletons.
- Smooth modal transitions.
- Gentle hover gradients.
- Meaningful micro-interactions.

Animations should be fast, smooth, purposeful, and never interfere with reading or answering questions.

Respect the operating system's reduced-motion preference. Keep animations performant on budget Android devices.

### Navigation

Desktop layout:

- Collapsible sidebar.
- Top search and profile bar.
- Spacious dashboard.
- Clear navigation hierarchy.

Mobile layout:

- Bottom navigation bar.
- Large touch-friendly buttons.
- Full-screen games when appropriate.
- Sticky quiz controls.
- Easy access to Home, Study, Play, Watch, and Profile.

Tablet layout:

- Adaptive two-column or three-column layouts.
- Responsive navigation that makes use of available space.
- Proper portrait and landscape support.

The app must look purpose-built for every screen size, rather than merely shrinking the desktop interface.

## 4. MAIN APPLICATION STRUCTURE

Create these primary sections:

1. Home Dashboard
2. Competitive Exam Preparation
3. Brain Games
4. Puzzles and Challenges
5. Educational Short Videos
6. Progress and Analytics
7. Student Profile
8. Study Planner
9. Settings
10. Admin Dashboard

All sections must be functional and integrated with a shared user account.

## 5. LANDING PAGE

Create a beautiful public landing page.

The page should communicate the application's value immediately.

### Hero section

Main heading:

**Study Hard. Play Smart. Grow Every Day.**

Supporting description:

"Prepare for India's competitive exams with genuine previous-year questions, sharpen your thinking with fun brain games, and take refreshing breaks with meaningful educational content."

Provide two prominent actions:

- Get Started with Google
- Explore Features

### Additional landing page sections

Include:

- Animated product preview.
- Competitive examinations overview.
- Interactive demonstration of brain games.
- Progress analytics preview.
- Educational video experience.
- How the Learn → Play → Grow cycle works.
- Benefits of practicing genuine previous-year questions.
- Responsive previews for mobile and desktop.
- FAQ.
- Footer with privacy policy, terms, contact, and legal notices.

Do not create misleading statistics, fabricated student reviews, or fictional testimonials.

## 6. AUTHENTICATION AND STUDENT ONBOARDING

### Mandatory Google sign-in

Students must sign in using their Google account.

Use Google OAuth through a secure supported authentication solution.

Do not implement password-based login, phone OTP, or alternative social logins.

The login interface should have one primary option:

**Continue with Google**

Requirements:

- Server-side OAuth validation.
- Secure HTTP-only session cookies.
- CSRF and OAuth state protection.
- Appropriate redirect validation.
- Account persistence.
- Proper session expiration and refresh handling.
- Logout from all relevant application sessions.
- Avoid collecting unnecessary Google permissions.
- Never request access to Gmail, contacts, or Drive.

### First-time onboarding

After successful first sign-in, show an attractive, skippable multi-step onboarding experience.

Ask the student for:

- Preferred display name.
- Preferred interface language: English or Hindi.
- Target competitive examination.
- Optional target examination year or date.
- Optional daily study goal.
- Preferred study reminder settings.

Allow multiple target exams, with one primary exam.

Save onboarding preferences securely.

Do not require sensitive information such as government identity numbers, home addresses, caste, or financial details.

### Student profile

Each student should have:

- Google profile image.
- Display name.
- Preferred language.
- Target examinations.
- Account creation date.
- Study goals.
- Streaks and achievements.
- Completed papers.
- Saved questions.
- Game statistics.
- Video bookmarks.
- Account data export and deletion options.

Use private-by-default student accounts.

## 7. COMPETITIVE EXAMINATION PREPARATION

This is the most academically important part of the platform.

Create an extensible examination directory that can eventually support competitive examinations conducted across India.

### Initial examination catalog

**SSC examinations**

- SSC CGL
- SSC CHSL
- SSC MTS
- SSC CPO
- SSC GD Constable
- SSC JE
- SSC Stenographer
- SSC Selection Post
- Other SSC examinations

**Railway examinations**

- RRB NTPC
- RRB Group D
- RRB ALP
- RRB Technician
- RRB JE
- RRB Paramedical
- RPF Constable
- RPF SI
- Other railway recruitment examinations

**UPSC examinations**

- UPSC Civil Services Preliminary Examination
- UPSC Civil Services Main Examination
- UPSC NDA
- UPSC CDS
- UPSC CAPF
- UPSC Engineering Services
- UPSC Combined Medical Services
- UPSC Indian Forest Service
- Other UPSC examinations

**Banking and finance**

- IBPS PO
- IBPS Clerk / Customer Service Associate
- IBPS SO
- IBPS RRB PO
- IBPS RRB Office Assistant
- SBI PO
- SBI Clerk
- RBI Grade B
- RBI Assistant
- NABARD Grade A
- Insurance-sector recruitment examinations

**Teaching examinations**

- CTET
- UPTET
- Other state TET examinations
- KVS recruitment
- NVS recruitment
- DSSSB teaching examinations
- State teacher recruitment examinations

**Engineering and entrance examinations**

- JEE Main
- JEE Advanced
- NEET UG
- GATE
- CUET
- CLAT
- CAT
- Other supported entrance examinations

**State government examinations**

- UPPSC
- BPSC
- MPPSC
- RPSC
- MPSC
- WBPSC
- State police recruitment
- State subordinate service commissions
- State-specific recruitment examinations

Design the database so additional examination bodies and individual examinations can be added through the admin dashboard without changing application code.

Do not treat this initial catalog as a claim that authentic papers are already available for every listed exam.

### Examination discovery UI

Each examination should have an attractive card showing:

- Examination name.
- Conducting authority.
- Subject categories.
- Available previous-year papers.
- Earliest and latest verified available years.
- Number of verified questions.
- Student's completion progress.
- Continue Practice button.

Provide:

- Search.
- Examination category filters.
- State filters where applicable.
- Favorites.
- Recently practiced exams.
- Quick resume.

## 8. STRICT PREVIOUS-YEAR QUESTION POLICY

**This requirement is non-negotiable.**

The actual competitive examination quiz bank must contain exclusively authentic previous-year questions.

Do not generate examination questions using AI and present them as previous-year questions.

Do not invent previous-year questions.

Do not use generic practice problems and label them as authentic examination questions.

Do not mislabel the year, date, paper, tier, stage, or shift.

### Question provenance

Store at least the following metadata for every question:

- Unique question ID.
- Examination authority.
- Examination name.
- Year.
- Examination date, where known.
- Shift or session, where applicable.
- Tier, stage, or paper type.
- Subject.
- Topic and subtopic.
- Original question number.
- Original question text.
- Original options, when applicable.
- Question type.
- Language.
- Official answer, if available.
- Answer verification status.
- Explanation, if separately available and verified.
- Source URL.
- Source document identifier.
- Source page number, if applicable.
- Source document checksum.
- Licensing or reuse-permission status.
- Import date.
- Verification date.
- Reviewer or verification audit record.

Only expose questions in real exam practice after verification and appropriate reuse authorization.

Keep original questions faithful to their sources. Preserve symbols, diagrams, formulas, option ordering, and relevant instructions.

### Obtaining previous-year question papers

Prioritize official examination authority resources.

For example, UPSC provides a previous-question-papers portal:

https://www.upsc.gov.in/examinations/previous-question-papers

Research equivalent official sources for other examinations.

Implement import infrastructure capable of supporting:

- Official PDFs.
- Authorized examination paper datasets.
- Rights-cleared licensed collections.
- Admin-uploaded documents.
- Structured CSV imports.
- Structured JSON imports.
- Human-verified question and answer entry.

Do not bypass authentication, CAPTCHAs, access controls, anti-bot restrictions, or licensing protections to retrieve papers.

Public availability does not automatically mean unrestricted republication is permitted. Check reuse rights and obtain permission or use an authorized source where required.

If the platform is not authorized to republish a paper, retain permissible metadata and link students to its official source rather than reproducing the content.

### Comprehensive historical coverage

The long-term objective is to include **all obtainable and authorized previous-year papers** for each supported examination, across all available years, shifts, and tiers.

Implement a scalable collection and ingestion system rather than hard-coding a small fixed year range.

Track historical papers even if they are currently unavailable.

Possible paper statuses:

- Not yet sourced.
- Source identified.
- Awaiting reuse permission.
- Import pending.
- Parsing.
- Awaiting verification.
- Partially verified.
- Fully verified.
- Published.
- Unavailable.

Expose genuine collection completeness transparently.

Do not display "All Years Available" or "100% PYQs" unless that assertion is supported by a comprehensive, verified inventory.

If real paper data cannot be obtained during development, complete the application infrastructure and clearly label the affected exam content as pending. Do not seed fictional PYQs to make the interface appear complete.

### Paper extraction and verification

Build a reliable admin-assisted ingestion pipeline.

Process:

1. Register source document.
2. Verify source provenance and reuse rights.
3. Parse text, tables, diagrams, and question numbering.
4. Use OCR only where necessary.
5. Flag ambiguous extraction.
6. Detect missing options, duplicate questions, and incorrect numbering.
7. Validate extracted questions against the original source.
8. Attach official answer keys when available.
9. Allow manual review and correction.
10. Publish only approved questions.

Support mathematical expressions using KaTeX or an appropriate equivalent.

Support source diagrams and figures where legally permitted.

Questions with disputed, revised, or unavailable answers must display their verification status and must not be scored as definitively correct without a reliable key.

## 9. QUIZ AND MOCK TEST ENGINE

Build a polished, examination-focused practice experience.

### Quiz selection

A student should be able to choose:

**Exam → Year → Stage/Tier → Shift/Paper → Practice Mode**

Example:

SSC CGL → 2023 → Tier I → Available Shift → Start Practice

Provide filters for:

- Year.
- Subject.
- Topic.
- Shift.
- Difficulty tags, if verified or transparently marked as editorial.
- Solved and unsolved questions.
- Incorrectly attempted questions.
- Bookmarked questions.

### Quiz modes

Create the following modes:

**Full Previous-Year Paper**

Reproduce the appropriate examination structure using verified available questions and authentic paper metadata.

**Subject Practice**

Practice verified historical questions from a selected subject.

**Topic Practice**

Practice verified historical questions by topic.

**Timed Practice**

Practice with a configurable timer.

**Untimed Practice**

Practice without pressure.

**Revision Mode**

Revisit incorrect, skipped, and bookmarked questions.

**Custom Practice**

Choose a set size, year range, topic, and exam.

**Daily PYQ Challenge**

Select a short collection exclusively from authentic verified previous-year questions.

Daily challenges must never contain newly invented questions.

### Quiz interface

Create a distraction-free full-screen-capable layout.

Display:

- Examination name.
- Year and paper metadata.
- Question number.
- Progress indicator.
- Timer when applicable.
- Question content.
- Answer options.
- Clear selection state.
- Mark for Review.
- Previous Question.
- Next Question.
- Clear Response.
- Submit.

For practice sessions, allow explanations after answering when reliable explanations exist.

For actual exam simulation, follow examination-appropriate scoring and reveal results at the correct stage.

Make negative marking configurable by examination and examination year.

Never assume every Indian examination follows the same marking rules.

For descriptive examinations such as UPSC Mains, support question reading, answer writing, self-assessment, and review rather than pretending all descriptive responses can be accurately auto-scored.

### Session persistence

Automatically save:

- Selected answers.
- Skipped questions.
- Review flags.
- Elapsed time.
- Current question.
- Submission state.

If the browser refreshes or the student loses internet connectivity, recover the permitted session state.

Avoid duplicate submissions and duplicate progress counting.

## 10. QUIZ RESULTS AND EXPLANATIONS

After submission, show a detailed results experience.

Include:

- Raw and adjusted score, where applicable.
- Correct answers.
- Incorrect answers.
- Unattempted questions.
- Accuracy.
- Time taken.
- Average time per question.
- Subject-wise performance.
- Topic-wise performance.
- Official answer-key reference where available.
- Review Questions button.
- Retry Incorrect Questions button.
- Return to Dashboard button.

Explanations should be clearly distinguished from the original examination question.

Allow vetted editorial explanations with supporting reasoning.

Do not silently alter historical question text to match an explanation.

Display any answer-key corrections or disputes transparently.

## 11. STUDENT PROGRESS AND ANALYTICS

Create a professional, visually engaging, personalized analytics dashboard.

### Main overview

Display:

- Total verified PYQs attempted.
- Unique PYQs attempted.
- Total correctly answered.
- Overall accuracy.
- Current study streak.
- Longest study streak.
- Total focused study time.
- Completed full papers.
- Recent mock test results.
- Weekly and monthly improvement.

### Examination-wise analytics

For each chosen exam, show:

- Available verified years.
- Years attempted.
- Years fully completed.
- Questions attempted per year.
- Questions remaining per year.
- Shifts or papers completed.
- Subject-wise accuracy.
- Incorrect-answer counts.
- Attempt history.

### Previous-year completion tracker

This is a particularly important feature.

Example:

**SSC CGL Previous-Year Progress**

| Year | Verified PYQs Attempted | Paper Progress |
| ---- | ----------------------- | -------------- |
| 2024 | 80 / 100                | 80%            |
| 2023 | 100 / 100               | 100%           |
| 2022 | 45 / 100                | 45%            |
| 2021 | 0 / 100                 | 0%             |

The values here are illustrative UI examples only, not real paper inventories.

In the running app, use actual counts from the verified collection.

Multiple shifts must be accounted for. A year must not be marked fully completed merely because the student completed one paper when other verified papers from that year remain.

Separately display:

- Years touched.
- Years fully completed within the verified collection.
- Full papers completed.
- Outstanding papers.
- Collection coverage limitations.

Clearly distinguish student completion from source collection completeness.

### Visual reports

Use charts for:

- Daily study activity.
- Weekly accuracy.
- Monthly accuracy.
- Subject-wise performance.
- Year-wise paper completion.
- Time allocation.
- Improvements across attempts.

Use attractive donut charts, line charts, heatmaps, progress rings, and bar charts.

### Reports

Allow students to:

- Filter reports by exam and date.
- Download a personal progress report as PDF.
- Export their study data as CSV.
- Review historical results.
- Understand weak and strong subject areas.

Offer constructive insights such as:

"Your accuracy in Quantitative Aptitude improved compared with last week."

Calculate such statements from actual recorded data, not placeholder analytics.

## 12. BRAIN GAMES SECTION

Create a dedicated section called:

**Brain Arcade — Recharge Your Mind**

This is a major differentiating feature.

The games must be genuinely fun, smooth, colorful, and animated.

They should provide mental engagement and refreshing breaks, not claim to medically improve intelligence or IQ.

All games must be actual working experiences, not screenshots or decorative cards.

### Game 1: Memory Match

Animated cards flip to reveal icons or illustrations.

Players must find matching pairs.

Features:

- Multiple difficulty levels.
- Smooth 3D flip animation.
- Move counter.
- Optional timer.
- Completion celebration.
- Restart.
- Sound effects with mute control.
- Best score tracking.

### Game 2: Number Merge

A beautifully animated number-merging puzzle inspired by 2048-style gameplay.

Requirements:

- Swipe controls.
- Keyboard controls.
- Smooth tile movement.
- Score calculation.
- Undo where supported.
- Restart.
- High-score history.

Use original design assets and respect third-party game licensing.

### Game 3: Pattern Pulse

Display a sequence of illuminated tiles.

The student repeats the sequence.

Increase sequence length as the player succeeds.

Use soft sounds, colorful animations, and satisfying interactions.

### Game 4: Sudoku Garden

An elegant Sudoku experience.

Features:

- Easy, Medium, and Hard.
- Notes mode.
- Hint controls.
- Mistake highlighting.
- Undo.
- Resume.
- Puzzle validation.
- Completion animation.

Generate valid Sudoku boards and verify uniqueness where required.

### Game 5: Word Connect

Students connect letters to form words.

Support English and Hindi using reliable language resources.

Features:

- Progressive levels.
- Hints.
- Word validation.
- Animated letter connections.
- Friendly completion feedback.

### Game 6: Sliding Picture Puzzle

Provide a 3×3, 4×4, and optionally 5×5 sliding puzzle.

Use original illustrations.

Ensure generated puzzles are solvable.

### Game 7: Logic Lab

A collection of visual logic challenges.

Possible types:

- Pattern completion.
- Sequence matching.
- Shape recognition.
- Simple deductive reasoning.
- Visual ordering.

Keep these separate from the authentic competitive-examination PYQ question bank.

### Game 8: Maze Escape

Generate small attractive mazes where the player guides a character to the destination.

Support touchscreen swipes and keyboard arrows.

Include multiple levels and gentle character animations.

### Game 9: Color Calm

A relaxing interaction game focused on arranging or grouping colors.

Use pleasant audio and visually satisfying feedback.

Avoid intense timers and competitive pressure.

### Game 10: Spot the Difference

Show two original illustrations with subtle differences.

Students find the differences by tapping.

Include hints and multiple difficulty levels.

### Game architecture

Create reusable infrastructure for:

- Game launch screens.
- Persistent scores.
- Levels.
- Sound settings.
- Pause and restart.
- Local and server-side progress.
- Responsive controls.
- Achievements.
- Optional offline access.

Ensure the initial release has several fully functional, polished games rather than ten incomplete game mockups. Complete the remaining games incrementally using the same architecture.

## 13. HEALTHY STUDY BREAK SYSTEM

Create an intelligent break feature.

After a student has been practicing for a configurable amount of focused study time, offer a gentle prompt:

**"You've been working hard! How about a 5-minute brain break?"**

Buttons:

- Play a Quick Game
- Take a Breathing Break
- Continue Studying

Do not interrupt active timed examinations.

### Quick Break Mode

When the user selects a short game break:

- Save quiz progress.
- Remember the student's location within the paper.
- Start the selected game.
- Display a gentle optional break timer.
- Allow the student to return at any time.

At the end, show:

**"Feeling refreshed? Your questions are right where you left them."**

Action:

- Resume Practice

The return action should reopen the saved practice session directly.

Do not force games, add guilt-inducing messages, or lock users out when the timer finishes.

## 14. EDUCATIONAL SHORT-VIDEO SECTION

Create a section called:

**Learn Shorts — Scroll with Purpose**

Build a vertically oriented, swipeable short-video experience.

The interface should feel modern and fluid, similar in basic interaction to familiar short-video applications, without copying their branding or proprietary designs.

### Video categories

Allow only approved videos in categories such as:

- Competitive exam strategies.
- Mathematics shortcuts.
- Reasoning tricks.
- English grammar.
- General knowledge.
- Science facts.
- Indian history.
- Geography.
- Current affairs.
- Study motivation.
- Time management.
- Learning techniques.
- Productivity.
- Career guidance.
- Exam preparation experiences.

Exclude irrelevant entertainment, unsafe content, misinformation, and unrelated viral videos.

### Video experience

Implement:

- Full-screen vertical video cards.
- Swipe up and down.
- Play/pause.
- Mute/unmute.
- Captions when available.
- Save or bookmark.
- Share source link.
- Report video.
- Category filters.
- Follow favorite topics, not necessarily creators.
- Continue Watching or Saved Videos.
- Clear creator attribution and source links.

### Content ingestion

Use authorized embeds or licensed video hosting.

For an initial version, implement an admin-curated library based on permitted YouTube embeds or another compliant integration.

Do not download, rehost, or scrape protected video content without permission.

Video recommendations must be based on approved educational topics.

Never use open-ended trending entertainment recommendations.

### Healthy watching design

This is crucial.

The feature must not become another addictive, endless-scrolling application.

Implement:

- Optional five-minute and ten-minute viewing sessions.
- A clear viewing-time indicator.
- Configurable daily limits.
- Gentle reminders to return to studying.
- Optional autoplay disabling.
- A clear end-of-session screen.
- An easy Return to Study action.

Display a friendly message such as:

"Your learning break is complete. Ready to continue your preparation?"

Default to a finite, curated video set rather than an infinite, opaque engagement-maximizing feed.

## 15. STUDY PLANNER

Implement an optional student-friendly study planning system.

Students can:

- Set daily question targets.
- Set weekly paper completion targets.
- Schedule subjects.
- Track completed tasks.
- Plan revision sessions.
- Record examination dates.
- Create personal reminders.
- Modify or skip plans.

### Example

Today's Study Plan:

- Solve 20 SSC CGL Quantitative Aptitude PYQs.
- Revise 15 previously incorrect questions.
- Complete one Reasoning practice session.
- Enjoy a five-minute optional game break.

The study plan must use actual question availability when linking directly to practice.

Do not invent unavailable exam papers to fulfill a target.

## 16. GAMIFICATION AND ACHIEVEMENTS

Create a meaningful reward system.

Examples:

- First 10 PYQs Attempted.
- First Full Paper Completed.
- 100 Verified PYQs Completed.
- 500 Verified PYQs Completed.
- Seven-Day Study Consistency.
- First Fully Completed Available Exam Year.
- Reasoning Practice Milestone.
- Memory Match Champion.
- Puzzle Explorer.

Rewards should provide encouragement, not punishment.

Make milestones visually satisfying through lightweight animations, badges, and achievement cards.

Distinguish between:

- Study achievements.
- Exam completion achievements.
- Game achievements.
- Personal improvement achievements.

Do not mix game points with official examination scores.

Avoid public leaderboards or social comparison by default. Keep user activity private unless a future feature is explicitly enabled.

## 17. HOME DASHBOARD EXPERIENCE

After login, show a beautiful personalized dashboard.

Example:

**Good Morning! Ready to make progress today?**

Include:

### Welcome panel

- Friendly greeting.
- Current date.
- Primary target exam.
- Today's study goal.

### Quick actions

- Continue Last Practice.
- Explore Previous-Year Papers.
- Play a Brain Game.
- Watch Learn Shorts.
- Review Your Progress.

### Progress summary

- Questions attempted today.
- Accuracy.
- Study time.
- Active days.
- Paper completion.

### Continue learning

Show the last attempted exam and saved paper position.

### Recommended revision

Use the student's recorded incorrect and bookmarked questions.

### Quick brain break

Show one attractive game card with a Play button.

### Daily encouragement

Display a positive, non-manipulative message.

Example:

"Small progress, repeated consistently, leads to meaningful results."

Keep the layout clean, spacious, and easy to navigate.

## 18. INTERNATIONALIZATION AND ACCESSIBILITY

The application must support English and Hindi interfaces.

Build all UI text using a proper internationalization system.

Requirements:

- Language switching from settings.
- Persist language preference.
- Hindi-compatible typography.
- Accessible form labels.
- Screen-reader-friendly navigation.
- Keyboard access.
- Visible focus indicators.
- Appropriate color contrast.
- Reduced-motion support.
- Scalable fonts.
- Minimum 44×44 px touch targets where appropriate.
- Accessible chart summaries.
- Accessible game controls or alternative input wherever practical.

Historical examination questions must remain faithful to the original language of the source.

Do not automatically translate a question and misrepresent the translated version as the original paper.

## 19. DATABASE DESIGN

Design a normalized PostgreSQL schema.

Include suitable tables or equivalent domain models for:

### Identity and accounts

- Users
- AuthAccounts
- Sessions
- UserPreferences
- UserExamGoals
- UserRoles

### Examinations

- ExamAuthorities
- ExamCategories
- Exams
- ExamStages
- ExamSubjects
- ExamTopics
- ExamYears
- ExamSessions
- ExamPapers
- Questions
- QuestionOptions
- AnswerKeys
- QuestionExplanations
- QuestionSources
- ImportJobs
- SourcePermissions
- VerificationReviews

### Practice

- PracticeSessions
- SessionQuestions
- StudentAnswers
- QuestionBookmarks
- QuestionReviewFlags
- PracticeResults
- RevisionQueues

### Analytics

- DailyStudyStatistics
- StudyTimeEntries
- ExamProgress
- PaperProgress
- StudyGoals
- UserAchievements

### Games

- Games
- GameLevels
- GameSessions
- GameScores
- UserGameProgress

### Videos

- Videos
- VideoCategories
- VideoTags
- VideoBookmarks
- VideoWatchSessions
- VideoReports
- VideoModerationRecords

### Administration

- AdminAuditLogs
- DataImportLogs
- ContentReviewTasks
- SystemSettings

Use relational integrity, appropriate indexes, unique constraints, migrations, pagination, and efficient queries.

Important database rules:

- Distinguish original questions from a student's multiple attempts.
- Prevent duplicate verified question imports.
- Preserve separate shift identities.
- Preserve historical answer-key changes.
- Compute progress from real question and paper associations.
- Make repeated submissions idempotent.
- Protect all personal records by authenticated user ownership.
- Keep an audit trail for exam-content modifications.

## 20. API AND BACKEND REQUIREMENTS

Provide securely authenticated and validated APIs or server actions for:

- User profile.
- Examination catalog.
- Available years and papers.
- Questions and answer submissions.
- Practice sessions.
- Bookmarks.
- Revision queues.
- Progress and analytics.
- Games and scores.
- Educational videos.
- Watch activity.
- Study plans.
- Admin content import.
- Admin verification.
- Administration operations.

Use strict role-based authorization.

A student must not be able to call admin functionality simply by changing a URL or request parameter.

Avoid exposing answer keys prematurely during active simulated examinations.

Use pagination, sensible caching, and server-side authorization for every relevant operation.

## 21. ADMINISTRATOR DASHBOARD

Create a complete administration interface.

This must be separate from ordinary student screens.

Only verified administrators can access it.

Assign admin access using secure server-side configuration or controlled administrative procedures.

Never make the first arbitrary registered user an administrator.

### Admin capabilities

**Examination management**

- Add authorities.
- Add examinations.
- Configure tiers and stages.
- Add subjects.
- Add years.
- Add shifts.
- Add papers.
- Manage paper availability.

**Question management**

- Upload authorized papers.
- Import verified question datasets.
- Review parsed questions.
- Verify answer keys.
- Correct extraction errors.
- Review duplicates.
- Publish approved questions.
- Unpublish problematic questions.
- View source provenance.

**Coverage management**

- Track examination-year completeness.
- Track available and missing papers.
- Identify unverified sources.
- Review import failures.
- Track licensing and reuse permissions.

**Video moderation**

- Add approved educational videos.
- Assign categories.
- Review video descriptions.
- Remove inappropriate videos.
- Moderate reports.
- Manage featured playlists.

**Application management**

- View aggregate usage metrics.
- Manage approved administrators.
- Review system errors.
- Review import queues.
- Manage feature flags.
- Configure non-sensitive app settings.

Use audit logging for high-impact administrative changes.

Do not expose unnecessary personal information about students in the administrator interface.

## 22. PERFORMANCE AND RESPONSIVENESS

Optimize for realistic Indian internet and device conditions.

The platform should work well on:

- Budget Android smartphones.
- Modern iPhones.
- Android tablets.
- iPads.
- Windows laptops.
- MacBooks.
- Desktop browsers.

Test common screen sizes from approximately 320 px through large desktop displays.

Performance requirements:

- Fast first load.
- Minimal unnecessary JavaScript.
- Lazy-load game engines.
- Lazy-load embedded videos.
- Optimize images.
- Cache safe static assets.
- Keep question navigation responsive.
- Prevent avoidable layout shifts.
- Avoid memory leaks.
- Minimize database queries.
- Use loading and empty states consistently.

Avoid heavy animation libraries being loaded on pages that do not need them.

### Progressive Web App

Include:

- Installable web app manifest.
- App icons.
- Service worker where appropriate.
- Offline fallback page.
- Carefully scoped offline support for permitted games and cached assets.
- Reliable online/offline indicators.

Do not claim offline exam-question access unless the content is genuinely cached and its reuse terms permit that use.

## 23. SECURITY AND PRIVACY

Implement production-quality security practices.

Include:

- Secure Google OAuth configuration.
- Server-side session verification.
- Secure cookies.
- Strict authorization.
- Rate limiting.
- CSRF protection.
- Input validation.
- Safe HTML rendering.
- Protection against cross-site scripting.
- Appropriate security headers.
- Database access restrictions.
- Secret management.
- Uploaded document validation.
- Restrictions on external URLs and fetch targets.
- Audit logging.
- Error monitoring without leaking secrets.
- Backup and recovery documentation.

For potentially underage users, implement age-appropriate privacy practices and obtain necessary consent where applicable.

Do not build unrestricted public messaging between students.

Provide clear privacy policy and terms placeholders for legally reviewed publication.

Do not leak Google tokens, private profile information, or internal administrator credentials.

Support account deletion and responsible retention of personal study data.

## 24. DESIGN SYSTEM AND REUSABLE COMPONENTS

Build reusable components including:

- AnimatedButton
- GoogleSignInButton
- DashboardCard
- ExamCard
- ExamYearSelector
- PaperCard
- QuizQuestion
- QuestionNavigator
- QuizTimer
- QuizResults
- ProgressRing
- SubjectPerformanceChart
- PaperCompletionHeatmap
- AchievementBadge
- GameCard
- GameModal
- VideoFeed
- VideoPlayer
- StudyBreakPrompt
- EmptyState
- ErrorState
- LoadingSkeleton
- ConfirmationDialog
- LanguageSelector
- ThemeToggle

Use clean component composition and consistent visual tokens.

Avoid duplicated styling or enormous components containing unrelated responsibilities.

## 25. APPLICATION ROUTES

Implement logical routing similar to:

- `/` — Public landing page
- `/login` — Google sign-in
- `/onboarding` — First-time setup
- `/dashboard` — Student home
- `/exams` — Examination directory
- `/exams/[examSlug]` — Examination overview
- `/exams/[examSlug]/years` — Year selection
- `/exams/[examSlug]/papers/[paperId]` — Paper details
- `/practice/[sessionId]` — Practice interface
- `/practice/[sessionId]/results` — Results
- `/games` — Brain Arcade
- `/games/[gameSlug]` — Individual game
- `/puzzles` — Puzzle collection
- `/watch` — Educational videos
- `/progress` — Analytics
- `/planner` — Study planner
- `/profile` — Student profile
- `/settings` — Preferences
- `/admin` — Admin dashboard
- `/admin/exams` — Exam management
- `/admin/questions` — Question management
- `/admin/imports` — Paper ingestion
- `/admin/coverage` — Historical paper coverage
- `/admin/videos` — Video management

Protect private routes with appropriate server-side access checks.

Use descriptive URLs and maintainable file organization.

## 26. PROJECT STRUCTURE

Use a scalable, logical folder structure.

For example:

```text
mindmitra/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── (student)/
│   ├── admin/
│   └── api/
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── exams/
│   ├── quiz/
│   ├── games/
│   ├── videos/
│   └── progress/
├── features/
│   ├── auth/
│   ├── exams/
│   ├── questions/
│   ├── practice/
│   ├── games/
│   ├── videos/
│   └── analytics/
├── lib/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   └── imports/
├── public/
├── tests/
├── docs/
├── .env.example
├── package.json
├── README.md
└── ...
```

Adjust this structure to match the selected framework and existing project where necessary.

## 27. IMPLEMENTATION PHASES

Build the application in a logical order.

### Phase 1: Foundation

- Set up repository.
- Initialize Next.js and TypeScript.
- Configure Tailwind and component library.
- Implement visual design system.
- Create responsive layouts.
- Set up PostgreSQL and Prisma.
- Implement Google OAuth.
- Implement user onboarding.
- Create the main student dashboard.

### Phase 2: Examination System

- Build exam catalog.
- Implement examination hierarchy.
- Build examination and paper selection.
- Create question database.
- Implement verified source metadata.
- Implement quiz engine.
- Implement session persistence.
- Implement submission and result processing.

### Phase 3: Historical Question Ingestion

- Create source registry.
- Build import tools.
- Add admin upload capability.
- Implement validation and review workflow.
- Implement duplicate detection.
- Implement source and answer-key verification.
- Add historical coverage dashboard.
- Import genuine authorized question data where available.

### Phase 4: Brain Games

- Build game library.
- Implement game engine utilities.
- Complete functional games.
- Add animations.
- Add levels and scores.
- Connect statistics to user accounts.
- Implement the Quick Break system.

### Phase 5: Educational Videos

- Build vertical video interface.
- Implement approved provider embeds.
- Add video administration.
- Implement educational categories.
- Add bookmarks.
- Add watch-time controls.
- Add return-to-study navigation.

### Phase 6: Analytics and Productivity

- Build examination progress.
- Add year-wise completion reporting.
- Add subject analytics.
- Add revision system.
- Add study planner.
- Add gamification and achievement badges.
- Add downloadable reports.

### Phase 7: Polish and Quality Assurance

- Test responsive layouts.
- Fix overflow and accessibility issues.
- Implement dark mode.
- Implement Hindi interface.
- Add skeleton loaders.
- Add empty and error states.
- Optimize animations.
- Improve performance.
- Run security checks.
- Add production configuration.

Each phase must result in genuinely working functionality.

Do not mark a phase complete because the UI has been drawn if the backend functionality is missing.

## 28. TESTING REQUIREMENTS

Create automated and manual testing coverage.

### Functional testing

- Google authentication.
- User onboarding.
- Exam discovery.
- Paper selection.
- Question loading.
- Correct answer submission.
- Negative marking.
- Session recovery.
- Result generation.
- Progress updates.
- Game functionality.
- Video moderation.
- Admin authorization.

### Data integrity testing

- Duplicate-question prevention.
- Correct exam-year association.
- Correct shift association.
- Answer-key validation.
- No unsupported paper-completion claims.
- Accurate unique question counts.
- Accurate year-wise completion.
- Proper handling of missing historical data.

### Security testing

- Unauthenticated route access.
- Student-to-student data isolation.
- Unauthorized admin requests.
- Malicious input.
- Import safety.
- OAuth failure handling.

### Responsive testing

- Small Android viewport.
- iPhone viewport.
- Tablet portrait.
- Tablet landscape.
- Laptop.
- Large desktop.

### End-to-end flows

Test at least these scenarios:

**Scenario A:** A new student signs in with Google, selects SSC CGL, opens a verified available previous-year paper, completes a practice session, and sees the result reflected in the dashboard.

**Scenario B:** A student practices for 30 minutes, chooses a five-minute Memory Match break, finishes the game, and resumes the exact saved practice session.

**Scenario C:** A student checks which available RRB NTPC years and shifts have been completed and which remain unfinished.

**Scenario D:** An administrator uploads an authorized question paper, reviews parsing results, approves questions, and publishes them.

**Scenario E:** A student watches curated educational short videos, reaches a chosen watch-session limit, and returns to the study dashboard.

**Scenario F:** Two users practice the same paper independently and cannot see or modify one another's private answer data.

Use synthetic test fixtures for automated tests, but keep them isolated from genuine public PYQ content.

## 29. DATA POPULATION RULES

Do not treat seeded demonstration content as real previous-year examination content.

If authorized question sources are available, prioritize importing and validating them.

If real content access or reuse authorization is unavailable:

- Build the complete question and import system.
- Show honest unavailable or pending statuses.
- Provide documented import instructions.
- Keep any fictional test questions in test-only fixtures.
- Never describe unavailable collections as completed.

The quality of the product depends on trust, not fabricated paper counts.

Build a robust way to increase genuine coverage over time without rebuilding the software.

## 30. DEPLOYMENT AND LOCAL DEVELOPMENT

The entire project must run locally.

Provide exact instructions for Windows, macOS, and Linux where relevant.

Include:

- Required Node.js version.
- Dependency installation.
- PostgreSQL configuration.
- Database creation and migrations.
- Environment configuration.
- Google OAuth application setup.
- Required redirect URIs.
- Local development command.
- Production build command.
- Test commands.
- Secure initial admin creation.
- Data import workflow.

Prepare the project for deployment to a suitable provider such as Vercel or Render, alongside a compatible managed PostgreSQL database.

Do not assume every feature is available on a permanent free hosting tier.

Explain external service requirements and likely cost considerations.

Never hard-code API secrets.

Make development easy for someone who is learning full-stack programming.

## 31. DOCUMENTATION

Create a comprehensive `README.md`.

Also create technical documentation covering:

- Architecture.
- Database design.
- Authentication configuration.
- Exam and paper ingestion.
- Question verification.
- Administrator operations.
- Adding new examinations.
- Adding games.
- Video moderation.
- Progress calculations.
- Environment variables.
- Deployment.
- Testing.
- Backup and recovery.
- Known limitations.

Provide a feature-completion checklist.

The owner should be able to understand where to edit the UI, backend, database, games, exam catalog, and admin functionality.

## 32. FINAL PRODUCT ACCEPTANCE CRITERIA

The application is ready for public testing only when:

1. The landing page and student dashboard work on real devices.
2. Google sign-in is fully wired and secure.
3. A student can create and maintain a profile.
4. Exams can be browsed and filtered.
5. Published questions have genuine, verified provenance.
6. At least one authorized real question collection can be practiced end to end, if suitable source content is available.
7. Quiz state and results are saved correctly.
8. Progress dashboards calculate real statistics.
9. Historical paper coverage is reported transparently.
10. Several complete brain games work on mobile and desktop.
11. Game breaks can return a student to the previous practice session.
12. Educational videos are moderated and displayed through authorized integrations.
13. The admin dashboard supports content and examination management.
14. The application supports English and Hindi UI.
15. The application has responsive light and dark themes.
16. Automated tests and the production build pass.
17. The application can be launched locally using the README.
18. No critical security issues or knowingly broken primary flows remain.

## 33. INSTRUCTIONS FOR EXECUTION

You are not being asked to merely explain how this platform could be built.

**You must actually build the project in the available coding environment.**

Follow this execution approach:

1. Inspect the repository and development environment.
2. Identify installed tools and existing code.
3. Establish the application architecture.
4. Create an implementation checklist.
5. Begin implementing the application.
6. Write actual files and functional code.
7. Install dependencies as necessary.
8. Run database migrations when configuration permits.
9. Implement the main features.
10. Run linting, type checking, tests, and production builds.
11. Fix errors discovered during development.
12. Document anything that cannot be completed without external credentials, verified question sources, or permissions.

Do not replace working features with empty placeholders to make a checklist appear complete.

Do not repeatedly ask for aesthetic preferences or routine implementation decisions. Use the design system described in this prompt.

Only request input when essential external secrets, access permissions, licensing decisions, or account-specific configurations are genuinely necessary.

Where such dependencies are unavailable, implement the surrounding functionality, provide safe environment-variable placeholders, and accurately document the blocker.

At completion, provide:

- Project structure.
- Implemented features.
- Features not yet completed.
- Available verified PYQ coverage.
- Test and build results.
- Required credentials and setup.
- Exact local run commands.
- Deployment procedure.
- Next priorities.

## 34. FINAL DESIGN PHILOSOPHY

MindMitra must be more than a quiz website.

It should feel like an enjoyable educational companion that students want to open every day.

A student should be able to:

**Learn → Practice → Take a Break → Play → Feel Refreshed → Return to Learning → Track Improvement**

Everything must be designed around this natural cycle.

The application should be:

- Beautiful but not distracting.
- Playful but academically trustworthy.
- Engaging but not addictive.
- Simple but feature-rich.
- Fast even on affordable devices.
- Welcoming to beginners.
- Useful to serious exam aspirants.
- Expandable to more Indian examinations.
- Secure and respectful of student privacy.

Treat visual refinement, real functionality, educational accuracy, and user experience as equally important.

**Now begin building MindMitra as a real, end-to-end, responsive educational platform. Do not stop at a landing page, a design concept, or a static demonstration.**
