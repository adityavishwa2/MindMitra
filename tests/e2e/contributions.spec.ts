import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
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
  options: { pdf?: Buffer; alias?: string; rights?: string } = {},
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
        buffer: options.pdf ?? Buffer.from(JSON.stringify(p)),
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
  await page.goto("/contribute");
  await page
    .getByRole("main")
    .getByLabel("Examination", { exact: true })
    .selectOption(examId);
  await page.getByRole("main").getByLabel("Year", { exact: true }).fill("2025");
  await page
    .getByRole("main")
    .getByLabel("Paper title")
    .fill("SYNTHETIC CONTRIBUTION TEST ONLY");
  await page
    .getByRole("main")
    .getByLabel("Stage", { exact: true })
    .fill("TEST ONLY");
  await page.getByRole("main").getByLabel("Shift", { exact: true }).fill("A");
  await page
    .getByRole("main")
    .getByLabel("Original source URL")
    .fill(paper("A").source.url);
  await page
    .getByRole("main")
    .getByLabel("Reuse permission and source evidence")
    .fill(paper("A").source.permissionEvidence);
  await page
    .getByRole("main")
    .getByLabel("Paper file")
    .setInputFiles({
      name: "paper.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(paper("A"))),
    });
  await page.getByRole("main").getByText("I have permission to submit").click();
  await page
    .getByRole("main")
    .getByLabel("Public contributor alias (optional)")
    .fill(`Helper-${run.slice(0, 8)}`);
  await page
    .getByRole("main")
    .getByRole("button", { name: "Submit for review" })
    .click();
  await expect(
    page.getByRole("main").getByRole("status").first(),
  ).toContainText("Submitted for review");
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
  expect((await upload(page.request, "A")).status()).toBe(409);
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
  await page.goto(`/admin/contributions/${c.id}`);
  await page
    .getByRole("main")
    .getByLabel("Review note (shared with contributor)")
    .fill("Compared synthetic questions, rights and key references.");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Approve and publish" })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "Paper published",
  );
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
  const pdf = Buffer.from("%PDF-1.4\nSYNTHETIC TEST ONLY\n%%EOF");
  const response = await upload(page.request, "B", { pdf });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  const download = await page.request.get(`/api/contributions/${id}`);
  expect(download.headers()["content-disposition"]).toContain("attachment");
  expect(await download.body()).toEqual(pdf);
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
  await expect(page.getByRole("main").getByRole("status")).toContainText(
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
  await page.goto("/admin/imports");
  const main = page.getByRole("main");
  await main.getByLabel("Examination", { exact: true }).selectOption(examId);
  await main.getByLabel("Year", { exact: true }).fill("2025");
  await main.getByLabel("Paper title").fill("SYNTHETIC ADMIN PDF TEST ONLY");
  await main.getByLabel("Stage", { exact: true }).fill("TEST ONLY");
  await main.getByLabel("Shift", { exact: true }).fill("ADMIN-PDF");
  await main
    .getByLabel("Original source URL")
    .fill(paper("ADMIN-PDF").source.url);
  await main
    .getByLabel("Reuse permission and source evidence")
    .fill("Synthetic fixture authorized for testing");
  const pdf = Buffer.from("%PDF-1.4\nSYNTHETIC ADMIN PDF TEST ONLY\n%%EOF");
  await main
    .getByLabel("Paper file", { exact: true })
    .setInputFiles({
      name: "admin-paper.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });
  await main.getByText("I have permission to submit").click();
  await main.getByRole("button", { name: "Upload PDF", exact: true }).click();
  await expect(main.getByRole("status").first()).toContainText(
    "PDF saved privately",
  );
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: admin.id } }))
      .contributorAlias,
  ).toBe(alias);
  const c = await db.contribution.findFirstOrThrow({
    where: { userId: admin.id, adminUpload: true, shift: "ADMIN-PDF" },
  });
  expect(c.status).toBe("PENDING");
  expect(await db.paper.count({ where: { examId, shift: "ADMIN-PDF" } })).toBe(
    0,
  );
  await main
    .getByRole("link", { name: "SYNTHETIC ADMIN PDF TEST ONLY →" })
    .click();
  const reviewed = paper(
    "ADMIN-PDF",
    createHash("sha256").update(pdf).digest("hex"),
  );
  await main
    .getByLabel("Reviewed question JSON", { exact: true })
    .fill(JSON.stringify(reviewed));
  await main
    .getByLabel("Review note (shared with contributor)")
    .fill("Verified the administrator PDF, permission and answer key.");
  await main.getByRole("button", { name: "Approve and publish" }).click();
  await expect(main.getByRole("status")).toContainText(
    "Paper published for practice",
  );
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
});
