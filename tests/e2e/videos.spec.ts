import { test, expect, type BrowserContext } from "@playwright/test";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fixtureVideo } from "../helpers/video";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test"))
  throw Error("Use isolated *_test database");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const origin = "http://localhost:3001",
  headers = { Origin: origin },
  run = randomUUID();
let owner: { id: string; token: string },
  admin: { id: string; token: string },
  other: { id: string; token: string };
const published: string[] = [];
async function account(role: string, name: string) {
  const user = await db.user.create({
    data: { name, email: `${name}-${run}@video.test`, role, onboarded: true },
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
const checks = {
  watchedInFull: true,
  educational: true,
  noNudity: true,
  noAbuse: true,
  noPromotion: true,
};
test.use({
  launchOptions: {
    executablePath:
      process.env.CHROMIUM_PATH ??
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: [
      "--no-sandbox",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  },
});
test.beforeAll(async () => {
  owner = await account("STUDENT", "VideoOwner");
  admin = await account("ADMIN", "VideoModerator");
  other = await account("STUDENT", "VideoViewer");
});
test.afterAll(async () => {
  await db.videoReport.deleteMany({ where: { videoId: { in: published } } });
  await db.watchSession.deleteMany({ where: { videoId: { in: published } } });
  await db.user.deleteMany({
    where: { id: { in: [owner?.id, admin?.id, other?.id].filter(Boolean) } },
  });
  await db.video.deleteMany({ where: { id: { in: published } } });
  await db.$disconnect();
});

test("video uploads stay private until full content review, play natively and are hidden after a report", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  expect(
    (await page.request.post("/api/video-submissions", { headers })).status(),
  ).toBe(401);
  await login(context, owner.token);
  await page.goto("/watch");
  const launch = page.getByRole("link", { name: /Create a learning video/ });
  const original = await launch.evaluate(
    (el) => getComputedStyle(el).transform,
  );
  await launch.hover();
  await page.waitForTimeout(350);
  expect(
    await launch.evaluate((el) => getComputedStyle(el).transform),
  ).not.toBe(original);
  await launch.click();
  const main = page.getByRole("main");
  const response = await page.request.get("/watch/create");
  expect(response.headers()["permissions-policy"]).toContain("camera=(self)");
  await main.getByLabel("Video file", { exact: true }).setInputFiles({
    name: "synthetic.webm",
    mimeType: "video/webm",
    buffer: fixtureVideo(),
  });
  await main
    .getByLabel("Lesson title")
    .fill("SYNTHETIC EDUCATIONAL VIDEO ONLY");
  await main.getByLabel("Creator name").fill("Synthetic test author");
  await main.getByText("I created this video or have permission").click();
  await main.getByText("This video is educational").click();
  await main.getByRole("button", { name: "Send my lesson for review" }).click();
  await expect(main.getByRole("status")).toContainText("uploaded privately");
  const submission = await db.videoSubmission.findFirstOrThrow({
    where: { userId: owner.id },
  });
  expect(submission.status).toBe("PENDING");
  expect(submission.videoId).toBeNull();
  const media = `/api/video-submissions/${submission.id}/media`,
    review = `/api/video-submissions/${submission.id}/review`;
  expect((await page.request.get(media)).status()).toBe(200);
  expect(
    (
      await page.request.post(review, {
        headers,
        data: {
          decision: "APPROVE",
          note: "Must not let members publish videos",
          ...checks,
        },
      })
    ).status(),
  ).toBe(403);
  await login(context, other.token);
  expect((await page.request.get(media)).status()).toBe(404);
  await page.goto("/watch");
  await expect(
    page.getByRole("heading", { name: submission.title }),
  ).toHaveCount(0);
  await login(context, admin.token);
  expect(
    (
      await page.request.post(review, {
        headers,
        data: {
          decision: "APPROVE",
          note: "Cannot approve without individual safety checks",
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(review, {
        headers,
        data: {
          decision: "APPROVE",
          note: "Nudity check failed; do not publish",
          ...checks,
          noNudity: false,
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(review, {
        headers: { Origin: "https://example.org" },
        data: {
          decision: "APPROVE",
          note: "Invalid origin must not publish",
          ...checks,
        },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/admin");
  await page
    .getByRole("link", { name: "Review videos →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Lessons awaiting approval",
      exact: false,
    }),
  ).toBeVisible();
  await page.goto(`/admin/videos/${submission.id}`);
  await expect(
    page.getByRole("button", { name: "Approve educational video" }),
  ).toBeDisabled();
  await expect(
    page.getByText("0 of 5 checks completed.", { exact: false }),
  ).toBeVisible();
  for (const label of [
    "I watched the complete",
    "It teaches an educational",
    "No nudity or sexual",
    "No abuse, hate",
    "No advertising, external",
  ])
    await page.getByText(label).click();
  await expect(
    page.getByRole("button", { name: "Approve educational video" }),
  ).toBeDisabled();
  await page
    .getByLabel("Moderation note")
    .fill(
      "Watched complete synthetic video; educational fixture with all safety checks satisfied.",
    );
  await page.getByRole("button", { name: "Approve educational video" }).click();
  await expect(main.getByRole("status")).toContainText(
    "approved and published",
  );
  const approved = await db.videoSubmission.findUniqueOrThrow({
    where: { id: submission.id },
  });
  published.push(approved.videoId!);
  await login(context, other.token);
  const range = await page.request.get(media, {
    headers: { Range: "bytes=0-15" },
  });
  expect(range.status()).toBe(206);
  expect((await range.body()).length).toBe(16);
  expect(range.headers()["cache-control"]).toContain("no-store");
  expect(
    (
      await page.request.get(media, { headers: { Range: "bytes=999999999-" } })
    ).status(),
  ).toBe(416);
  await page.goto("/watch");
  await expect(
    page.getByRole("button", { name: "Play this video" }),
  ).toHaveCount(0);
  const reel = page.locator("video.video-frame").first();
  await expect(reel).toHaveAttribute("src", media);
  await expect
    .poll(() => reel.evaluate((v: HTMLVideoElement) => !v.paused))
    .toBe(true);
  await page.getByRole("button", { name: "Like video", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unlike video", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const like = await page.request.post(`/api/videos/${approved.videoId}/like`, {
    headers,
    data: { liked: true },
  });
  expect(await like.json()).toMatchObject({ liked: true, count: 1 });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Unlike video", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Unlike video", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Like video", exact: true }),
  ).toBeVisible();
  expect(
    await db.videoLike.count({ where: { videoId: approved.videoId! } }),
  ).toBe(0);
  expect(await page.locator("iframe").count()).toBe(0);
  expect(
    (
      await page.request.post("/api/report", {
        headers,
        data: {
          videoId: approved.videoId,
          reason: "Synthetic moderation regression concern",
        },
      })
    ).ok(),
  ).toBe(true);
  expect((await page.request.get(media)).status()).toBe(404);
  expect(
    (await db.video.findUniqueOrThrow({ where: { id: approved.videoId! } }))
      .approved,
  ).toBe(false);
  expect(
    (
      await db.videoSubmission.findUniqueOrThrow({
        where: { id: submission.id },
      })
    ).status,
  ).toBe("PENDING");
  await login(context, admin.token);
  expect(
    (
      await page.request.post(review, {
        headers,
        data: {
          decision: "REJECT",
          note: "Rejected after a synthetic policy concern",
        },
      })
    ).ok(),
  ).toBe(true);
});

test("records a browser lesson, normalizes streaming WebM and publishes from the private admin studio", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await login(context, admin.token);
  await context.grantPermissions(["camera", "microphone"], { origin });
  await page.goto("/admin/videos/upload");
  expect(
    (await page.request.get("/admin/videos/upload")).headers()[
      "permissions-policy"
    ],
  ).toContain("camera=(self)");
  const main = page.getByRole("main");
  await main
    .getByRole("button", { name: "Record a lesson", exact: true })
    .click();
  await expect(
    main.getByRole("button", { name: /Stop recording/ }),
  ).toBeVisible();
  await page.waitForTimeout(2300);
  await main.getByRole("button", { name: /Stop recording/ }).click();
  await expect(main.getByText(/Ready: recorded-lesson/)).toBeVisible();
  await main
    .getByLabel("Lesson title")
    .fill("SYNTHETIC BROWSER RECORDED LESSON");
  await expect(main.getByLabel("Creator name")).toHaveValue(
    "MindMitra Educators",
  );
  await main.getByText("I created this video or have permission").click();
  await main.getByText("This video is educational").click();
  await main.getByRole("button", { name: "Send my lesson for review" }).click();
  await expect(page).toHaveURL(/\/admin\/videos\/(?!upload$)[^/]+$/);
  const submitted = await db.videoSubmission.findFirstOrThrow({
    where: { userId: admin.id },
  });
  expect(submitted.durationSeconds).toBeGreaterThan(1);
  expect(submitted.creator).toBe("MindMitra Educators");
  await expect(
    page.getByRole("button", { name: "Approve educational video" }),
  ).toBeDisabled();
  for (const label of [
    "I watched the complete",
    "It teaches an educational",
    "No nudity or sexual",
    "No abuse, hate",
    "No advertising, external",
  ])
    await page.getByText(label).click();
  await page
    .getByLabel("Moderation note")
    .fill(
      "Reviewed my complete educational lesson and all publication checks.",
    );
  await page.getByRole("button", { name: "Approve educational video" }).click();
  await expect(page.getByRole("status")).toContainText(
    "approved and published",
  );
  const approved = await db.videoSubmission.findUniqueOrThrow({
    where: { id: submitted.id },
  });
  expect(approved.status).toBe("APPROVED");
  published.push(approved.videoId!);
  const lesson = await db.video.findUniqueOrThrow({
    where: { id: approved.videoId! },
  });
  expect(lesson.creator).toBe("MindMitra Educators");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/watch");
  expect(
    await page
      .locator(".lesson-launch")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
});

test("rejects noneducational metadata and approval bypass, and revocation blocks later playback", async ({
  page,
  context,
}) => {
  await login(context, owner.token);
  const multipart = {
    title: "SYNTHETIC REVOCATION LESSON",
    creator: "Fixture creator",
    category: "Science",
    learningObjective:
      "Synthetic fixture to verify video publication and revocation",
    rightsConfirmed: "yes",
    policyConfirmed: "yes",
    file: {
      name: "lesson.webm",
      mimeType: "video/webm",
      buffer: fixtureVideo("red"),
    },
  };
  expect(
    (
      await page.request.post("/api/video-submissions", {
        headers,
        multipart: { ...multipart, category: "Entertainment" },
      })
    ).status(),
  ).toBe(400);
  const response = await page.request.post("/api/video-submissions", {
    headers,
    multipart,
  });
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  await login(context, admin.token);
  expect(
    (
      await page.request.post("/api/admin/video", {
        headers,
        data: {
          title: "Synthetic external video",
          creator: "Fixture author",
          category: "Science",
          youtubeId: "policyTest1",
          approved: true,
        },
      })
    ).status(),
  ).toBe(400);
  const path = `/api/video-submissions/${id}/review`;
  const decisions = await Promise.all(
    [1, 2].map(() =>
      page.request.post(path, {
        headers,
        data: {
          decision: "APPROVE",
          note: "Concurrent safety review of a synthetic fixture",
          ...checks,
        },
      }),
    ),
  );
  expect(decisions.filter((r) => r.ok())).toHaveLength(1);
  const submission = await db.videoSubmission.findUniqueOrThrow({
    where: { id },
  });
  published.push(submission.videoId!);
  await login(context, other.token);
  expect(
    (await page.request.get(`/api/video-submissions/${id}/media`)).status(),
  ).toBe(200);
  await login(context, admin.token);
  expect(
    (
      await page.request.post(path, {
        headers,
        data: {
          decision: "REVOKE",
          note: "Revoking synthetic fixture to verify media access",
        },
      })
    ).ok(),
  ).toBe(true);
  await login(context, other.token);
  expect(
    (await page.request.get(`/api/video-submissions/${id}/media`)).status(),
  ).toBe(404);
  expect(
    (await db.videoSubmission.findUniqueOrThrow({ where: { id } })).status,
  ).toBe("REVOKED");
});

test("reels swipe on phone, tablet and laptop with persistent likes and one active player", async ({
  page,
  context,
}) => {
  const { createHash } = await import("node:crypto");
  const mediaBytes = fixtureVideo("orange");
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) {
    const video = await db.video.create({
      data: {
        title: `AAA REEL ${i} ${run}`,
        creator: "Fixture teacher",
        category: "Science",
        approved: true,
      },
    });
    published.push(video.id);
    ids.push(video.id);
    await db.videoSubmission.create({
      data: {
        userId: owner.id,
        title: video.title,
        creator: video.creator,
        category: "Science",
        learningObjective: "",
        status: "APPROVED",
        videoId: video.id,
        fileName: "fixture.webm",
        mimeType: "video/webm",
        bytes: mediaBytes,
        checksum: createHash("sha256")
          .update(mediaBytes)
          .update(String(i) + run)
          .digest("hex"),
        durationSeconds: 2,
      },
    });
  }
  await login(context, other.token);
  for (const [width, height] of [
    [390, 844],
    [820, 1180],
    [1366, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/watch");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const actions = page.locator(".reel-actions").first();
    if (width === 390) {
      const bounds = await actions.boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThan(height - 64);
    }
    const feed = page.getByRole("region", {
      name: "Scrollable learning videos",
    });
    const first = feed.locator("article").nth(0).locator("video");
    await expect
      .poll(() => first.evaluate((v: HTMLVideoElement) => !v.paused))
      .toBe(true);
    await feed.evaluate((el) =>
      el.scrollTo({ top: el.clientHeight, behavior: "instant" }),
    );
    const second = feed.locator("article").nth(1).locator("video");
    await expect
      .poll(() => second.evaluate((v: HTMLVideoElement) => !v.paused))
      .toBe(true);
    expect(await first.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    const card = feed.locator("article").nth(1);
    await expect(
      card.getByRole("button", { name: "Pause video", exact: true }),
    ).toBeVisible();
    if (width === 390) {
      await card
        .getByRole("button", { name: "Like video", exact: true })
        .click();
      await expect(
        card.getByRole("button", { name: "Unlike video", exact: true }),
      ).toBeVisible();
    } else
      await expect(
        card.getByRole("button", { name: "Unlike video", exact: true }),
      ).toBeVisible();
    await page.screenshot({
      path: `test-results/reels-${width}.png`,
      fullPage: true,
    });
  }
  expect(
    await db.videoLike.count({ where: { userId: other.id, videoId: ids[1] } }),
  ).toBe(1);
  expect(
    (
      await page.request.post(`/api/videos/${ids[0]}/like`, {
        headers: { Origin: "https://example.org" },
        data: { liked: true },
      })
    ).status(),
  ).toBe(403);
});

test("20 daily uploads per user are allowed independently of the pending queue", async ({
  page,
  context,
}) => {
  const quotaUser = await account("STUDENT", "QuotaFixture");
  try {
    const mediaBytes = fixtureVideo("pink");
    for (let i = 0; i < 20; i++)
      await db.videoSubmission.create({
        data: {
          userId: quotaUser.id,
          title: "Quota fixture",
          creator: "Test",
          category: "Science",
          learningObjective: "",
          fileName: "q.webm",
          mimeType: "video/webm",
          bytes: mediaBytes,
          checksum: `quota-${run}-${i}`,
          durationSeconds: 2,
          createdAt: new Date(),
        },
      });
    await login(context, quotaUser.token);
    const data = {
      title: "Daily quota lesson",
      creator: "Fixture teacher",
      rightsConfirmed: "yes",
      policyConfirmed: "yes",
      file: { name: "q.webm", mimeType: "video/webm", buffer: mediaBytes },
    };
    const blocked = await page.request.post("/api/video-submissions", {
      headers,
      multipart: data,
    });
    expect(blocked.status()).toBe(400);
    expect((await blocked.json()).error).toContain("20 per");
    const oldest = await db.videoSubmission.findFirstOrThrow({
      where: { userId: quotaUser.id },
    });
    await db.videoSubmission.update({
      where: { id: oldest.id },
      data: { createdAt: new Date(Date.now() - 25 * 3600000) },
    });
    const allowed = await page.request.post("/api/video-submissions", {
      headers,
      multipart: data,
    });
    expect(allowed.status(), await allowed.text()).toBe(201);
    expect(
      await db.videoSubmission.count({
        where: { userId: quotaUser.id, status: "PENDING" },
      }),
    ).toBe(21);
  } finally {
    await db.user.delete({ where: { id: quotaUser.id } });
  }
});

test("admin studio is separate, responsive and private to administrator accounts", async ({
  page,
  context,
}) => {
  await login(context, admin.token);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { name: /Welcome, Aditya Vishwakarma/ }),
  ).toBeVisible();
  await expect(page.locator(".app-shell")).toHaveCount(0);
  await page
    .locator(".studio-page")
    .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  await expect(page.locator(".studio-shell")).toHaveCSS(
    "color-scheme",
    "light",
  );
  for (const [width, height] of [
    [390, 844],
    [820, 1180],
    [1366, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(
      page.getByRole("link", { name: "Upload a PDF", exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/admin-studio-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("navigation", { name: "Administration" })
    .getByRole("link", { name: "Upload paper", exact: true })
    .click();
  await expect(
    page.getByRole("main").locator('input[type="file"]:visible'),
  ).toHaveCount(1);
  await login(context, owner.token);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await page.locator("body").innerText()).not.toContain(
    "Aditya Vishwakarma",
  );
  await page.goto("/");
  await expect(page.getByText(/Built by an IITian/)).toBeVisible();
  expect(await page.content()).not.toContain("Aditya Vishwakarma");
  expect(await page.content()).not.toContain("adityavishwa933@gmail.com");
});
