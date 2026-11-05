import { describe, expect, it } from "vitest";
import { csvEscape } from "./csv";

describe("csvEscape", () => {
  it("leaves plain text alone", () => {
    expect(csvEscape("Rahim")).toBe("Rahim");
  });

  it("quotes separators, quotes and line breaks", () => {
    expect(csvEscape('a,b "c"')).toBe('"a,b ""c"""');
    expect(csvEscape("line\nbreak")).toBe('"line\nbreak"');
  });

  it("neutralises spreadsheet formulas", () => {
    expect(csvEscape("=HYPERLINK(\"http://evil\")")).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvEscape("+1")).toBe("'+1");
    expect(csvEscape("-2+3")).toBe("'-2+3");
    expect(csvEscape("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvEscape("\tcmd")).toBe("'\tcmd");
  });
});
