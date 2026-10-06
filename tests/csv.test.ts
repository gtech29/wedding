import { describe, expect, test } from "vitest";
import { csvCell, parseCsv, previewImport } from "@/lib/csv";

const header =
  "First Name,Last Name,Household,Email,Phone,Plus One Allowed\r\n";

describe("CSV validation", () => {
  test("quoted commas, escaped quotes, BOM, CRLF and multiline fields parse safely", () => {
    expect(
      parseCsv('\uFEFFName,Note\r\n"One, Two","Says ""hello""\nAgain"\r\n'),
    ).toEqual([
      ["Name", "Note"],
      ["One, Two", 'Says "hello"\nAgain'],
    ]);
  });
  test("malformed quoting is rejected", () => {
    expect(() => parseCsv('Name,Value\nA,"unclosed')).toThrow();
    expect(() => parseCsv('Name,Value\nA,"closed"junk')).toThrow();
    expect(() => parseCsv('Name,Value\nA,bad"quote')).toThrow();
  });
  test("valid rows parse permissions explicitly", () => {
    const preview = previewImport(
      `${header}First,Last,House,one@example.com,+52 646 111 1111,yes\n`,
    );
    expect(preview.valid).toBe(true);
    expect(preview.rows[0].plusOneAllowed).toBe(true);
  });
  test("bad email, bad phone, missing household and arbitrary permission values never silently import", () => {
    for (const row of [
      "First,Last,House,not-email,,no",
      "First,Last,House,,123,no",
      "First,Last,,,1234567890,no",
      "First,Last,House,,,maybe",
    ])
      expect(previewImport(header + row).valid).toBe(false);
  });
  test("duplicate guests in the same household block import", () => {
    const preview = previewImport(
      `${header}First,Last,House,a@example.com,,no\n first ,LAST,house,a@example.com,,no`,
    );
    expect(preview.valid).toBe(false);
    expect(
      preview.errors.some((issue) => issue.message.includes("Duplicate exact")),
    ).toBe(true);
  });
  test("legitimate shared names require household contacts and produce a warning", () => {
    const good = previewImport(
      `${header}First,Last,A,a@example.com,,no\nFirst,Last,B,b@example.com,,no`,
    );
    expect(good.valid).toBe(true);
    expect(good.warnings).toHaveLength(2);
    const bad = previewImport(`${header}First,Last,A,,,no\nFirst,Last,B,,,no`);
    expect(bad.valid).toBe(false);
  });
  test("conflicting contact information within one household blocks import", () => {
    expect(
      previewImport(
        `${header}First,Last,House,a@example.com,,no\nSecond,Last,House,b@example.com,,no`,
      ).valid,
    ).toBe(false);
  });
  test("identical contacts cannot strand duplicate-name invitations", () => {
    expect(
      previewImport(
        `${header}First,Last,A,same@example.com,,no\nFirst,Last,B,same@example.com,,no`,
      ).valid,
    ).toBe(false);
    expect(
      previewImport(
        `${header}First,Last,A,same@example.com,+52 646 111 1111,no\nFirst,Last,B,same@example.com,+52 646 222 2222,no`,
      ).valid,
    ).toBe(true);
  });
  test("spreadsheet formulas are neutralized even with leading whitespace", () => {
    for (const value of [
      "=HYPERLINK(1)",
      "+123",
      "-2+1",
      "@SUM(1)",
      "   =1+1",
      "\ttext",
      "\ntext",
    ])
      expect(csvCell(value)).toMatch(/^"'/);
    expect(csvCell('ordinary "text"')).toBe('"ordinary ""text"""');
  });
});
