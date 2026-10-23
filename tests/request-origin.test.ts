import { expect, it } from "vitest";
import { validRequestOrigin } from "../lib/request-origin";

function request(origin: string | null, host = "localhost:3001") {
  const headers = new Headers({ host });
  if (origin !== null) headers.set("origin", origin);
  return { url: "http://0.0.0.0:3001/api/contributions", headers };
}

it("allows actual loopback addresses despite a stale local NEXTAUTH_URL", () => {
  for (const host of ["localhost:3001", "127.0.0.1:3001", "[::1]:3001"])
    expect(validRequestOrigin(request(`http://${host}`, host), "http://localhost:3000")).toBe(true);
  expect(validRequestOrigin(request("http://localhost:3001"), "")).toBe(true);
});

it("retains canonical production origin checks and rejects cross-site or missing origins", () => {
  expect(validRequestOrigin(request("https://learn.example.com"), "https://learn.example.com")).toBe(true);
  for (const origin of [null, "null", "https://evil.example", "http://localhost:3002", "http://localhost.evil:3001", "http://localhost:3001/path"])
    expect(validRequestOrigin(request(origin), "http://localhost:3000")).toBe(false);
  expect(validRequestOrigin(request("http://localhost:3001"), "https://learn.example.com")).toBe(false);
  const forged = request("https://evil.example");
  forged.headers.set("x-forwarded-host", "evil.example");
  expect(validRequestOrigin(forged, "http://localhost:3000")).toBe(false);
  expect(validRequestOrigin(request("http://localhost:3001"), "bad url")).toBe(false);
});
