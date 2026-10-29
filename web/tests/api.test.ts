import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "../src/api";
afterEach(() => vi.unstubAllGlobals());
describe("API会话与错误兼容 / API session and error compatibility", () => {
  it("记录请求保留同源会话与JSON字段 / records retain same-origin cookies and JSON fields", async () => {
    const mock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ record: { id: 1 } }),
    }));
    vi.stubGlobal("fetch", mock);
    expect(
      await request("/api/records", {
        method: "POST",
        body: '{"side":"left"}',
      }),
    ).toEqual({ record: { id: 1 } });
    expect(mock.mock.calls[0]).toEqual([
      "/api/records",
      {
        method: "POST",
        body: '{"side":"left"}',
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      },
    ]);
  });
  it("保留服务错误码供本地化 / preserves server codes for localization", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({
          error: { code: "RECORD_EXISTS", message: "English message" },
        }),
      })),
    );
    await expect(request("/api/records")).rejects.toThrow("RECORD_EXISTS");
  });
  it("删除成功兼容204 / successful deletion accepts HTTP 204", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 204 })),
    );
    expect(
      await request("/api/records/1", { method: "DELETE" }),
    ).toBeUndefined();
  });
});
