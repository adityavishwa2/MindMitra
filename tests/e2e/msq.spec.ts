import { test, expect, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { textPdf } from "../helpers/pdf";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw Error("Use isolated *_test database");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const origin = "http://localhost:3001",
  headers = { Origin: origin },
  run = randomUUID();
let student: { id: string; token: string },
  admin: { id: string; token: string },
  outsider: { id: string; token: string },
  authorityId: string,
  examId: string;
async function account(role: string, label = role) {
  const user = await db.user.create({
    data: {
      name: `MSQ ${role}`,
      email: `msq-${label}-${run}@synthetic.test`,
      role,
      onboarded: true,
    },
  });
  const token = randomUUID();
  await db.session.create({
    data: {
      userId: user.id,
      sessionToken: token,
      expires: new Date(Date.now() + 3600000),
    },
  });
  return { id: user.id, token };
}
async function login(context: BrowserContext, token: string) {
  await context.clearCookies();
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
test.beforeAll(async () => {
  student = await account("STUDENT");
  admin = await account("ADMIN");
  outsider = await account("STUDENT", "outsider");
  authorityId = (
    await db.authority.create({ data: { name: `SYNTHETIC MSQ ${run}` } })
  ).id;
  examId = (
    await db.exam.create({
      data: {
        name: "SYNTHETIC MSQ ONLY",
        slug: `msq-${run}`,
        category: "Test",
        subjects: ["Mathematics"],
        authorityId,
      },
    })
  ).id;
});
test.afterAll(async () => {
  await db.user.deleteMany({
    where: {
      id: { in: [student?.id, admin?.id, outsider?.id].filter(Boolean) },
    },
  });
  await db.paper.deleteMany({ where: { examId } });
  await db.exam.deleteMany({ where: { id: examId } });
  await db.authority.deleteMany({ where: { id: authorityId } });
  await db.sourceDocument.deleteMany({
    where: { url: { startsWith: `https://example.org/msq-${run}` } },
  });
  await db.$disconnect();
});
test("PDF automatically becomes mixed MCQ/MSQ JSON, with multiple selections, recovery and immutable exact-set scoring", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await login(context, student.token);
  const pdf = textPdf([
    "1. Select all prime numbers",
    "(A) Two",
    "(B) Four",
    "(C) Three",
    "2. Select all even numbers",
    "(A) One",
    "(B) Two",
    "(C) Four",
    "3. Choose one answer: an even number",
    "(A) Two",
    "(B) Three",
    "4. Select all applicable answers without a key",
    "(A) First",
    "(B) Second",
    "(C) Third",
  ]);
  const upload = await page.request.post("/api/contributions", {
    headers,
    multipart: {
      examId,
      year: "2025",
      stage: "Synthetic",
      shift: "MSQ",
      title: "SYNTHETIC AUTOMATIC MSQ PAPER",
      sourceUrl: `https://example.org/msq-${run}.pdf`,
      permissionEvidence: "Original synthetic test fixture owned by author",
      rightsConfirmed: "yes",
      publicAlias: "",
      file: {
        name: "mixed-paper.pdf",
        mimeType: "application/pdf",
        buffer: pdf,
      },
    },
  });
  expect(upload.status()).toBe(201);
  const { id } = await upload.json();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/contributions/${id}/conversion`)
          ).json()
        ).conversionStatus,
      { timeout: 30000 },
    )
    .toBe("READY");
  const converted = await (
    await page.request.get(`/api/contributions/${id}/conversion`)
  ).json();
  expect(
    converted.payload.questions.map((q: { type: string }) => q.type),
  ).toEqual(["MSQ", "MSQ", "MCQ", "MSQ"]);
  expect(converted.payload.questions[0].keyStatus).toBe("UNAVAILABLE");
  expect(
    (
      await page.request.post(`/api/contributions/${id}/draft`, {
        headers,
        data: converted.payload,
      })
    ).status(),
  ).toBe(403);
  await login(context, admin.token);
  expect(
    (
      await page.request.post(`/api/contributions/${id}/draft`, {
        data: converted.payload,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post(`/api/contributions/${id}/conversion`, {
        headers,
      })
    ).ok(),
  ).toBe(true);
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/contributions/${id}/conversion`)
          ).json()
        ).conversionStatus,
      { timeout: 30000 },
    )
    .toBe("READY");
  // Attach a bounded source crop to the first synthetic question. The original
  // scan is available only to its owner/admin until publication.
  const crop = [
    { page: 1, x: 0.03, y: 0.025, width: 0.94, height: 0.175, rotation: 0 },
  ];
  const imageDraft = structuredClone(converted.payload);
  imageDraft.questions[0].sourceRegions = crop;
  expect(
    (
      await page.request.post(`/api/contributions/${id}/draft`, {
        headers,
        data: imageDraft,
      })
    ).ok(),
  ).toBe(true);
  const preview = await page.request.get(
    `/api/contributions/${id}/question-image?regions=${encodeURIComponent(JSON.stringify(crop))}`,
  );
  expect(preview.ok()).toBe(true);
  expect(preview.headers()["content-type"]).toBe("image/jpeg");
  expect(preview.headers()["cache-control"]).toContain("no-store");
  await login(context, outsider.token);
  expect(
    (
      await page.request.get(
        `/api/contributions/${id}/question-image?regions=${encodeURIComponent(JSON.stringify(crop))}`,
      )
    ).status(),
  ).toBe(404);
  await login(context, admin.token);
  // Review the generated questions without editing raw JSON.
  await page.goto(`/admin/contributions/${id}`);
  const editor = page.getByRole("region", { name: "Visual paper review" });
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel("Answer-key reference")).toHaveCount(0);
  await expect(
    page
      .getByRole("main")
      .getByRole("img", { name: "Original uploaded PDF page 1", exact: true }),
  ).toBeVisible();
  for (const [width, height] of [
    [390, 844],
    [820, 1180],
    [1366, 900],
  ]) {
    await page.setViewportSize({ width, height });
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll("main *")]
        .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 8)
        .map((el) => ({
          tag: el.tagName,
          cls: el.className,
          right: el.getBoundingClientRect().right,
        })),
    );
    await page.screenshot({
      path: `test-results/cbt-review-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      JSON.stringify(overflow),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/cbt-review-${width}.png`,
      fullPage: true,
    });
  }

  await editor
    .getByLabel("Reuse permission", { exact: true })
    .selectOption("AUTHORIZED");
  await editor.getByLabel("Marks per question", { exact: true }).fill("2");
  await editor
    .getByLabel("Penalty per wrong answer", { exact: true })
    .fill("0.5");
  for (let i = 0; i < 4; i++) {
    await editor
      .getByLabel("Review question", { exact: true })
      .selectOption(String(i));
    if (i === 0) {
      await editor
        .getByText("Compare original question", { exact: true })
        .click();
      const image = editor.getByRole("img", {
        name: "Original scan of question 1 and its options",
      });
      await expect(image).toBeVisible();
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
        .toBeGreaterThan(0);
    }
    const settings = editor.getByText("Question settings", { exact: true });
    const details = settings.locator("..");
    if (!(await details.getAttribute("open").then((v) => v !== null)))
      await settings.click();
    await editor.getByLabel("Subject", { exact: true }).fill("Mathematics");
    if (i === 3) continue;
    for (const option of i === 0 ? ["A", "C"] : i === 1 ? ["B", "C"] : ["A"])
      await editor
        .getByLabel(`Correct option ${option}`, { exact: true })
        .check();
  }
  await page
    .getByRole("button", { name: "Save review draft", exact: true })
    .click();
  await expect(
    page.getByText(
      "Review draft saved. It is private until approved and published.",
    ),
  ).toBeVisible();
  await page.reload();
  await expect(
    editor.getByLabel("Correct option A", { exact: true }),
  ).toBeChecked();
  await expect(
    editor.getByLabel("Correct option C", { exact: true }),
  ).toBeChecked();
  const persisted = await db.contribution.findUniqueOrThrow({ where: { id } });
  expect(
    (persisted.payload as { questions: { correctAnswers: number[] }[] })
      .questions[0].correctAnswers,
  ).toEqual([0, 2]);
  expect(await db.paper.count({ where: { examId } })).toBe(0);
  const tampered = structuredClone(persisted.payload) as {
    source: { checksum: string };
  };
  tampered.source.checksum = "0".repeat(64);
  expect(
    (
      await page.request.post(`/api/contributions/${id}/draft`, {
        headers,
        data: tampered,
      })
    ).status(),
  ).toBe(400);
  await page
    .getByRole("main")
    .getByText("Other decisions: reject, or publish with unavailable keys", {
      exact: true,
    })
    .click();
  await page
    .getByLabel("Review note (shared with contributor)")
    .fill(
      "Compared all synthetic MCQ/MSQ text, keys and rights before publication",
    );
  await page
    .getByRole("button", { name: "Approve and publish", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Open exam preparation", exact: true }),
  ).toHaveAttribute("href", "/exams");
  expect(
    (
      await page.request.post(`/api/contributions/${id}/draft`, {
        headers,
        data: persisted.payload,
      })
    ).status(),
  ).toBe(409);
  const contribution = await db.contribution.findUniqueOrThrow({
    where: { id },
  });
  const questions = await db.question.findMany({
    where: { paperId: contribution.paperId! },
    orderBy: { number: "asc" },
    include: { keys: true },
  });
  await login(context, student.token);
  await page.goto(`/exams/msq-${run}`);
  await expect(
    page.getByRole("main").getByRole("heading", {
      name: "SYNTHETIC AUTOMATIC MSQ PAPER",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator(
      `main a[href="/exams/msq-${run}/papers/${contribution.paperId}"]`,
    ),
  ).toBeVisible();
  const start = await page.request.post("/api/practice", {
    headers,
    data: { paperId: contribution.paperId, mode: "untimed" },
  });
  expect(start.ok()).toBe(true);
  const session = await start.json();
  const sourceRecord = await db.paper.findUniqueOrThrow({
    where: { id: contribution.paperId! },
    select: { sourceId: true },
  });
  expect(
    await db.sourcePdf.findUnique({
      where: { sourceId: sourceRecord.sourceId },
      select: { sourceId: true },
    }),
  ).not.toBeNull();
  // Published scan assets survive removal of the private contribution copy.
  await db.contribution.update({ where: { id }, data: { pdf: null } });
  expect(questions[0].sourceRegions).toEqual([]);
  expect(
    (
      await page.request.get(
        `/api/practice/${session.id}/questions/${questions[0].id}/image`,
      )
    ).status(),
  ).toBe(404);
  // A later source correction cannot change this session's copied keys/options/crop.
  await db.question.update({
    where: { id: questions[0].id },
    data: { options: ["Revised one", "Revised two"], sourceRegions: [] },
  });
  await db.answerKey.update({
    where: { id: questions[0].keys[0].id },
    data: { correctAnswers: [0, 1] },
  });
  await login(context, admin.token);
  expect(
    (
      await page.request.get(
        `/api/practice/${session.id}/questions/${questions[0].id}/image`,
      )
    ).status(),
  ).toBe(404);
  await login(context, student.token);
  await page.goto("/practice");
  await page.evaluate(
    (id) => localStorage.setItem(`mm-quiz-${id}`, "null"),
    session.id,
  );
  await page.goto(`/practice/${session.id}`);
  const main = page.getByRole("main");
  expect(await page.content()).not.toContain("correctAnswers");
  expect(await page.content()).not.toContain("SYNTHETIC HIDDEN MSQ KEY");
  await expect(
    main.getByText(/MSQ · Select all correct options/),
  ).toBeVisible();
  for (const answer of [
    { selected: 0, selectedOptions: [] },
    { selected: null, selectedOptions: [0, 0] },
    { selected: null, selectedOptions: [7] },
  ])
    expect(
      (
        await page.request.post(`/api/answer/${session.id}`, {
          headers,
          data: {
            questionId: questions[0].id,
            reviewed: false,
            current: 0,
            ...answer,
          },
        })
      ).status(),
    ).toBe(400);
  await main.getByRole("button", { name: "A Two", exact: true }).click();
  await main.getByRole("button", { name: "C Three", exact: true }).click();
  await expect(main.getByText("All changes saved")).toBeVisible();
  await page.reload();
  await expect(
    main.getByRole("button", { name: "A Two", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    main.getByRole("button", { name: "C Three", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await main
    .getByRole("button", { name: "Go to question 2", exact: true })
    .click();
  await main.getByRole("button", { name: "B Two", exact: true }).click();
  await expect(main.getByText("All changes saved")).toBeVisible();
  await main
    .getByRole("button", { name: "Go to question 4", exact: true })
    .click();
  let releaseSave!: () => void;
  const saveGate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  let saveStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    saveStarted = resolve;
  });
  await page.route(`**/api/answer/${session.id}`, async (route) => {
    saveStarted();
    await saveGate;
    await route.continue();
  });
  await main.getByRole("button", { name: "A First", exact: true }).click();
  await started;
  page.once("dialog", (dialog) => dialog.accept());
  await main
    .getByRole("button", { name: "Submit paper", exact: true })
    .first()
    .click();
  await expect(
    main.getByRole("button", { name: "Submitting…", exact: true }),
  ).toBeVisible();
  releaseSave();
  await expect(page).toHaveURL(`/practice/${session.id}/results`);
  for (let n = 0; n < 2; n++) {
    const submit = await page.request.post(`/api/submit/${session.id}`, {
      headers,
      data: {},
    });
    expect(submit.ok()).toBe(true);
    expect(await submit.json()).toMatchObject({
      correct: 1,
      incorrect: 1,
      unattempted: 1,
      unscored: 1,
      score: 1.5,
      accuracy: 50,
    });
  }
  await page.goto(`/practice/${session.id}/results`);
  await expect(
    main.getByRole("heading", { name: "A little more learned." }),
  ).toBeVisible();
  await main.locator("details").first().locator("summary").click();
  await expect(main.getByText(/Answer: A, C/)).toBeVisible();
  await expect(
    main.getByText("Three ← Your answer", { exact: true }),
  ).toBeVisible();
  await page.goto("/progress");
  const row = page.getByRole("row").filter({ hasText: "SYNTHETIC MSQ ONLY" });
  await expect(row.getByRole("cell").nth(2)).toHaveText("3 / 4");
});

test("answer feedback saves question by question and final review publishes to practice", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await login(context, student.token);
  const response = await page.request.post("/api/contributions", {
    headers,
    multipart: {
      examId,
      year: "2025",
      stage: "Feedback",
      shift: "Auto",
      title: "SYNTHETIC ANSWER FEEDBACK PAPER",
      sourceUrl: `https://example.org/msq-${run}-feedback.pdf`,
      permissionEvidence: "Original synthetic fixture owned by author",
      rightsConfirmed: "yes",
      publicAlias: "",
      file: {
        name: "feedback.pdf",
        mimeType: "application/pdf",
        buffer: textPdf([
          "1. First feedback question?",
          "(A) First",
          "(B) Second",
          "2. Second feedback question?",
          "(A) Alpha",
          "(B) Beta",
        ]),
      },
    },
  });
  expect(response.ok()).toBe(true);
  const { id } = await response.json();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/contributions/${id}/conversion`)
          ).json()
        ).conversionStatus,
      { timeout: 30000 },
    )
    .toBe("READY");
  await login(context, admin.token);
  await page.goto(`/admin/contributions/${id}`);
  const editor = page.getByRole("region", { name: "Visual paper review" });
  await expect(
    editor.getByLabel("Answer-key reference for this paper"),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("button", {
      name: "Finish review and publish to practice",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: /Review 2 remaining answers/ }),
  ).toBeVisible();
  await editor.getByLabel("Correct option A", { exact: true }).check();
  await editor
    .getByRole("button", { name: "Save answer & next", exact: true })
    .click();
  await expect(
    editor.getByLabel("Review question", { exact: true }),
  ).toHaveValue("1");
  expect(await db.paper.count({ where: { examId, stage: "Feedback" } })).toBe(
    0,
  );
  await editor.getByLabel("Correct option B", { exact: true }).check();
  const finish = editor.getByRole("button", {
    name: "Finish review and publish to practice",
    exact: true,
  });
  await expect(finish).toBeDisabled();
  await editor
    .getByLabel("Reuse permission", { exact: true })
    .selectOption("AUTHORIZED");
  await expect(finish).toBeEnabled();
  await finish.click();
  await expect(
    page.getByRole("link", { name: "Open exam preparation", exact: true }),
  ).toBeVisible();
  const published = await db.paper.findFirstOrThrow({
    where: { examId, stage: "Feedback" },
    include: {
      questions: { orderBy: { number: "asc" }, include: { keys: true } },
    },
  });
  expect(published.status).toBe("PUBLISHED");
  expect(published.questions.map((q) => q.keys[0].answer)).toEqual([0, 1]);
  expect(published.questions.every((q) => q.keys[0].reference === "")).toBe(
    true,
  );
});
