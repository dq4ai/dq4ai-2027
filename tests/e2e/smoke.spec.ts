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
  const exchange = purpose.locator(".exchange");
  await expect(exchange).toContainText("Data quality for AI");
  await expect(exchange).toContainText("AI for data quality");
  await expect(page.locator("main .topic-list")).toContainText("Multimodal data quality");
});

test("the first screen states what is known as a record", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("");
  const record = page.locator(".record");
  await expect(record).toContainText("Lille, France");
  await expect(record).toContainText("EDBT/ICDT 2027");
  await expect(record).toContainText("CEUR Workshop Proceedings");
  await expect(record).toBeInViewport({ ratio: 1 });
});

test("a phone's first screen reaches the record", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  await expect(page.locator(".record > div").first()).toBeInViewport({ ratio: 1 });
});

test("no page has sideways scrolling or a color band", async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [320, 390, 1280, 1920]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBe(0);
      await expect(page.locator("main .band")).toHaveCount(0);
    }
  }
});

test("a heading's name is its text, without its section link", async ({ page }) => {
  await page.goto("call-for-papers/");
  await expect(page.getByRole("heading", { name: "Scope", exact: true })).toBeVisible();
});

test("the navigation stays visible wherever its links fit", async ({ page }) => {
  await page.setViewportSize({ width: 1040, height: 800 });
  await page.goto("");
  await expect(page.locator(".nav-toggle")).toBeHidden();
  const links = page.locator("#site-nav a:visible");
  const boxes = await links.evaluateAll((all) =>
    all.map((link) => {
      const { top, right } = link.getBoundingClientRect();
      return { top, right };
    }),
  );
  expect(new Set(boxes.map((box) => box.top)).size, "links share one row").toBe(1);
  const toggle = await page.locator(".theme-toggle").boundingBox();
  expect(Math.max(...boxes.map((box) => box.right))).toBeLessThanOrEqual(toggle?.x ?? 0);
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(page.locator(".nav-toggle")).toBeVisible();
});

test("the wordmark and the home statement keep their words apart", async ({ page }) => {
  await page.goto("");
  for (const area of [".site-header", ".site-footer"]) {
    await expect(
      page.locator(area).getByRole("link", { name: "DQ4AI 2027", exact: true }),
    ).toHaveCount(1);
    const text = await page.locator(`${area} .brand`).textContent();
    expect(text?.trim()).toBe("DQ4AI 2027");
  }
  const statement = await page.locator(".exchange").textContent();
  expect(statement?.trim()).toBe("Data quality for AI AI for data quality");
});

test("the wordmark looks the same in the footer as in the header", async ({ page }) => {
  await page.goto("");
  const gap = (area: string) =>
    page.locator(`${area} .brand`).evaluate((brand) => {
      const nameBox = brand.querySelector(".brand__name")?.getBoundingClientRect();
      const yearBox = brand.querySelector(".brand__year")?.getBoundingClientRect();
      const size = parseFloat(getComputedStyle(brand).fontSize);
      return ((yearBox?.left ?? 0) - (nameBox?.right ?? 0)) / size;
    });
  expect(await gap(".site-footer")).toBeCloseTo(await gap(".site-header"), 1);
});

test("the home statement does not depend on the order of the topics", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".exchange span")).toHaveText([
    "Data quality for AI",
    "AI for data quality",
  ]);
  const sizes = await page.evaluate(() => {
    const size = (selector: string) =>
      parseFloat(getComputedStyle(document.querySelector(selector) as Element).fontSize);
    return { statement: size(".exchange"), heading: size(".purpose h2") };
  });
  expect(sizes.statement).toBeLessThan(sizes.heading);
  const first = page.locator(".purpose > p").first();
  await expect(first).toHaveClass("exchange");
});

test("no page shows the raw value TBA or the old wording", async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator("main"), path).not.toContainText(/\bTBA\b/);
    await expect(page.locator("main"), path).not.toContainText(/not yet set/i);
  }
});

test("the host city photo is credited and does not claim to be the venue", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("attend/");
  const section = page.locator("main > section").last();
  await expect(section.getByRole("heading", { name: "Host city", exact: true })).toBeVisible();
  const image = section.locator("img");
  await expect(image).toHaveAttribute("alt", /\S/);
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  const caption = section.locator("figcaption");
  await expect(caption).toContainText("not the workshop venue");
  const real = !populated(testInfo.project.name);
  await expect(caption).toContainText(real ? "Velvet" : "Example Photographer");
  await expect(
    caption.getByRole("link", { name: real ? "CC BY-SA 4.0" : "Example License" }),
  ).toHaveAttribute(
    "href",
    real ? "https://creativecommons.org/licenses/by-sa/4.0/" : "https://example.org/license",
  );
  await expect(
    caption.getByRole("link", { name: real ? "Wikimedia Commons" : "Example Archive" }),
  ).toHaveAttribute(
    "href",
    real ? /commons\.wikimedia\.org\/wiki\/File:Lille_gd_place/ : "https://example.org/photo",
  );
  await expect(caption).toContainText("resized");
  expect((await image.boundingBox())?.width ?? Infinity).toBeLessThanOrEqual(832);

  await page.setViewportSize({ width: 390, height: 844 });
  expect((await image.boundingBox())?.width ?? Infinity).toBeLessThanOrEqual(342);
});

