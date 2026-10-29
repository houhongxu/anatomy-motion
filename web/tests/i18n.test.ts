import { describe, expect, it } from "vitest";
import { errorText, sourceLabel, t, text } from "../src/i18n";
describe("单语言界面 / single-locale UI", () => {
  it("按locale仅返回一种语言 / returns one language per locale", () => {
    expect(t("zh", "save")).toBe("保存记录");
    expect(t("en", "save")).toBe("Save record");
    expect(text("en", { zh: "胸大肌", en: "Pectoralis major" })).toBe(
      "Pectoralis major",
    );
  });
  it("API错误映射为本地化信息 / API errors map to localized messages", () => {
    expect(errorText("zh", new Error("LOGIN_FAILED"))).toBe(
      "用户名或密码不正确。",
    );
    expect(errorText("en", new Error("INVALID_RECORD"))).toContain(
      "Invalid record.",
    );
    expect(errorText("zh", new Error("sensitive upstream error"))).toBe(
      t("zh", "networkError"),
    );
  });
  it("来源与未校核提示本地化 / localizes sources and clinical review notice", () => {
    expect(sourceLabel("zh", "who2008", "English original title")).toContain(
      "标准针灸",
    );
    expect(t("en", "sourceNotice")).toContain("56 representative");
    expect(t("zh", "unreviewed")).toBe("未经临床审校");
    expect(t("en", "sourceModel")).toContain("CC BY-SA 2.1 JP");
  });
});
