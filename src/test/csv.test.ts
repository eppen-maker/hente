import { describe, expect, it } from "vitest";
import { parseCsv, pick, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("writes RFC 4180 quoted values", () => {
    const output = toCsv(["Selger", "Kunde"], [["Johannes", 'Kari "K" Olsen'], ["Espen", "Per; Hansen"]]);
    expect(output).toContain('"Kari ""K"" Olsen"');
    expect(output).toContain('"Per; Hansen"');
    expect(output.startsWith("﻿")).toBe(true);
  });

  it("reads semicolon and comma separated files", () => {
    expect(parseCsv("navn;sesong\nG2013;2026")).toEqual([{ navn: "G2013", sesong: "2026" }]);
    expect(parseCsv("name,season\nG2013,2026")).toEqual([{ name: "G2013", season: "2026" }]);
  });

  it("handles quoted fields, blank lines and a BOM", () => {
    const rows = parseCsv('﻿navn;lag\n"Hansen; Johannes";G2013\n\n"Olsen ""K""";J2014\n');
    expect(rows).toEqual([
      { navn: "Hansen; Johannes", lag: "G2013" },
      { navn: 'Olsen "K"', lag: "J2014" },
    ]);
  });

  it("picks the first present header alias", () => {
    const row = { fornavn: "Johannes", first_name: "" };
    expect(pick(row, ["first_name", "fornavn"])).toBe("Johannes");
    expect(pick(row, ["mangler"])).toBe("");
  });
});
