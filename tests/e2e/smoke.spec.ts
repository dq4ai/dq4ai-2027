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

test("Tab moves from the opened mobile menu into its links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("");
  await page.locator(".nav-toggle").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.locator("#site-nav a").first()).toBeFocused();
});

test("switching the theme in one tab updates another, and the browser toolbar color", async ({
  context,
  baseURL,
}) => {
  const first = await context.newPage();
  await first.goto(baseURL ?? "");
  const second = await context.newPage();
  await second.goto(`${baseURL}dates/`);
  await second.locator(".theme-toggle").click();
  await expect(first.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(first.locator(".theme-toggle")).toHaveAttribute("aria-pressed", "true");
  const background = await second.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await expect(second.locator('meta[name="theme-color"]').first()).toHaveAttribute(
    "content",
    background,
  );
});

test("the home page leads with the workshop's purpose", async ({ page }) => {
  await page.goto("");
  const purpose = page.locator(".purpose");
  await expect(purpose).toContainText("two-way relationship");
  await expect(purpose).toContainText("bring together researchers and practitioners");
  const diagram = purpose.locator("figure");
  await expect(diagram).toContainText("Data quality for AI");
  await expect(diagram).toContainText("AI for data quality");
  await expect(purpose.locator(".communities li")).toHaveCount(3);
  await expect(page.locator("main .topics")).toContainText("Quality across text, images");
});

test("the color band spans the window without sideways scrolling", async ({ page }) => {
  for (const width of [320, 390, 1280, 1920]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ["", "dates/"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBe(0);
      await expect(page.locator("main .band").first()).toBeVisible();
    }
  }
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
    await expect(page.locator("[data-countdown]")).toHaveText(/\d+ days? \d+ hours? left/);
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

  test("the main button on the home page only promises what exists", async ({ page }, testInfo) => {
    await page.goto("");
    const primary = page.locator(".hero__actions .button--primary");
    if (populated(testInfo.project.name)) {
      await expect(primary).toHaveText("Submit a paper");
      return;
    }
    await expect(primary).toHaveText("Read the call for papers");
    await expect(page.locator(".hero__actions")).not.toContainText("Submit a paper");
    await expect(page.locator(".hero__actions")).toContainText("Submission details");
  });

  test("the dates table does not repeat itself", async ({ page }, testInfo) => {
    await page.goto("dates/");
    const statusHeader = page.locator("thead").getByText("Status");
    if (populated(testInfo.project.name)) {
      await expect(statusHeader).toBeVisible();
      return;
    }
    await expect(statusHeader).toHaveCount(0);
    const row = page.locator("tbody tr", { hasText: "Paper submission" });
    await expect(row.getByText("To be announced")).toHaveCount(1);
  });

  test("a section link is not hidden by the deadline bar on a phone", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a dated deadline");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("call-for-papers/#topics");
    await page.waitForTimeout(800);
    const heading = await page.locator("#topics").boundingBox();
    const bar = await page.locator(".deadline-strip").boundingBox();
    expect(heading).not.toBeNull();
    if (bar && bar.y + bar.height > 0) {
      expect(heading?.y ?? 0).toBeGreaterThanOrEqual(bar.y + bar.height);
    }
  });

  test("the conference's dates are not given as the workshop's", async ({ page }, testInfo) => {
    const expected = populated(testInfo.project.name)
      ? "Workshop date: 7 April 2027."
      : "Workshop date: to be announced.";
    for (const path of ["call-for-papers/", "attend/"]) {
      await page.goto(path);
      await expect(page.locator(".page-header, main").first()).toContainText(expected);
    }
  });

  test("the page limit is on the submission page", async ({ page }) => {
    await page.goto("submission/");
    await expect(page.locator("#details ~ dl, .facts").first()).toContainText("Page limit");
  });

  test("details not yet known are listed once, and keep their addresses", async ({
    page,
  }, testInfo) => {
    test.skip(populated(testInfo.project.name), "needs unknown sections");
    await page.goto("attend/");
    const pending = page.locator(".pending");
    await expect(pending.locator("#venue")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Venue" })).toHaveCount(0);
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
    const row = page.locator("tbody tr", { hasText: "Paper submission" });
    await expect(row).toContainText("Was");
    await expect(row).toContainText("Now");
  });

  test("the time-zone toggle converts an extended deadline's old and new dates", async ({
    browser,
    baseURL,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an extended deadline");
    const context = await browser.newContext({ timezoneId: "Asia/Tokyo" });
    const page = await context.newPage();
    await page.goto(`${baseURL}dates/`);
    await page.locator(".tz-toggle").click();
    await expect(page.locator("del")).toContainText("GMT+9");
    await context.close();
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
