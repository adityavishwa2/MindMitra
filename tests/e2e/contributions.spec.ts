import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { textPdf } from "../helpers/pdf";
import { randomUUID, createHash } from "node:crypto";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw Error("Use isolated *_test database");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const origin = "http://localhost:3001";
const headers = { Origin: origin };
const run = randomUUID();
let examId: string, authorityId: string;
let student: { id: string; token: string },
  admin: { id: string; token: string },
  other: { id: string; token: string };
async function account(role: string, label: string) {
  const u = await db.user.create({
    data: {
      name: label,
      email: `${label}-${run}@contribution.test`,
      role,
      onboarded: true,
    },
  });
  const token = randomUUID();
  await db.session.create({
    data: {
      userId: u.id,
      sessionToken: token,
      expires: new Date(Date.now() + 3600000),
    },
  });
  return { id: u.id, token };
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
function paper(shift: string, checksum = "b".repeat(64)) {
  return {
    examId,
    year: 2025,
    stage: "TEST ONLY",
    shift,
    title: "SYNTHETIC CONTRIBUTION TEST ONLY",
    marks: 2,
    penalty: 0.5,
    durationMinutes: 30,
    source: {
      title: "Synthetic fixture",
      url: `https://example.com/contribution-test/${run}/${shift}`,
      checksum,
      permission: "AUTHORIZED",
      permissionEvidence: "Synthetic fixture owned by the test author",
    },
    questions: [
      {
        number: 1,
        text: "SYNTHETIC TEST ONLY: choose first",
        type: "MCQ",
        options: ["First", "Second"],
        subject: "Fixture",
        topic: "Fixture",
        language: "en",
        sourcePage: 1,
        answer: 0,
        keyStatus: "VERIFIED",
        keyReference: "Synthetic test fixture",
        explanation: "Synthetic explanation",
      },
    ],
  };
}
async function upload(
  request: APIRequestContext,
  shift: string,
  options: {
    pdf?: Buffer;
    json?: Buffer;
    alias?: string;
    rights?: string;
  } = {},
) {
  const p = paper(shift);
  return request.post("/api/contributions", {
    headers,
    multipart: {
      examId,
      year: "2025",
      stage: "TEST ONLY",
      shift,
      title: p.title,
      sourceUrl: p.source.url,
      permissionEvidence: p.source.permissionEvidence,
      rightsConfirmed: options.rights ?? "yes",
      publicAlias: options.alias ?? `Helper-${run.slice(0, 8)}`,
      file: {
        name: options.pdf ? "paper.pdf" : "paper.json",
        mimeType: options.pdf ? "application/pdf" : "application/json",
        buffer: options.pdf ?? options.json ?? Buffer.from(JSON.stringify(p)),
      },
    },
  });
}
test.beforeAll(async () => {
  const a = await db.authority.create({
    data: { name: `CONTRIBUTION TEST ONLY ${run}` },
  });
  authorityId = a.id;
  examId = (
    await db.exam.create({
      data: {
        name: "SYNTHETIC CONTRIBUTION EXAM",
        slug: `contribution-${run}`,
        category: "Test",
        subjects: ["Fixture"],
        authorityId,
      },
    })
  ).id;
  student = await account("STUDENT", "contributor");
  await db.user.update({
    where: { id: student.id },
    data: { contributorAlias: `Helper-${run.slice(0, 8)}` },
  });
  admin = await account("ADMIN", "reviewer");
  other = await account("STUDENT", "outsider");
});
test.afterAll(async () => {
  await db.user.deleteMany({
    where: { id: { in: [student?.id, admin?.id, other?.id].filter(Boolean) } },
  });
  await db.paper.deleteMany({ where: { examId } });
  await db.exam.deleteMany({ where: { id: examId } });
  await db.authority.deleteMany({ where: { id: authorityId } });
  await db.sourceDocument.deleteMany({
    where: {
      url: { startsWith: `https://example.com/contribution-test/${run}/` },
    },
  });
  await db.$disconnect();
});
test("member submission remains private; admin publishes once, credits leaderboard, and can revoke", async ({
  page,
  context,
}) => {
  await login(context, student.token);
  expect((await upload(page.request, "A")).status()).toBe(201);
  const c = await db.contribution.findFirstOrThrow({
    where: { userId: student.id, shift: "A" },
  });
  expect(c.status).toBe("PENDING");
  expect(await db.paper.count({ where: { examId } })).toBe(0);
  await page.goto("/leaderboard");
  await expect(
    page
      .getByRole("main")
      .getByRole("cell", { name: `Helper-${run.slice(0, 8)}`, exact: true }),
  ).toHaveCount(0);
  expect((await upload(page.request, "A")).status()).toBe(200);
  expect(
    (
      await page.request.post(`/api/contributions/${c.id}/review`, {
        headers,
        data: { decision: "APPROVE", note: "Student cannot approve this" },
      })
    ).status(),
  ).toBe(403);
  await login(context, other.token);
  expect((await page.request.get(`/api/contributions/${c.id}`)).status()).toBe(
    404,
  );
  await page.goto("/admin/users");
  await page.waitForURL("**/dashboard");
  await login(context, admin.token);
  await page.goto("/admin");
  await page.screenshot({
    path: "test-results/admin-start.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/admin-start-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(
    page.getByRole("region", { name: "Awaiting approval" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Review papers →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review papers", exact: true }),
  ).toBeVisible();
  await page.goto(`/admin/contributions/${c.id}`);
  await expect(
    page.getByRole("navigation", { name: "Paper review steps" }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByText("Other decisions: reject, or publish with unavailable keys", {
      exact: true,
    })
    .click();
  await page
    .getByRole("main")
    .getByLabel("Review note (shared with contributor)")
    .fill("Compared synthetic questions, rights and key references.");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Approve and publish" })
    .click();
  await expect(
    page
      .getByRole("main")
      .getByRole("status")
      .filter({ hasText: "Paper published" }),
  ).toContainText("Paper published");
  const approved = await db.contribution.findUniqueOrThrow({
    where: { id: c.id },
  });
  expect(approved.status).toBe("APPROVED");
  expect(
    (await db.paper.findUniqueOrThrow({ where: { id: approved.paperId! } }))
      .status,
  ).toBe("PUBLISHED");
  expect(
    (
      await page.request.post(`/api/contributions/${c.id}/review`, {
        headers,
        data: {
          decision: "APPROVE",
          note: "Repeated approval must not score twice",
        },
      })
    ).status(),
  ).toBe(400);
  await page.goto("/admin");
  await page
    .getByRole("main")
    .getByText("Statistics and recent activity", { exact: true })
    .click();
  await expect(
    page
      .getByRole("main")
      .getByText("Contributions awaiting review", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/users");
  await page
    .getByRole("main")
    .getByRole("textbox", { name: "Search users" })
    .fill(`contributor-${run}`);
  await page
    .getByRole("main")
    .getByRole("button", { name: "Search", exact: true })
    .click();
  await expect(
    page.getByRole("main").getByRole("cell", {
      name: `contributor-${run}@contribution.test`,
      exact: true,
    }),
  ).toBeVisible();
  await login(context, student.token);
  await page.goto("/leaderboard");
  const row = page
    .getByRole("main")
    .getByRole("row")
    .filter({ hasText: `Helper-${run.slice(0, 8)}` });
  await expect(row.getByRole("cell").last()).toHaveText("10");
  const practice = await page.request.post("/api/practice", {
    headers,
    data: { paperId: approved.paperId, mode: "untimed" },
  });
  expect(practice.ok()).toBe(true);
  await login(context, admin.token);
  expect(
    (
      await page.request.post(`/api/contributions/${c.id}/review`, {
        headers,
        data: {
          decision: "REVOKE",
          note: "Revoked synthetic fixture for regression coverage",
        },
      })
    ).ok(),
  ).toBe(true);
  await login(context, student.token);
  await page.goto("/leaderboard");
  await expect(
    page
      .getByRole("main")
      .getByRole("cell", { name: `Helper-${run.slice(0, 8)}`, exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await page.request.post("/api/practice", {
        headers,
        data: { paperId: approved.paperId, mode: "untimed" },
      })
    ).ok(),
  ).toBe(false);
});
test("PDF checks, rejection, self-review protection, origin checks, and quota enforcement", async ({
  page,
  context,
}) => {
  expect(
    (await page.request.post("/api/contributions", { headers })).status(),
  ).toBe(401);
  await login(context, student.token);
  expect(
    (
      await upload(page.request, "BAD", { pdf: Buffer.from("not a PDF") })
    ).status(),
  ).toBe(400);
  expect(
    (await upload(page.request, "RIGHTS", { rights: "no" })).status(),
  ).toBe(400);
  const pdf = textPdf(undefined, 19_998_000);
  expect(pdf.length).toBeGreaterThan(19_000_000);
  expect(
    (
      await upload(page.request, "TOO-LARGE", {
        pdf: Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(20_000_001)]),
      })
    ).status(),
  ).toBe(413);
  expect(
    (
      await upload(page.request, "JSON-TOO-LARGE", {
        json: Buffer.alloc(2_000_001, " "),
      })
    ).status(),
  ).toBe(413);
  const response = await upload(page.request, "B", { pdf });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  const download = await page.request.get(`/api/contributions/${id}`);
  expect(download.headers()["content-disposition"]).toContain("attachment");
  const downloadedPdf = await download.body();
  expect(downloadedPdf.length).toBe(pdf.length);
  expect(createHash("sha256").update(downloadedPdf).digest("hex")).toBe(
    createHash("sha256").update(pdf).digest("hex"),
  );
  await login(context, admin.token);
  const review = paper("B", createHash("sha256").update(pdf).digest("hex"));
  review.source.permission = "PENDING";
  expect(
    (
      await page.request.post(`/api/contributions/${id}/review`, {
        headers,
        data: {
          decision: "APPROVE",
          note: "Insufficient rights must prevent publication",
          payload: review,
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(`/api/contributions/${id}/review`, {
        headers: { Origin: "https://example.org" },
        data: { decision: "REJECT", note: "Bad origin must not change review" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post(`/api/contributions/${id}/review`, {
        headers,
        data: {
          decision: "REJECT",
          note: "Synthetic rejection: rights not established",
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (await db.contribution.findUniqueOrThrow({ where: { id } })).status,
  ).toBe("REJECTED");
  const own = await upload(page.request, "ADMIN", {
    alias: `Admin-${run.slice(0, 8)}`,
  });
  expect(own.status()).toBe(201);
  const ownId = (await own.json()).id;
  expect(
    (
      await page.request.post(`/api/contributions/${ownId}/review`, {
        headers,
        data: { decision: "APPROVE", note: "Cannot approve own contribution" },
      })
    ).status(),
  ).toBe(400);
  await login(context, student.token);
  await page.goto("/contribute");
  await expect(
    page
      .getByRole("main")
      .getByText("Reviewer: Synthetic rejection: rights not established", {
        exact: true,
      }),
  ).toBeVisible();
  // Two simultaneous approvals can create only one paper and one credit.
  const pending = await upload(page.request, "C");
  expect(pending.status()).toBe(201);
  const pendingId = (await pending.json()).id;
  await login(context, admin.token);
  const reviews = await Promise.all(
    [1, 2].map(() =>
      page.request.post(`/api/contributions/${pendingId}/review`, {
        headers,
        data: {
          decision: "APPROVE",
          note: "Concurrent approval checked atomically",
        },
      }),
    ),
  );
  expect(reviews.filter((r) => r.ok())).toHaveLength(1);
  expect(await db.paper.count({ where: { examId, shift: "C" } })).toBe(1);
  await login(context, student.token);
  const existing = await db.contribution.count({
    where: { userId: student.id },
  });
  for (let i = existing; i < 5; i++)
    expect((await upload(page.request, `QUOTA-${i}`)).status()).toBe(201);
  expect((await upload(page.request, "OVER-QUOTA")).status()).toBe(400);
  expect(
    (
      await page.request.post("/api/contributor-profile", {
        headers,
        data: { alias: "" },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/leaderboard");
  await expect(
    page
      .getByRole("main")
      .getByRole("cell", { name: `Helper-${run.slice(0, 8)}`, exact: true }),
  ).toHaveCount(0);
});
test("PWA settings offer installation when browser supports the prompt", async ({
  page,
  context,
}) => {
  await login(context, student.token);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Install MindMitra" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await page
    .getByRole("main")
    .getByRole("button", { name: "Install MindMitra", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("status").last()).toContainText(
    "Installation requested",
  );
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons)
    expect((await page.request.get(icon.src)).ok()).toBe(true);
});

test("administrator can upload and publish own PDF without leaderboard credit", async ({
  page,
  context,
}) => {
  await login(context, student.token);
  expect(
    (
      await page.request.post("/api/contributions", {
        headers,
        multipart: { adminUpload: "yes" },
      })
    ).status(),
  ).toBe(403);
  await login(context, admin.token);
  const alias = `Admin-${run.slice(0, 8)}`;
  expect(
    (
      await page.request.post("/api/contributor-profile", {
        headers,
        data: { alias },
      })
    ).ok(),
  ).toBe(true);
  const main = page.getByRole("main");
  const pdf = Buffer.from("%PDF-1.4\nSYNTHETIC ADMIN PDF TEST ONLY\n%%EOF");
  const uploaded = await page.request.post("/api/contributions", {
    headers,
    multipart: {
      adminUpload: "yes",
      examId,
      year: "2025",
      stage: "TEST ONLY",
      shift: "ADMIN-PDF",
      title: "SYNTHETIC ADMIN PDF TEST ONLY",
      sourceUrl: paper("ADMIN-PDF").source.url,
      permissionEvidence: "Synthetic fixture authorized for testing",
      rightsConfirmed: "yes",
      file: {
        name: "admin-paper.pdf",
        mimeType: "application/pdf",
        buffer: pdf,
      },
    },
  });
  expect(uploaded.status()).toBe(201);
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: admin.id } }))
      .contributorAlias,
  ).toBe(alias);
  const c = await db.contribution.findUniqueOrThrow({
    where: { id: (await uploaded.json()).id },
  });
  expect(c.status).toBe("PENDING");
  expect(await db.paper.count({ where: { examId, shift: "ADMIN-PDF" } })).toBe(
    0,
  );
  await page.goto(`/admin/contributions/${c.id}`);
  const reviewed = paper(
    "ADMIN-PDF",
    createHash("sha256").update(pdf).digest("hex"),
  );
  await main.getByText("Advanced JSON (optional)", { exact: true }).click();
  await main
    .getByLabel("Reviewed question JSON", { exact: true })
    .fill(JSON.stringify(reviewed));
  await main
    .getByText("Other decisions: reject, or publish with unavailable keys", {
      exact: true,
    })
    .click();
  await main
    .getByLabel("Review note (shared with contributor)")
    .fill("Verified the administrator PDF, permission and answer key.");
  await main.getByRole("button", { name: "Approve and publish" }).click();
  await expect(
    main.getByRole("status").filter({ hasText: "Paper published" }),
  ).toContainText("Paper published for practice");
  const approved = await db.contribution.findUniqueOrThrow({
    where: { id: c.id },
  });
  expect(
    (await db.paper.findUniqueOrThrow({ where: { id: approved.paperId! } }))
      .status,
  ).toBe("PUBLISHED");
  await page.goto("/leaderboard");
  await expect(
    main.getByRole("cell", { name: alias, exact: true }),
  ).toHaveCount(0);
  const manage = "/api/admin/papers/manage";
  await login(context, student.token);
  expect(
    (
      await page.request.post(manage, {
        headers,
        data: { id: c.id, kind: "contribution", action: "DELETE" },
      })
    ).status(),
  ).toBe(403);
  await login(context, admin.token);
  expect(
    (
      await page.request.post(manage, {
        headers: { Origin: "https://example.org" },
        data: { id: c.id, kind: "contribution", action: "HIDE" },
      })
    ).status(),
  ).toBe(403);
  const history = await db.practiceSession.create({
    data: { userId: student.id, paperId: approved.paperId! },
  });
  await page.goto(`/admin/contributions/${c.id}`);
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Hide from students", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Paper hidden" }),
  ).toBeVisible();
  expect(
    (await db.paper.findUniqueOrThrow({ where: { id: approved.paperId! } }))
      .status,
  ).toBe("HIDDEN");
  expect(await db.practiceSession.count({ where: { id: history.id } })).toBe(1);
  const blocked = await page.request.post(manage, {
    headers,
    data: { id: c.id, kind: "contribution", action: "DELETE" },
  });
  expect(blocked.status()).toBe(409);
  expect((await blocked.json()).error).toContain("practice history");
  await db.practiceSession.delete({ where: { id: history.id } });
  await page.getByRole("button", { name: "Delete paper", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/contributions$/);
  expect(
    await db.paper.findUnique({ where: { id: approved.paperId! } }),
  ).toBeNull();
  expect(await db.contribution.findUnique({ where: { id: c.id } })).toBeNull();
});

test("uploaded PDF converts automatically, stays private, recovers an expired lease and publishes only after review", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await login(context, other.token);
  const response = await upload(page.request, "AUTO-PDF", {
    pdf: textPdf(),
    alias: "",
  });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  const conversionUrl = `/api/contributions/${id}/conversion`;
  await expect
    .poll(
      async () =>
        (await (await page.request.get(conversionUrl)).json()).conversionStatus,
      { timeout: 30_000 },
    )
    .toBe("READY");
  const converted = await (await page.request.get(conversionUrl)).json();
  expect(converted.payload.questions).toHaveLength(2);
  expect(converted.payload.questions[0].answer).toBeNull();
  expect(converted.payload.source.permission).toBe("PENDING");
  expect(converted.payload.source.checksum).toBe(
    createHash("sha256").update(textPdf()).digest("hex"),
  );
  expect(await db.paper.count({ where: { examId, shift: "AUTO-PDF" } })).toBe(
    0,
  );
  expect((await page.request.post(conversionUrl, { headers })).status()).toBe(
    403,
  );
  await login(context, student.token);
  expect((await page.request.get(conversionUrl)).status()).toBe(404);
  await login(context, admin.token);
  // Simulate a worker dying after it claimed the item; the startup loop reclaims it.
  await db.contribution.update({
    where: { id },
    data: {
      conversionStatus: "PROCESSING",
      conversionToken: randomUUID(),
      conversionStartedAt: new Date(Date.now() - 16 * 60_000),
      conversionAttempts: 1,
    },
  });
  await expect
    .poll(
      async () =>
        (await (await page.request.get(conversionUrl)).json()).conversionStatus,
      { timeout: 30_000 },
    )
    .toBe("READY");
  expect(
    (await db.contribution.findUniqueOrThrow({ where: { id } }))
      .conversionAttempts,
  ).toBe(2);
  await page.goto(`/admin/contributions/${id}`);
  const main = page.getByRole("main");
  await expect(
    main.getByLabel("Reviewed question JSON", { exact: true }),
  ).toHaveValue(/Which number is even/);
  expect(
    (
      await page.request.post(`/api/contributions/${id}/review`, {
        headers,
        data: {
          decision: "APPROVE",
          note: "Rights not yet verified; publication must fail",
          payload: converted.payload,
        },
      })
    ).status(),
  ).toBe(400);
  const reviewed = converted.payload;
  reviewed.source.permission = "AUTHORIZED";
  await main.getByText("Advanced JSON (optional)", { exact: true }).click();
  await main
    .getByLabel("Reviewed question JSON", { exact: true })
    .fill(JSON.stringify(reviewed));
  await main
    .getByText("Other decisions: reject, or publish with unavailable keys", {
      exact: true,
    })
    .click();
  await main
    .getByLabel("Review note (shared with contributor)")
    .fill(
      "Compared synthetic PDF with all extracted questions; authorized fixture.",
    );
  await main.getByRole("button", { name: "Approve and publish" }).click();
  await expect(
    main.getByRole("status").filter({ hasText: "Paper published" }),
  ).toContainText("Paper published and contributor credited");
  expect(
    (await db.contribution.findUniqueOrThrow({ where: { id } })).status,
  ).toBe("APPROVED");
});

test("failed PDF conversion exposes an error and an administrator can retry", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await login(context, other.token);
  const response = await upload(page.request, "AUTO-FAIL", {
    pdf: Buffer.from("%PDF-1.4\nbroken automatic conversion fixture"),
    alias: "",
  });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  const path = `/api/contributions/${id}/conversion`;
  await expect
    .poll(
      async () =>
        (await (await page.request.get(path)).json()).conversionStatus,
      { timeout: 30_000 },
    )
    .toBe("FAILED");
  const result = await (await page.request.get(path)).json();
  expect(result.conversionError).toContain("could not process");
  await login(context, admin.token);
  expect(
    (
      await page.request.post(path, {
        headers: { Origin: "https://example.org" },
      })
    ).status(),
  ).toBe(403);
  await page.goto(`/admin/contributions/${id}`);
  const main = page.getByRole("main");
  await expect(main.getByRole("alert")).toContainText("could not process");
  await main.getByRole("button", { name: "Retry conversion" }).click();
  await expect
    .poll(
      async () => {
        const row = await db.contribution.findUniqueOrThrow({ where: { id } });
        return {
          status: row.conversionStatus,
          attempts: row.conversionAttempts,
        };
      },
      { timeout: 30000 },
    )
    .toEqual({ status: "FAILED", attempts: 1 });
  await page.reload();
  await page
    .getByRole("button", { name: "Enter questions and answers manually" })
    .click();
  await expect(
    page.getByRole("region", { name: "Visual paper review" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Correct option A", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Correct option B", { exact: true }).check();
  await expect(
    page.getByLabel("Correct option B", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Finish review and publish to practice" }),
  ).toBeDisabled();
  await db.contribution.update({
    where: { id },
    data: { status: "REJECTED", conversionStatus: "CANCELLED" },
  });
  await page.reload();
  await expect(page.getByText(/This paper was rejected/)).toBeVisible();
  await page.getByRole("button", { name: "Reopen paper and convert" }).click();
  await expect(
    page.getByRole("button", { name: "Enter questions and answers manually" }),
  ).toBeVisible();
  expect(
    (await db.contribution.findUniqueOrThrow({ where: { id } })).status,
  ).toBe("PENDING");
});

test("PDF-only upload converts without metadata, reuses repeats and publishes to the chosen PYQ collection", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await login(context, admin.token);
  await page.goto("/admin/imports");
  const form = page.getByRole("form", { name: "Upload PDF only" });
  await expect(form.locator('input:not([type="hidden"])')).toHaveCount(1);
  await expect(form.getByLabel("Original source URL")).toHaveCount(0);
  const pdf = textPdf([
    `SYNTHETIC CONTRIBUTION EXAM 2025 ${run}`,
    "1. Which number is even?",
    "(A) Three",
    "(B) Four",
    "2. Choose the first letter.",
    "(A) Alpha",
    "(B) Beta",
  ]);
  const filename = `SYNTHETIC CONTRIBUTION EXAM 2025 ${run}.pdf`;
  const firstIntake = await page.request.post("/api/contributions", {
    headers,
    multipart: {
      pdfOnly: "yes",
      file: { name: filename, mimeType: "application/pdf", buffer: pdf },
    },
  });
  expect(firstIntake.status()).toBe(201);
  await form.getByLabel("Paper file", { exact: true }).setInputFiles({
    name: filename,
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await form.getByRole("button", { name: "Upload PDF", exact: true }).click();
  await page.waitForURL(/\/admin\/contributions\//);
  const id = page.url().split("/").at(-1)!;
  await expect
    .poll(
      async () =>
        (await db.contribution.findUniqueOrThrow({ where: { id } })).payload,
      { timeout: 30000 },
    )
    .not.toBeNull();
  const c = await db.contribution.findUniqueOrThrow({ where: { id } });
  expect(c.adminUpload).toBe(true);
  expect(c.examId).toBe(examId);
  expect(c.year).toBe(2025);
  expect(c.sourceUrl).toMatch(/^urn:sha256:/);
  expect(c.status).toBe("PENDING");
  const repeat = await page.request.post("/api/contributions", {
    headers,
    multipart: {
      adminUpload: "yes",
      pdfOnly: "yes",
      file: { name: filename, mimeType: "application/pdf", buffer: pdf },
    },
  });
  expect(repeat.status()).toBe(200);
  expect((await repeat.json()).id).toBe(id);
  expect(await db.contribution.count({ where: { checksum: c.checksum } })).toBe(
    1,
  );
  await page.reload();
  const editor = page.getByRole("region", { name: "Visual paper review" });
  await editor
    .getByLabel("Examination / PYQ collection", { exact: true })
    .selectOption(examId);
  await editor.getByLabel("Correct option B", { exact: true }).check();
  await editor
    .getByRole("button", { name: "Save answer & next", exact: true })
    .click();
  await expect(
    editor.getByLabel("Review question", { exact: true }),
  ).toHaveValue("1");
  await editor.getByLabel("Correct option A", { exact: true }).check();
  await editor
    .getByLabel("Permission evidence", { exact: true })
    .fill(
      "Synthetic PDF owned by the test author and authorized for this test.",
    );
  await editor
    .getByLabel("Reuse permission", { exact: true })
    .selectOption("AUTHORIZED");
  await editor
    .getByRole("button", {
      name: "Finish review and publish to practice",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("link", { name: "Open exam preparation", exact: true }),
  ).toBeVisible();
  const published = await db.contribution.findUniqueOrThrow({
    where: { id },
    include: { paper: true },
  });
  expect(published.paper?.status).toBe("PUBLISHED");
  expect(published.paper?.examId).toBe(examId);
  const again = await page.request.post("/api/contributions", {
    headers,
    multipart: {
      adminUpload: "yes",
      pdfOnly: "yes",
      file: { name: filename, mimeType: "application/pdf", buffer: pdf },
    },
  });
  expect(again.status()).toBe(200);
  expect((await again.json()).id).toBe(id);
  expect(await db.paper.count({ where: { id: published.paperId! } })).toBe(1);
  await login(context, other.token);
  const privateRepeat = await page.request.post("/api/contributions", {
    headers,
    multipart: {
      pdfOnly: "yes",
      file: { name: filename, mimeType: "application/pdf", buffer: pdf },
    },
  });
  expect(privateRepeat.status()).toBe(200);
  expect((await privateRepeat.json()).id).toBeUndefined();
});
