import { afterEach, describe, expect, it, vi } from "vitest";
import { errorCode, errorMessage, reportError } from "./index";

describe("monitoring", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads Firebase error codes and messages", () => {
    expect(errorCode({ code: "permission-denied" })).toBe("permission-denied");
    expect(errorCode(new Error("x"))).toBeUndefined();
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
  });

  it("always logs, and never throws without a Sentry DSN", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => reportError(new Error("x"), { where: "test" })).not.toThrow();
    expect(log).toHaveBeenCalledWith("[mk-workout]", expect.any(Error), { where: "test" });
  });
});