test("the photo does not reach the first screen of the home page", async ({ page }, testInfo) => {
  test.skip(populated(testInfo.project.name), "the fixture has its own images");
  await page.goto("");
  await expect(page.locator("main img")).toHaveCount(0);
});

test("the footer's license notice leaves room for credited work", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".site-footer__legal")).toContainText(
    "Content under CC BY 4.0, except where a credit says otherwise.",
  );
});

test("a past edition's unknown details are not promised as coming", async ({ page }, testInfo) => {
  test.skip(populated(testInfo.project.name), "needs a past edition with unknown details");
  await page.goto("previous-editions/");
  const first = page.locator("tbody tr", { hasText: "First" });
  await expect(first).toContainText("Not recorded");
  await expect(first).not.toContainText("To be announced");
});

test("a section heading is plain text with its link beside it", async ({ page }) => {
  await page.goto("call-for-papers/");
  await expect(page.locator("#scope a")).toHaveCount(0);
  const anchor = page.getByRole("link", { name: "Link to section: Scope", exact: true });
  await expect(anchor).toHaveAttribute("href", "#scope");
  await page.setViewportSize({ width: 1100, height: 800 });
  await anchor.focus();
  await expect(anchor).toHaveCSS("opacity", "1");
  // Measured together: focusing the link can scroll the page.
  const boxes = await anchor.evaluate((link) => {
    const own = link.getBoundingClientRect();
    const heading = document.querySelector("#scope")?.getBoundingClientRect();
    return { linkX: own.left, linkY: own.top, headingX: heading?.left, headingY: heading?.top };
  });
  expect(boxes.linkX).toBeLessThan(boxes.headingX ?? 0);
  expect(boxes.linkX, "the link is not cut off by the page edge").toBeGreaterThanOrEqual(0);
  expect(Math.abs(boxes.linkY - (boxes.headingY ?? Infinity))).toBeLessThan(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(anchor).toBeHidden();
});

test("the footer offers the calendar only once deadlines have dates", async ({
  page,
}, testInfo) => {
  await page.goto("");
  await expect(
    page.locator(".site-footer").getByRole("link", { name: "Deadlines calendar" }),
  ).toHaveCount(populated(testInfo.project.name) ? 1 : 0);
  await page.goto("dates/");
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute("content", /calendar/);
});

test("the open menu's keyboard order matches what is on screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  await page.locator(".nav-toggle").click();
  const lastLink = await page.locator("#site-nav a").last().boundingBox();
  const theme = await page.locator(".theme-toggle").boundingBox();
  expect(theme?.y ?? 0).toBeGreaterThan(lastLink?.y ?? Infinity);
});

test("a table that may scroll can be reached by keyboard", async ({ page }) => {
  await page.goto("previous-editions/");
  await expect(page.locator(".table-wrap")).toHaveAttribute("tabindex", "0");
  await expect(page.locator(".table-wrap")).toHaveRole("region");
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
  expect(summaries).toContain(
    populated(testInfo.project.name)
      ? "EDBT/ICDT 2027 (host conference)"
      : "EDBT/ICDT 2027 (host conference; DQ4AI date TBA)",
  );
  expect(summaries).toHaveLength(populated(testInfo.project.name) ? 6 : 1);
});

test("organizers are listed once and the committee is sorted as configured", async ({
  page,
}, testInfo) => {
  await page.goto("organization/");
  const names = await page.locator("#program-committee ~ ul .person__name").allTextContents();
  if (populated(testInfo.project.name)) {
    expect(names).toEqual(["Jane Doe", "John Roe", "Ana van der Berg"]);
  } else {
    // The organizers asked for the committee in order of the names as they read.
    expect(names).toEqual([
      "Asma Abboura",
      "Fabian M. Suchanek",
      "Hazar Harmouch",
      "Imane Hocine",
      "Jahid Hasan",
      "Jesualdo Fernandez Breis",
      "Mohammad Sadoghi",
      "Mourad Ouzzani",
      "Nathalie Aussenac",
      "Sijie Dong",
    ]);
    await expect(page.locator("#chairs ~ ul .person__name")).toHaveText([
      "Soror Sahri",
      "Farah Benamara",
    ]);
    // The organizers asked for the Honorary Chair to open the page.
    await expect(page.locator("main h2").first()).toHaveText("Honorary Chair");
  }
});

