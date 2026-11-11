import { describe, expect, it } from "vitest";
import { menuSections, redirects, SECTIONS, sectionById } from "../../src/lib/nav";

describe("the one page's sections", () => {
  it("gives every section its own anchor", () => {
    const ids = SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The organizers asked for the previous edition's sections and menu (QuaLLM-KG 2026).
  it("follows the previous edition's sections, in its order", () => {
    expect(SECTIONS.map((section) => section.title)).toEqual([
      "About",
      "Topics of Interest",
      "Submission",
      "Program",
      "Keynote Speakers",
      "Organizers",
      "Program Committee",
      "Supported by",
    ]);
  });

  it("puts every section in the menu but the topics, the organizers and the sponsors", () => {
    expect(menuSections({ keynotes: true, program: true }).map((section) => section.menu)).toEqual([
      "About",
      "Submission",
      "Program",
      "Keynote Speakers",
      "Program Committee",
    ]);
  });

  it("leaves Keynotes out of the menu until there is one", () => {
    expect(menuSections({ keynotes: false, program: true }).map((s) => s.id)).not.toContain(
      "keynotes",
    );
  });

  it("leaves Program out of the menu until there is one, as the organizers asked", () => {
    expect(menuSections({ keynotes: true, program: false }).map((s) => s.id)).not.toContain(
      "program",
    );
  });

  it("sends every old page address to a section that exists", () => {
    const ids = new Set(SECTIONS.map((section) => section.id).concat("dates"));
    const paths = redirects({ program: true }).map((redirect) => redirect.path);
    for (const path of [
      "/call-for-papers/",
      "/dates/",
      "/submission/",
      "/program/",
      "/keynotes/",
      "/organization/",
      "/attend/",
      "/news/",
      "/policies/",
      "/previous-editions/",
      "/accepted-papers/",
    ]) {
      expect(paths).toContain(path);
    }
    for (const { to } of redirects({ program: true }))
      expect(ids.has(to.replace("/#", ""))).toBe(true);
    expect(redirects({ program: true })).toContainEqual({
      path: "/organization/",
      to: "/#organizers",
    });
    expect(redirects({ program: true })).toContainEqual({ path: "/attend/", to: "/#about" });
  });

  it("sends the program's old addresses to About while there is no program", () => {
    const moved = redirects({ program: false });
    expect(moved).toContainEqual({ path: "/program/", to: "/#about" });
    expect(moved).toContainEqual({ path: "/accepted-papers/", to: "/#about" });
    expect(moved.map(({ to }) => to)).not.toContain("/#program");
  });

  it("refuses an unknown section", () => {
    expect(() => sectionById("nope")).toThrow(/Unknown section/);
  });
});
