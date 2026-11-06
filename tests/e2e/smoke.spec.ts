import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import ICAL from "ical.js";
import { PAGES } from "./pages";

const populated = (name: string) => name === "populated-content";

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

for (const path of [...PAGES, "this-page-does-not-exist/"]) {
  test.describe(`/${path}`, () => {
    test("renders one h1 with no console errors", async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main")).toBeVisible();
      // GitHub Pages and astro preview both log the expected 404 for the missing page itself.
      const unexpected = errors.filter((e) => !e.includes("404"));
      expect(unexpected).toEqual([]);
    });

    for (const colorScheme of ["light", "dark"] as const) {
      test(`has no axe violations in the ${colorScheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(path);
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
          .analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
      });
    }
  });
}

test("the theme toggle persists without flashing the system theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("");
  const toggle = page.locator(".theme-toggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // The attribute must be present before any body content parses, or a reload would flash.
  const themeAtFirstParse = await page.evaluate(async () => {
    const response = await fetch(location.href);
    const html = await response.text();
    return html.indexOf('localStorage.getItem("theme")') < html.indexOf("<body");
  });
  expect(themeAtFirstParse).toBe(true);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("the mobile menu is a keyboard-operable disclosure", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("");
  const toggle = page.locator(".nav-toggle");
  const firstLink = page.locator("#site-nav a").first();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(firstLink).toBeHidden();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(firstLink).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("the skip link is the first stop and moves focus to the content", async ({ page }) => {
  await page.goto("");
  await page.keyboard.press("Tab");
  const skip = page.locator(".skip-link");
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("navigation reaches a page and marks it current", async ({ page }) => {
  await page.goto("");
  await page.locator("#site-nav").getByRole("link", { name: "Organization" }).click();
  await expect(page).toHaveURL(/organization\/$/);
  await expect(page.locator('#site-nav a[aria-current="page"]')).toHaveText("Organization");
});

test("the site works without JavaScript", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 800 },
  });
  const page = await context.newPage();
  await page.goto(baseURL ?? "");
  await expect(page.locator("#site-nav a").first()).toBeVisible();
  await expect(page.locator(".nav-toggle")).toBeHidden();
  if (populated(testInfo.project.name)) {
    await expect(page.locator("[data-countdown]")).toHaveText(/\d+d \d+h \d+m left/);
  }
  await context.close();
});

test("the deadlines calendar downloads and parses", async ({ request, baseURL }, testInfo) => {
  const response = await request.get(`${baseURL}calendar/deadlines.ics`);
  expect(response.ok()).toBe(true);
  const calendar = new ICAL.Component(ICAL.parse(await response.text()));
  const summaries = calendar
    .getAllSubcomponents("vevent")
    .map((component) => new ICAL.Event(component).summary);
  expect(summaries).toContain("EDBT/ICDT 2027");
  expect(summaries).toHaveLength(populated(testInfo.project.name) ? 5 : 1);
});

test("organizers are listed once and the committee is sorted by surname", async ({
  page,
}, testInfo) => {
  await page.goto("organization/");
  const names = await page.locator("#program-committee ~ ul .person__name").allTextContents();
  if (populated(testInfo.project.name)) {
    expect(names).toEqual(["Jane Doe", "John Roe", "Ana van der Berg"]);
  } else {
    expect(names[0]).toBe("Asma Abboura");
    expect(names).toContain("Jesualdo Fernandez Breis");
    expect(names).toHaveLength(10);
    await expect(page.locator("#chairs ~ ul .person__name")).toHaveText([
      "Soror Sahri",
      "Farah Benamara",
    ]);
  }
});

test.describe("states that depend on content", () => {
  test("empty and populated program", async ({ page, request, baseURL }, testInfo) => {
    await page.goto("program/");
    if (!populated(testInfo.project.name)) {
      await expect(page.getByText("Program to be announced.")).toBeVisible();
      await expect(page.locator(".tz-toggle")).toBeHidden();
      return;
    }
    await expect(page.locator(".session")).toHaveCount(2);
    const abstract = page.locator("details").first();
    await expect(abstract.locator("p")).toBeHidden();
    await abstract.locator("summary").click();
    await expect(abstract.locator("p")).toBeVisible();
    const session = await request.get(`${baseURL}calendar/session-opening.ics`);
    expect(await session.text()).toContain("DTSTART:20270407T070000Z");
  });

  test("accepted papers join the navigation only once populated", async ({ page }, testInfo) => {
    await page.goto("");
    const link = page.locator("#site-nav").getByRole("link", { name: "Accepted Papers" });
    await expect(link).toHaveCount(populated(testInfo.project.name) ? 1 : 0);
  });

  test("an extended deadline strikes through the old date", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an extended deadline");
    await page.goto("dates/");
    await expect(page.locator("del")).toHaveText("11 December 2026, 23:59 AoE");
    await expect(page.locator("tbody").getByText("18 December 2026, 23:59 AoE")).toBeVisible();
    await expect(page.locator(".status--extended").first()).toBeVisible();
  });

  test("the time-zone toggle converts deadlines and restores AoE", async ({
    browser,
    baseURL,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a dated deadline");
    const context = await browser.newContext({ timezoneId: "Asia/Tokyo" });
    const page = await context.newPage();
    await page.goto(`${baseURL}dates/`);
    const row = page.locator("tbody tr", { hasText: "Abstract submission" }).locator("time");
    await expect(row).toHaveText("1 December 2026, 23:59 AoE");
    await page.locator(".tz-toggle").click();
    await expect(row).toContainText("2 December 2026 at 20:59");
    await page.locator(".tz-toggle").click();
    await expect(row).toHaveText("1 December 2026, 23:59 AoE");
    await context.close();
  });
});

test("the CFP prints without site chrome", async ({ page }) => {
  await page.goto("call-for-papers/");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".site-footer")).toBeHidden();
  await expect(page.locator("#topics")).toBeVisible();
  const pdf = await page.pdf({ format: "A4" });
  const pages = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g)?.length ?? 0;
  expect(pages).toBeGreaterThan(0);
  expect(pages).toBeLessThanOrEqual(2);
});
