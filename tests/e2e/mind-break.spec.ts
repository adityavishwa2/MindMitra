import { test, expect } from "@playwright/test";
test("mobile paper toss, pause, restart and retired uploads", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/games/paper-toss");
  await expect(
    page.getByRole("heading", { name: "Paper Ball Toss" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByText("Learn the rules", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play round", exact: true }).click();
  await page.getByRole("button", { name: "Throw paper", exact: true }).click();
  await expect(page.getByText("Score 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByText("Paused. Your game is saved for this visit."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByText("Score 0", { exact: true })).toBeVisible();
  const board = await page.locator(".toss-board").boundingBox();
  if (!board) throw new Error("Toss board missing");
  await page.mouse.move(
    board.x + board.width / 2,
    board.y + board.height * 0.875,
  );
  await page.mouse.down();
  await page.mouse.move(
    board.x + board.width / 2,
    board.y + board.height * 0.525,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(page.getByText("Score 1", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await request.post("/api/video-submissions", { data: {} })).status(),
  ).toBe(410);
  await page.screenshot({
    path: "test-results/mind-break-mobile.png",
    fullPage: true,
  });
});
test("bridge supports construction, undo, redo and a passing truss", async ({
  page,
}) => {
  await page.goto("/games/bridge-builder");
  await page.getByRole("button", { name: "Play round", exact: true }).click();
  await page.getByRole("button", { name: "Test crossing" }).click();
  await expect(page.getByText(/Build a continuous road/)).toBeVisible();
  const point = (x: number, y: number) =>
    page.getByRole("button", { name: new RegExp(`^Point ${x}, ${y}(,|$)`) });
  const beam = async (x: number, y: number, a: number, b: number) => {
    await point(x, y).click();
    await point(a, b).click();
  };
  for (let x = 1; x < 7; x++) await beam(x, 4, x + 1, 4);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  for (let x = 1; x < 7; x++) await beam(x, 3, x + 1, 3);
  for (let x = 1; x <= 7; x++) await beam(x, 3, x, 4);
  for (let x = 1; x < 7; x++) await beam(x, 3, x + 1, 4);
  await page.getByRole("button", { name: "Test crossing" }).click();
  await expect(
    page.getByText("Stable crossing! Your bridge carried the car."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try heavier car" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/mind-break-bridge.png",
    fullPage: true,
  });
});
test("football human move and bot response on tablet", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/games/paper-football");
  await page.getByRole("button", { name: "Play round", exact: true }).click();
  await page
    .getByRole("button", { name: "Move to column 4, row 4", exact: true })
    .click();
  await expect(
    page.getByText("Bot is thinking…", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Your move. Tap a glowing point or swipe.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mind-break-football.png",
    fullPage: true,
  });
});
