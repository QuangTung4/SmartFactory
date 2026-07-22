import { describe, expect, it } from "vitest";
import { getShiftContext, resolveNow } from "@/lib/shift-window";

function at(isoLocal: string) {
  // isoLocal: YYYY-MM-DDTHH:mm
  const [datePart, timePart] = isoLocal.split("T");
  const [y, mo, da] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, mo - 1, da, hh, mm, 0, 0);
}

describe("shift-window", () => {
  it("opens day submit at 07:00 and locks after 08:30", () => {
    const open = getShiftContext(at("2026-07-21T07:30"));
    expect(open.canSubmit).toBe(true);
    expect(open.shift.id).toBe("day");
    expect(open.phase).toBe("submit_open");

    const locked = getShiftContext(at("2026-07-21T08:31"));
    expect(locked.canSubmit).toBe(false);
    expect(locked.phase).toBe("locked");
  });

  it("opens night submit at 19:00 and locks after 20:30", () => {
    const open = getShiftContext(at("2026-07-21T19:15"));
    expect(open.canSubmit).toBe(true);
    expect(open.shift.id).toBe("night");

    const locked = getShiftContext(at("2026-07-21T20:31"));
    expect(locked.canSubmit).toBe(false);
    expect(locked.shift.id).toBe("night");
  });

  it("parses mockTime HH:mm", () => {
    const d = resolveNow("?mockTime=08:25");
    expect(d.getHours()).toBe(8);
    expect(d.getMinutes()).toBe(25);
  });
});
