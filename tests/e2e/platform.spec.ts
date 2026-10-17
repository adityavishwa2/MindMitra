import { test, expect, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw new Error("Use a dedicated *_test database");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
let uid: string,
  oid: string,
  aid: string,
  token: string,
  adminToken: string,
  otherToken: string,
  eid: string;
async function login(c: BrowserContext, t: string) {
  await c.addCookies([
    {
      name: "next-auth.session-token",
      value: t,
      url: "http://localhost:3001",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
const headers = { Origin: "http://localhost:3001" };
const payload = () => ({
  examId: eid,
  year: 2024,
  stage: "TEST ONLY",
  shift: "SYNTHETIC-A",
  title: "SYNTHETIC TEST ONLY",
  marks: 2,
  penalty: 0.5,
  durationMinutes: 10,
  source: {
    title: "Synthetic fixture",
    url: "https://example.com/test-only",
    checksum: "a".repeat(64),
    permission: "AUTHORIZED",
    permissionEvidence: "Synthetic fixture in isolated test database only",
  },
  questions: [
    {
      number: 1,
      text: "SYNTHETIC TEST ONLY: select the first option.",
      type: "MCQ",
      options: ["First", "Second", "Third", "Fourth"],
      subject: "Test subject",
      topic: "Fixture",
      language: "en",
      sourcePage: 1,
      answer: 0,
      keyStatus: "VERIFIED",
      keyReference: "Synthetic test fixture key",
      explanation: "SYNTHETIC SECRET EXPLANATION",
    },
  ],
});
test.beforeAll(async () => {
  await db.user.deleteMany({
    where: { email: { endsWith: "@mindmitra.test" } },
  });
  await db.paper.deleteMany({
    where: { exam: { slug: "synthetic-test-only" } },
  });
  const a = await db.authority.upsert({
    where: { name: "SYNTHETIC TEST ONLY" },
    create: { name: "SYNTHETIC TEST ONLY" },
    update: {},
  });
  eid = (
    await db.exam.upsert({
      where: { slug: "synthetic-test-only" },
      create: {
        slug: "synthetic-test-only",
        name: "SYNTHETIC TEST ONLY",
        category: "Test",
        subjects: ["Test subject"],
        authorityId: a.id,
      },
      update: {},
    })
  ).id;
  uid = (
    await db.user.create({
      data: {
        email: "student@mindmitra.test",
        name: "Test Learner",
        onboarded: true,
      },
    })
  ).id;
  oid = (
    await db.user.create({
      data: {
        email: "other@mindmitra.test",
        name: "Other Learner",
        onboarded: true,
      },
    })
  ).id;
  aid = (
    await db.user.create({
      data: {
        email: "admin@mindmitra.test",
        name: "Test Admin",
        role: "ADMIN",
        onboarded: true,
      },
    })
  ).id;
  token = randomUUID();
  adminToken = randomUUID();
  otherToken = randomUUID();
  await db.session.createMany({
    data: [
      {
        userId: uid,
        sessionToken: token,
        expires: new Date(Date.now() + 3600000),
      },
      {
        userId: aid,
        sessionToken: adminToken,
        expires: new Date(Date.now() + 3600000),
      },
      {
        userId: oid,
        sessionToken: otherToken,
        expires: new Date(Date.now() + 3600000),
      },
    ],
  });
});
test.afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: [uid, oid, aid] } } });
  await db.paper.deleteMany({ where: { examId: eid } });
  await db.exam.deleteMany({ where: { id: eid } });
  await db.auditLog.deleteMany({ where: { actorId: aid } });
  await db.importJob.deleteMany({ where: { actorId: aid } });
  await db.sourceDocument.deleteMany({
    where: { url: "https://example.com/test-only" },
  });
  await db.rateBucket.deleteMany({
    where: {
      OR: [
        { key: { startsWith: uid } },
        { key: { startsWith: aid } },
        { key: { startsWith: oid } },
      ],
    },
  });
  await db.video.deleteMany({ where: { youtubeId: "testVideo01" } });
  await db.$disconnect();
});
test("responsive landing has no horizontal overflow", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Study hard/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/landing-mobile.png",
    fullPage: true,
  });
});
test("anonymous and cross-origin writes fail; students cannot administer", async ({
  page,
  context,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  expect(
    (
      await page.request.post("/api/tasks", {
        headers,
        data: { title: "x", dueDate: new Date().toISOString() },
      })
    ).status(),
  ).toBe(401);
  await login(context, token);
  expect(
    (
      await page.request.post("/api/admin/exam", { headers, data: {} })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/tasks", {
        headers: { Origin: "https://attacker.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  await page.goto("/admin");
  await expect(page).toHaveURL(/dashboard/);
});
test("import, permission gate, publication, quiz recovery, idempotency, isolation", async ({
  page,
  context,
}) => {
  await login(context, adminToken);
  let r = await page.request.post("/api/admin/import", {
    headers,
    data: payload(),
  });
  expect(r.ok(), await r.text()).toBe(true);
  const paper = await r.json();
  expect(paper.status).toBe("AWAITING_VERIFICATION");
  expect(
    (
      await page.request.post("/api/admin/import", { headers, data: payload() })
    ).status(),
  ).toBe(409);
  await login(context, token);
  expect(
    (
      await page.request.post("/api/practice", {
        headers,
        data: { paperId: paper.id, mode: "untimed" },
      })
    ).status(),
  ).toBe(400);
  await login(context, adminToken);
  await page.goto("/admin/questions");
  await expect(
    page.getByRole("heading", { name: /verification desk/ }),
  ).toBeVisible();
  const source = await db.paper.findUniqueOrThrow({ where: { id: paper.id } });
  await page.request.post("/api/admin/permission", {
    headers,
    data: {
      sourceId: source.sourceId,
      permission: "PENDING",
      permissionEvidence: "Synthetic test rights still under review.",
    },
  });
  expect(
    (
      await page.request.post("/api/admin/review", {
        headers,
        data: {
          paperId: paper.id,
          decision: "APPROVE",
          note: "Synthetic review must fail without authorization.",
        },
      })
    ).status(),
  ).toBe(400);
  await page.request.post("/api/admin/permission", {
    headers,
    data: {
      sourceId: source.sourceId,
      permission: "AUTHORIZED",
      permissionEvidence:
        "Synthetic isolated fixture authorized for this test.",
    },
  });
  r = await page.request.post("/api/admin/review", {
    headers,
    data: {
      paperId: paper.id,
      decision: "APPROVE",
      note: "Compared against the isolated synthetic source fixture.",
    },
  });
  expect(r.ok()).toBe(true);
  const secondPayload = { ...payload(), shift: "SYNTHETIC-B" };
  const second = await (
    await page.request.post("/api/admin/import", {
      headers,
      data: secondPayload,
    })
  ).json();
  expect(
    (
      await page.request.post("/api/admin/review", {
        headers,
        data: {
          paperId: second.id,
          decision: "APPROVE",
          note: "Second synthetic shift reviewed independently.",
        },
      })
    ).ok(),
  ).toBe(true);
  await login(context, token);
  await page.goto("/exams/synthetic-test-only");
  await page.getByRole("link", { name: "View paper →" }).first().click();
  await page.getByRole("button", { name: "Start practice →" }).click();
  await expect(page).toHaveURL(/practice\//);
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  await expect(
    page.getByRole("heading", { name: /select the first/ }),
  ).toBeVisible();
  expect(await page.content()).not.toContain("keyVersion");
  expect(await page.content()).not.toContain("SYNTHETIC SECRET EXPLANATION");
  await page.getByRole("button", { name: "A First", exact: true }).click();
  await expect(page.getByText("All changes saved")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "A First", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto(
    `/games/memory-match?returnTo=${encodeURIComponent(`/practice/${id}`)}`,
  );
  await page.getByRole("button", { name: "Let’s play →" }).click();
  await page.getByRole("link", { name: "← Resume your practice" }).click();
  await expect(page).toHaveURL(new RegExp(`/practice/${id}$`));
  await expect(
    page.getByRole("button", { name: "A First", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (let i = 0; i < 2; i++) {
    r = await page.request.post(`/api/submit/${id}`, { headers, data: {} });
    expect(await r.json()).toMatchObject({ correct: 1, score: 2 });
  }
  await page.goto(`/practice/${id}/results`);
  await expect(
    page.getByRole("heading", { name: "A little more learned." }),
  ).toBeVisible();
  expect(
    await db.practiceSession.count({
      where: { userId: uid, submittedAt: { not: null } },
    }),
  ).toBe(1);
  await page.goto("/progress");
  const row = page.getByRole("row").filter({ hasText: "SYNTHETIC TEST ONLY" });
  await expect(row.getByRole("cell").nth(3)).toHaveText("1 / 2");
  const report = await page.request.get("/api/report");
  expect(report.headers()["content-type"]).toContain("text/csv");
  expect(await report.text()).toContain("SYNTHETIC TEST ONLY");
  await page.goto("/dashboard");
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await login(context, otherToken);
  await page.goto(`/practice/${id}`);
  await expect(
    page.getByRole("heading", { name: "A little off the path." }),
  ).toBeVisible();
  const q = await db.question.findFirstOrThrow({
    where: { paperId: paper.id },
  });
  expect(
    (
      await page.request.post(`/api/answer/${id}`, {
        headers,
        data: { questionId: q.id, selected: 1, reviewed: false, current: 0 },
      })
    ).status(),
  ).toBe(400);
});
test("planner persists and is isolated between users", async ({
  page,
  context,
}) => {
  await login(context, token);
  await page.goto("/planner");
  await page
    .getByRole("textbox", { name: "What’s your next small step?", exact: true })
    .fill("SYNTHETIC TEST ONLY: revise ratios");
  await page.getByRole("button", { name: "Add to my plan +" }).click();
  await expect(
    page.getByText("SYNTHETIC TEST ONLY: revise ratios", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("SYNTHETIC TEST ONLY: revise ratios", { exact: true }),
  ).toBeVisible();
  const task = await db.studyTask.findFirstOrThrow({ where: { userId: uid } });
  await login(context, otherToken);
  const r = await page.request.post(`/api/task/${task.id}`, {
    headers,
    data: { done: true },
  });
  expect(await r.json()).toMatchObject({ saved: false });
  expect(
    (await db.studyTask.findUniqueOrThrow({ where: { id: task.id } })).done,
  ).toBe(false);
});
test("four games play; memory match completes", async ({ page }) => {
  for (const slug of [
    "memory-match",
    "number-merge",
    "pattern-pulse",
    "sliding-puzzle",
  ]) {
    await page.goto(`/games/${slug}`);
    await page.getByRole("button", { name: "Let’s play →" }).click();
    if (slug === "number-merge") {
      await expect(
        page.getByRole("group", { name: "Number merge board" }),
      ).toBeVisible();
      await page.keyboard.press("ArrowLeft");
      await page.getByRole("button", { name: "Finish break" }).click();
      await expect(
        page.getByText("Lovely work.", { exact: false }),
      ).toBeVisible();
    }
    if (slug === "sliding-puzzle")
      await expect(
        page.getByRole("button", { name: "Move tile 1", exact: true }),
      ).toBeVisible();
    if (slug === "pattern-pulse")
      await expect(
        page.getByRole("button", { name: "Pattern tile 1" }),
      ).toBeVisible();
    if (slug === "memory-match") {
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("mm-game-memory-match")!),
      );
      for (let n = 0; n < saved.difficulty; n++) {
        const indexes = saved.board.flatMap((v: number, i: number) =>
          v === n ? [i] : [],
        );
        for (const i of indexes)
          await page
            .getByRole("button", { name: `Reveal card ${i + 1}`, exact: true })
            .click();
      }
      await expect(
        page.getByText("Lovely work.", { exact: false }),
      ).toBeVisible();
    }
  }
});

test("language and favorites persist; private video feed has a finite session", async ({
  page,
  context,
}) => {
  await login(context, token);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "अ हिंदी" }).click();
  await expect(page.getByRole("heading", { name: /नमस्ते/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /नमस्ते/ })).toBeVisible();
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: uid } })).language,
  ).toBe("hi");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Hello/ })).toBeVisible();
  await page.request.post("/api/exam-favorite", {
    headers,
    data: { examId: eid, saved: true },
  });
  await page.goto("/exams?favorites=1");
  await expect(
    page.getByRole("heading", { name: "SYNTHETIC TEST ONLY", exact: true }),
  ).toBeVisible();
  await login(context, adminToken);
  expect(
    (
      await page.request.post("/api/admin/video", {
        headers,
        data: {
          title: "SYNTHETIC TEST ONLY VIDEO",
          creator: "Test fixture",
          youtubeId: "testVideo01",
          category: "Science",
          approved: true,
        },
      })
    ).ok(),
  ).toBe(true);
  await login(context, token);
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({
      status: 200,
      body: "Synthetic provider fixture, not real video playback",
    }),
  );
  await page.goto("/watch");
  await page.clock.install();
  await page.getByRole("button", { name: "Play this video" }).click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /youtube-nocookie\.com/,
  );
  await page.clock.runFor(301000);
  await expect(
    page.getByRole("heading", { name: "Your learning break is complete." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to study →" }),
  ).toBeVisible();
});
