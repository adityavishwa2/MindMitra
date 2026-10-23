import { test, expect } from "@playwright/test";
test("retired video endpoints cannot upload, stream, review or like", async ({
  request,
}) => {
  for (const path of [
    "/api/video-submissions",
    "/api/video-submissions/legacy/media",
    "/api/video-submissions/legacy/review",
    "/api/videos/legacy/like",
  ]) {
    expect((await request.get(path)).status()).toBe(410);
    expect((await request.post(path, { data: {} })).status()).toBe(410);
  }
});