test.describe("states that depend on content", () => {
  test("empty and populated program", async ({ page, request, baseURL }, testInfo) => {
    await page.goto("program/");
    if (!populated(testInfo.project.name)) {
      await expect(page.locator("#schedule ~ dl .tba")).toHaveText("To be announced");
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

  test("a session's details end before its calendar link", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a session with a chair");
    await page.goto("program/");
    await expect(page.locator(".session__meta", { hasText: "Chair:" }).first()).toContainText(
      /Chair: [^.]+\. Add to calendar/,
    );
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

  test("an extended deadline says so even when it is not the next one", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an extended deadline");
    await page.goto("");
    const row = page.locator(".record > div", { hasText: "Author notification" });
    await expect(row.locator(".status--extended")).toHaveText("Extended");
    const plain = page.locator(".record > div", { hasText: "Camera-ready" });
    await expect(plain.locator(".status-group")).toHaveCount(0);
  });

  test("a keynote speaker who is not yet known is an empty cell, not a link", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an unknown speaker");
    await page.goto("");
    const row = page.locator(".record > div", { hasText: "Keynotes" });
    await expect(row).toContainText("To be announced");
    await expect(row.getByRole("link")).toHaveCount(1);
    await expect(row.getByRole("link", { name: "Jane Doe" })).toHaveCount(1);
  });

  test("the record's status lines up with the date above it when it wraps", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a dated deadline");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("");
    const cell = page.locator(".record dd", { has: page.locator(".flag") });
    const boxes = await cell.evaluate((dd) => {
      const left = (selector: string) => dd.querySelector(selector)?.getBoundingClientRect();
      return {
        cell: dd.getBoundingClientRect().left,
        flag: left(".flag")?.top ?? 0,
        group: left(".status-group")?.left ?? 0,
        groupTop: left(".status-group")?.top ?? 0,
      };
    });
    expect(boxes.groupTop, "status wraps at this width").toBeGreaterThan(boxes.flag);
    expect(boxes.group).toBeCloseTo(boxes.cell, 0);
  });

  test("on a phone the dates table is two columns and keeps its status", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a dated deadline");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("dates/");
    await expect(page.locator("thead").getByText("Status")).toBeHidden();
    const row = page.locator("tbody tr", { hasText: "Paper submission" });
    await expect(row.getByRole("cell")).toHaveCount(1);
    await expect(row.locator(".status--extended:visible")).toHaveText("Extended");
    const flag = page.locator("main .flag");
    const fragments = await flag.evaluate((element) => element.getClientRects().length);
    expect(fragments, "the flagged date is one solid cell").toBe(1);
    const height = (await flag.boundingBox())?.height ?? Infinity;
    const lineHeight = await flag.evaluate((e) => parseFloat(getComputedStyle(e).lineHeight));
    expect(Math.round(height / lineHeight)).toBeLessThanOrEqual(2);
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

  test("only the next deadline is flagged, and tools need dates to act on", async ({
    page,
  }, testInfo) => {
    for (const path of ["", "dates/"]) {
      await page.goto(path);
      await expect(page.locator("main .flag")).toHaveCount(
        populated(testInfo.project.name) ? 1 : 0,
      );
    }
    await expect(page.locator(".toolbar")).toHaveCount(populated(testInfo.project.name) ? 1 : 0);
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
    await expect(pending.locator("#venue")).toContainText("To be announced");
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
    const row = page.locator("tbody tr", { hasText: "Paper submission" });
    await expect(row.locator("del")).toHaveText("11 December 2026, 23:59 AoE");
    await expect(row.getByText("18 December 2026, 23:59 AoE")).toBeVisible();
    await expect(row.locator(".status--extended:visible")).toBeVisible();
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
    await expect(page.locator("del").first()).toContainText("GMT+9");
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

test("a flagged date prints on the same column as the others", async ({ page }, testInfo) => {
  test.skip(!populated(testInfo.project.name), "needs a flagged date");
  await page.goto("call-for-papers/");
  await page.emulateMedia({ media: "print" });
  const lefts = await page
    .locator(".facts dd > time")
    .evaluateAll((times) => times.map((time) => time.getBoundingClientRect().left));
  expect(lefts.length).toBeGreaterThan(1);
  expect(new Set(lefts).size).toBe(1);
});

test("the home page prints at document sizes, without its buttons", async ({ page }) => {
  await page.goto("");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".hero__actions")).toBeHidden();
  const title = await page
    .locator(".hero h1")
    .evaluate((h1) => parseFloat(getComputedStyle(h1).fontSize));
  expect(title).toBeLessThanOrEqual(27);
});
