import { describe, expect, it } from "vitest";
import { menuSections, redirects, SECTIONS, sectionById } from "../../src/lib/nav";

describe("the one page's sections", () => {
  it("gives every section its own anchor", () => {
    const ids = SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps Accepted Papers out of the menu until papers exist", () => {
    expect(
      menuSections({ papers: false, keynotes: true }).map((section) => section.id),
    ).not.toContain("accepted-papers");
    expect(menuSections({ papers: true, keynotes: true }).map((section) => section.id)).toContain(
      "accepted-papers",
    );
  });

  it("lists every section in the menu, in the page's order, but the sponsors", () => {
    const ids = menuSections({ papers: true, keynotes: true }).map((section) => section.id);
    expect(ids).toEqual(SECTIONS.map((section) => section.id).filter((id) => id !== "sponsors"));
    expect(ids).not.toContain("dates");
  });

  it("leaves Keynotes out of the menu until there is one", () => {
    expect(menuSections({ papers: true, keynotes: false }).map((s) => s.id)).not.toContain(
      "keynotes",
    );
  });

  it("sends every old page address to its section", () => {
    expect(redirects(true)).toContainEqual({ path: "/dates/", to: "/#dates" });
    expect(redirects(true)).toContainEqual({ path: "/call-for-papers/", to: "/#about" });
    expect(redirects(true)).toContainEqual({ path: "/accepted-papers/", to: "/#accepted-papers" });
    for (const path of ["/submission/", "/program/", "/organization/", "/attend/", "/news/"]) {
      expect(redirects(true).map((redirect) => redirect.path)).toContain(path);
    }
  });

  it("sends the old News address to the top, since the page has no News section", () => {
    expect(redirects(true)).toContainEqual({ path: "/news/", to: "/#about" });
    expect(SECTIONS.map((section) => section.id)).not.toContain("news");
  });

  it("sends the old Accepted Papers address to the program until papers exist", () => {
    expect(redirects(false)).toContainEqual({ path: "/accepted-papers/", to: "/#program" });
  });

  it("refuses an unknown section", () => {
    expect(() => sectionById("nope")).toThrow(/Unknown section/);
  });
});
