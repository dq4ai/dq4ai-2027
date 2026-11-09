/** Tasks and layouts found broken by watching visitors use the site, kept from breaking again. */
import { chromium, expect, test, type Browser, type Page } from "@playwright/test";
import ICAL from "ical.js";
import { readFileSync } from "node:fs";
import { PAGES } from "./pages";

const populated = (name: string) => name === "populated-content";
const PHONE = { width: 390, height: 844 };
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("contact", () => {
  for (const path of ["organization/", "attend/"]) {
    test(`${path} says how to reach the organizers`, async ({ page }, testInfo) => {
      await page.goto(path);
      const contact = page.locator(".contact");
      await expect(contact.getByRole("heading", { name: "Contact" })).toBeVisible();
      if (populated(testInfo.project.name)) {
        await expect(contact.locator('a[href^="mailto:"]')).toHaveAttribute(
          "href",
          "mailto:chairs@example.org",
        );
      } else {
        await expect(contact).toContainText("To be announced");
      }
    });
  }

  test("the footer says a contact is coming until there is one", async ({ page }, testInfo) => {
    await page.goto("");
    await expect(page.locator(".site-footer")).toContainText(
      populated(testInfo.project.name) ? "Contact: chairs@example.org" : "Contact: to be announced",
    );
  });
});

test.describe("deadlines as they pass", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs dated deadlines");
  });

  test("the daily rebuild runs just after a day ends in AoE", () => {
    const workflow = readFileSync(".github/workflows/scheduled-rebuild.yml", "utf8");
    expect(workflow).toContain('cron: "5 12 * * *"');
  });

  test("a closed deadline stops being next everywhere on the page", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-12-19T12:01:00Z") });
    await page.goto("dates/");
    const strip = page.locator(".deadline-strip");
    await expect(strip).toContainText("Author notification");
    await expect(strip).not.toContainText("Paper submission");
    const row = page.locator("tbody tr", { hasText: "Paper submission" });
    await expect(row.locator(".status--passed:visible")).toHaveText("Passed");
    await expect(row.locator(".flag")).toHaveCount(0);
    const nextRow = page.locator("tbody tr", { hasText: "Author notification" });
    await expect(nextRow.locator(".flag")).toHaveCount(1);
  });

  test("a deadline's own day reads Today", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-12-18T13:00:00Z") });
    await page.goto("dates/");
    const row = page.locator("tbody tr", { hasText: "Paper submission" });
    await expect(row.locator(".status--today:visible")).toHaveText("Today");
  });

  test("the submit button goes when submission closes", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-12-19T12:01:00Z") });
    await page.goto("");
    await expect(page.getByRole("link", { name: "Submit a paper" })).toBeHidden();
    await page.goto("submission/");
    await expect(page.getByRole("link", { name: "Submit a paper" })).toBeHidden();
  });

  test("the strip does not call an announcement a deadline", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-12-19T12:01:00Z") });
    await page.goto("");
    await expect(page.locator("[data-deadline-prefix]")).toHaveText("Next date:");
  });

  test("the strip goes once nothing is left to wait for", async ({ page }) => {
    await page.clock.install({ time: new Date("2027-03-01T12:00:00Z") });
    await page.goto("");
    await expect(page.locator(".deadline-strip")).toBeHidden();
  });

  test("the countdown ticks on the minute", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-12-19T11:57:30Z") });
    await page.goto("");
    const countdown = page.locator("[data-countdown]");
    await expect(countdown).toHaveText("0 hours 1 minute left");
    await page.clock.runFor(31_000);
    await expect(countdown).toHaveText("Less than a minute left");
    await page.clock.runFor(60_000);
    await expect(page.locator(".deadline-strip")).toContainText("Author notification");
  });

  test("without JavaScript no countdown goes stale", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(baseURL ?? "");
    await expect(page.locator(".deadline-strip")).toBeVisible();
    await expect(page.locator("[data-countdown]")).toBeHidden();
    await context.close();
  });
});

test.describe("phone menu", () => {
  test.use({ viewport: PHONE, hasTouch: true });

  test("the button stays put and says what it will do", async ({ page }) => {
    await page.goto("");
    const toggle = page.locator(".nav-toggle");
    const before = await toggle.boundingBox();
    await expect(toggle).toHaveText("Menu");
    await toggle.tap();
    await expect(toggle).toHaveText("Close");
    const after = await toggle.boundingBox();
    expect(after?.x).toBe(before?.x);
    await page.touchscreen.tap((before?.x ?? 0) + 10, (before?.y ?? 0) + 10);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveText("Menu");
  });

  test("tapping elsewhere closes it", async ({ page }) => {
    await page.goto("");
    const toggle = page.locator(".nav-toggle");
    await toggle.tap();
    await page.locator("main h1").tap();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("it leads back to the home page", async ({ page }) => {
    await page.goto("dates/");
    await page.locator(".nav-toggle").tap();
    await expect(page.locator("#site-nav").getByRole("link", { name: "Home" })).toBeVisible();
  });

  test("a section link on the same page closes it", async ({ page }) => {
    await page.goto("");
    const toggle = page.locator(".nav-toggle");
    await toggle.tap();
    await page.locator("#site-nav").evaluate((nav) => {
      const link = document.createElement("a");
      link.href = "#about";
      link.textContent = "Same page";
      nav.append(link);
    });
    await page.getByRole("link", { name: "Same page" }).tap();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("widening past the breakpoint closes it", async ({ page }) => {
    await page.goto("");
    const toggle = page.locator(".nav-toggle");
    await toggle.tap();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.setViewportSize(PHONE);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#site-nav a").first()).toBeHidden();
  });

  test("Escape leaves focus alone when it is elsewhere on the page", async ({ page }) => {
    await page.goto("");
    await page.locator(".nav-toggle").tap();
    const link = page.locator("main a").first();
    await link.focus();
    await page.keyboard.press("Escape");
    await expect(page.locator(".nav-toggle")).toHaveAttribute("aria-expanded", "false");
    await expect(link).toBeFocused();
  });

  test("a page restored by the Back button comes back with it closed", async ({ page }) => {
    await page.goto("");
    const toggle = page.locator(".nav-toggle");
    await toggle.tap();
    await page.evaluate(() => {
      dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("menu and theme work when the script bundles never arrive", async ({ page }) => {
    await page.route("**/_astro/*.js", (route) => route.abort());
    await page.goto("");
    await page.locator(".nav-toggle").tap();
    await expect(page.locator("#site-nav a").first()).toBeVisible();
    await page.locator(".theme-toggle").tap();
    await expect(page.locator(".theme-toggle")).toHaveAttribute("aria-pressed", "true");
  });

  test("the time-zone button holds its place before its script runs", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs dated deadlines");
    await page.route("**/_astro/*.js", (route) => route.abort());
    await page.goto("dates/");
    await expect(page.locator(".tz-toggle")).toBeVisible();
  });
});

test.describe("theme", () => {
  test("the button's state follows the system theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("");
    const toggle = page.locator(".theme-toggle");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  test("choosing the system's theme goes back to following the system", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("");
    const toggle = page.locator(".theme-toggle");
    await toggle.click();
    await toggle.click();
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("authors' tasks", () => {
  test("the template can be downloaded", async ({ page, request, baseURL }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a template");
    for (const path of ["submission/", "call-for-papers/"]) {
      await page.goto(path);
      const row = page.locator(".facts > div", { hasText: "Template" });
      await expect(row.getByRole("link", { name: "Example template" })).toHaveAttribute(
        "href",
        "https://example.org/template.zip",
      );
    }
    const text = await (await request.get(`${baseURL}cfp.txt`)).text();
    expect(text).toContain("https://example.org/template.zip");
  });

  test("an unknown link points on to the host's workshops page", async ({ page }, testInfo) => {
    test.skip(populated(testInfo.project.name), "needs an unknown submission link");
    await page.goto("submission/");
    await expect(
      page.getByRole("link", { name: "workshops page", exact: false }).first(),
    ).toHaveAttribute("href", /contents=workshops/);
  });

  test("the organizers' status note appears once they write one", async ({ page }, testInfo) => {
    for (const path of ["", "submission/", "dates/"]) {
      await page.goto(path);
      await expect(page.locator(".status-note")).toHaveCount(
        populated(testInfo.project.name) ? 1 : 0,
      );
    }
  });

  test("the checklist links to what each step needs", async ({ page }) => {
    await page.goto("submission/");
    const steps = page.locator(".steps li");
    await expect(steps.nth(0).getByRole("link")).toHaveAttribute(
      "href",
      /call-for-papers\/#topics/,
    );
    await expect(steps.nth(2).getByRole("link")).toHaveAttribute(
      "href",
      /call-for-papers\/#policies/,
    );
    await expect(steps.nth(3).getByRole("link")).toHaveAttribute("href", /dates\/$/);
  });

  test("the two kinds of policy point to each other", async ({ page }) => {
    await page.goto("call-for-papers/");
    const section = page.locator("section", { has: page.locator("#policies") });
    await expect(section.getByRole("heading", { name: "Submission policies" })).toBeVisible();
    await expect(section.getByRole("link", { name: "Policies page" })).toBeVisible();
    await page.goto("policies/");
    await expect(
      page.locator("main").getByRole("link", { name: "Call for Papers" }),
    ).toHaveAttribute("href", /call-for-papers\/#policies/);
  });

  // The organizers asked for the call to read straight through, without the links bar or the
  // related-venues section.
  test("the call for papers reads straight through", async ({ page }) => {
    await page.goto("call-for-papers/");
    await expect(page.locator("#contents, .toc, .to-contents")).toHaveCount(0);
    await expect(page.locator("#related-venues")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("QDB");
    await page.goto("");
    await expect(page.locator("#related-venues")).toHaveCount(0);
  });
});

test.describe("arriving on an inner page", () => {
  for (const path of ["organization/", "submission/", "policies/"]) {
    test(`${path} says what this is on a phone's first screen`, async ({ page }, testInfo) => {
      await page.setViewportSize(PHONE);
      await page.goto(path);
      const context = page.locator(".page-context");
      await expect(context).toContainText("DQ4AI 2027");
      await expect(context).toContainText("EDBT/ICDT 2027");
      await expect(context).toContainText("Lille, France");
      await expect(context).toContainText(
        populated(testInfo.project.name) ? "7 April 2027" : "6–9 April 2027",
      );
      await expect(context).toBeInViewport({ ratio: 1 });
    });
  }
});

test.describe("values not yet known", () => {
  test("program and papers use the same empty cell as other pages", async ({ page }, testInfo) => {
    test.skip(populated(testInfo.project.name), "needs an empty program");
    await page.goto("program/");
    await expect(page.locator(".facts .tba")).toHaveText("To be announced");
    await page.goto("accepted-papers/");
    await expect(page.locator(".facts .tba")).toHaveText("Listed after notification");
  });

  test("an unnamed keynote says who is missing, in the body type", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an unknown speaker");
    await page.goto("keynotes/");
    const chip = page.locator("h2 .tba");
    await expect(chip).toHaveText("Speaker to be announced");
    const type = await chip.evaluate((e) => {
      const style = getComputedStyle(e);
      return { fontFamily: style.fontFamily, fontWeight: style.fontWeight };
    });
    expect(type.fontFamily).toContain("Source Serif 4");
    expect(type.fontWeight).toBe("400");
    await expect(page.locator(".keynote .entry__meta .tba")).toHaveCount(0);
  });

  // Reversed after the phone review: unset rows sat beside their label while every other row
  // stacked, so one list mixed two shapes. Now every row on a phone has one shape.
  test("on a phone every row puts its label above its value, known or not", async ({ page }) => {
    await page.setViewportSize(PHONE);
    for (const path of ["", "submission/", "call-for-papers/"]) {
      await page.goto(path);
      for (const row of await page.locator(".facts > div").all()) {
        const [label, value] = await Promise.all([
          row.locator("dt").boundingBox(),
          row.locator("dd").boundingBox(),
        ]);
        expect(value?.y ?? 0, path).toBeGreaterThan(label?.y ?? 0);
        expect(value?.x, path).toBe(label?.x);
      }
    }
  });
});

test.describe("large text", () => {
  let large: Browser;
  test.beforeAll(async () => {
    large = await chromium.launch({ args: ["--blink-settings=defaultFontSize=32"] });
  });
  test.afterAll(async () => {
    await large.close();
  });

  for (const width of [320, 390]) {
    test(`nothing runs off a ${width}px screen with the browser font at 200%`, async ({
      baseURL,
    }) => {
      test.setTimeout(60_000);
      const context = await large.newContext({ baseURL, viewport: { width, height: 800 } });
      const page = await context.newPage();
      for (const path of PAGES) {
        await page.goto(path);
        expect(await overflow(page), `${path} at ${width}px`).toBe(0);
      }
      await context.close();
    });
  }

  test("the WCAG text spacing fits on the narrowest phone", async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      bypassCSP: true,
      viewport: { width: 320, height: 800 },
    });
    const page = await context.newPage();
    await page.goto("");
    await page.addStyleTag({
      content:
        "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-block-end: 2em !important; }",
    });
    expect(await overflow(page)).toBe(0);
    await context.close();
  });

  test("a doubled root size keeps values on screen and links reachable", async ({
    browser,
    baseURL,
  }) => {
    test.setTimeout(60_000);
    const context = await browser.newContext({ baseURL, bypassCSP: true });
    const page = await context.newPage();
    for (const [width, path] of [
      [1280, ""],
      [1040, ""],
      [1280, "call-for-papers/"],
      [1024, "call-for-papers/"],
      [768, "call-for-papers/"],
    ] as const) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      expect(await overflow(page), `/${path} at ${width}px`).toBe(0);
    }
    await context.close();
  });

  test("a doubled root size does not hide a section under the bar", async ({
    browser,
    baseURL,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a dated deadline");
    const context = await browser.newContext({
      baseURL,
      bypassCSP: true,
      viewport: { width: 768, height: 800 },
    });
    const page = await context.newPage();
    await page.goto("call-for-papers/");
    await page.addStyleTag({
      content: "html { font-size: 200% !important; scroll-behavior: auto !important; }",
    });
    await page.locator("#topics").evaluate((heading) => {
      heading.scrollIntoView();
    });
    const heading = await page.locator("#topics").boundingBox();
    const bar = await page.locator(".deadline-strip").boundingBox();
    expect(heading?.y ?? 0).toBeGreaterThanOrEqual((bar?.y ?? 0) + (bar?.height ?? 0));
    await context.close();
  });

  test("the deadline bar does not stick on a short screen", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a dated deadline");
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("");
    await expect(page.locator(".deadline-strip")).toHaveCSS("position", "static");
  });

  test("a word too long for its line wraps", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("");
    await page.locator(".hero h1").evaluate((h1) => {
      h1.textContent = "x".repeat(90);
    });
    expect(await overflow(page)).toBe(0);
  });
});

test.describe("time zones", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a program");
  });

  test("a session on another local day says which day", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, timezoneId: "Pacific/Honolulu" });
    const page = await context.newPage();
    await page.goto("program/");
    const toggle = page.locator(".tz-toggle");
    await toggle.click();
    await expect(page.locator(".session__time").first()).toContainText("21:00 (6 April)");
    await expect(toggle).toHaveText("Show venue time");
    await toggle.click();
    await expect(toggle).toHaveText("Show in my time zone");
    await expect(page.locator(".session__time").first()).not.toContainText("April");
    await context.close();
  });

  test("the choice carries to the next page", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, timezoneId: "Asia/Tokyo" });
    const page = await context.newPage();
    await page.goto("dates/");
    const toggle = page.locator(".tz-toggle");
    await toggle.click();
    await expect(toggle).toHaveText("Show in AoE");
    await page.goto("program/");
    await expect(page.locator(".tz-toggle")).toHaveText("Show venue time");
    await expect(page.locator("[data-zone-note]")).toContainText("Asia/Tokyo");
    await context.close();
  });
});

test.describe("rows and tables line up", () => {
  test("the dates table starts its dates where other pages start values", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("attend/");
    const edge = await page
      .locator("dl.facts dd")
      .first()
      .evaluate((dd) => dd.getBoundingClientRect().left);
    for (const path of ["dates/", "previous-editions/"]) {
      await page.goto(path);
      const left = await page
        .locator("thead th")
        .nth(1)
        .evaluate((th) => th.getBoundingClientRect().left);
      expect(left, path).toBeCloseTo(edge, 0);
    }
  });

  test("the time-zone button does not move the columns", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs dated deadlines");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("dates/");
    const columns = () =>
      page
        .locator("thead th")
        .evaluateAll((all) => all.map((th) => th.getBoundingClientRect().left));
    const before = await columns();
    await page.locator(".tz-toggle").click();
    expect(await columns()).toEqual(before);
  });

  test("an extended date starts on the column, with Now still read aloud", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an extended deadline");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("dates/");
    const now = page.locator("tbody tr", { hasText: "Author notification" }).locator(".now-label");
    await expect(now).toHaveText("Now");
    await expect(now).toHaveClass(/visually-hidden/);
    const plain = page.locator("tbody tr", { hasText: "Camera-ready" }).locator("td time");
    const extended = page
      .locator("tbody tr", { hasText: "Author notification" })
      .locator("td > time");
    const [a, b] = await Promise.all([plain.boundingBox(), extended.boundingBox()]);
    expect(b?.x).toBeCloseTo(a?.x ?? 0, 0);
  });

  test("the editions table fits a 390px phone", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("previous-editions/");
    const wrap = page.locator(".table-wrap");
    const excess = await wrap.evaluate((e) => e.scrollWidth - e.clientWidth);
    expect(excess).toBeLessThanOrEqual(0);
  });

  test("a table cut off on a narrow phone shows it scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("previous-editions/");
    const attachment = await page
      .locator(".table-wrap")
      .evaluate((e) => getComputedStyle(e).backgroundAttachment);
    expect(attachment).toContain("local");
  });

  test("a focus ring inside a table is not clipped", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("previous-editions/");
    const padding = await page
      .locator(".table-wrap")
      .evaluate((e) => parseFloat(getComputedStyle(e).paddingInlineStart));
    expect(padding).toBeGreaterThanOrEqual(5);
  });

  test("phone toolbars stack evenly", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs dated deadlines");
    await page.setViewportSize(PHONE);
    await page.goto("dates/");
    const widths = await page
      .locator(".toolbar > :visible")
      .evaluateAll((all) => all.map((e) => e.getBoundingClientRect().width));
    expect(new Set(widths).size).toBe(1);
  });

  test("a section's list does not add to the space below it", async ({ page }) => {
    await page.goto("submission/");
    const margin = await page
      .locator("main > section > .steps")
      .evaluate((list) => parseFloat(getComputedStyle(list).marginBlockEnd));
    expect(margin).toBeLessThan(0);
  });

  test("a lede does not end on one word", async ({ page }) => {
    await page.goto("program/");
    expect(await page.locator(".lede").evaluate((e) => getComputedStyle(e).textWrap)).toContain(
      "pretty",
    );
  });
});

test.describe("printing", () => {
  test("a printed program keeps its abstracts", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a talk with an abstract");
    await page.goto("program/");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("details p").first()).toBeVisible();
    await expect(page.locator("details summary").first()).toHaveCSS("list-style-type", "none");
  });

  test("a printed session stays with its time and names the workshop", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a program");
    await page.goto("program/");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".session__time").first()).toHaveCSS("break-after", "avoid");
    await expect(page.locator(".page-context")).toBeVisible();
    await expect(page.locator(".page-context")).toContainText("DQ4AI 2027");
  });

  test("links that print as nothing useful are left out", async ({ page }, testInfo) => {
    await page.goto("");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".record__note a")).toBeHidden();
    if (populated(testInfo.project.name)) {
      await page.goto("program/");
      await expect(page.locator(".session__meta a[download]").first()).toBeHidden();
    }
  });

  test("a link whose text is its address prints it once", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a submission link");
    await page.goto("call-for-papers/");
    await page.emulateMedia({ media: "print" });
    const after = await page
      .locator(".facts a.link-is-address")
      .first()
      .evaluate((a) => getComputedStyle(a, "::after").content);
    expect(after).toBe("none");
  });
});

test.describe("calendar files", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a program");
  });

  const events = async (text: string) =>
    new ICAL.Component(ICAL.parse(text))
      .getAllSubcomponents("vevent")
      .map((component) => new ICAL.Event(component));

  test("a program entry says which event it belongs to", async ({ request, baseURL }) => {
    const text = await (await request.get(`${baseURL}calendar/program.ics`)).text();
    for (const event of await events(text)) {
      expect(event.summary).toMatch(/^DQ4AI 2027: /);
    }
    expect(text).toContain("URL:");
    expect(text.replaceAll("\r\n ", "")).toContain("/program/");
  });

  test("the deadlines calendar includes the workshop day", async ({ request, baseURL }) => {
    const text = await (await request.get(`${baseURL}calendar/deadlines.ics`)).text();
    const summaries = (await events(text)).map((event) => event.summary);
    expect(summaries).toContain("DQ4AI 2027 workshop");
    expect(text).toContain("DTSTART;VALUE=DATE:20270407");
  });
});

test.describe("fonts and images", () => {
  test("a late font cannot move the page after it has rendered", async ({ page }) => {
    await page.goto("");
    const displays = await page.evaluate(() => [...document.fonts].map((font) => font.display));
    expect(displays.length).toBeGreaterThan(0);
    expect(new Set(displays)).toEqual(new Set(["optional"]));
  });

  test("the Attend photo is not lazy, since it can be the largest thing on screen", async ({
    page,
  }) => {
    await page.goto("attend/");
    await expect(page.locator(".city-photo img")).toHaveAttribute("loading", "eager");
  });

  test("other images stay lazy", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a keynote photo");
    await page.goto("keynotes/");
    await expect(page.locator(".keynote img").first()).toHaveAttribute("loading", "lazy");
  });
});

test.describe("reading without seeing the layout", () => {
  test("repeated links name what they lead to", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs profile links");
    await page.goto("organization/");
    // A name is itself the link to the person's profile, so the link reads as who it is about.
    await expect(page.getByRole("link", { name: "Jane Doe" }).first()).toHaveAttribute(
      "href",
      "https://dblp.org/pid/00/0000.html",
    );
    await page.goto("");
    await expect(page.locator(".record").getByRole("link", { name: "Jane Doe" })).toHaveAttribute(
      "href",
      /keynotes\/#/,
    );
  });

  test("the current edition does not link to itself", async ({ page }) => {
    await page.goto("previous-editions/");
    const row = page.locator("tbody tr", { hasText: "this edition" });
    await expect(row.getByRole("link")).toHaveCount(0);
    await expect(page.locator("h1")).toHaveText("Previous editions");
  });

  test("the next deadline is named, not only colored", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a flagged date");
    for (const path of ["", "dates/"]) {
      await page.goto(path);
      await expect(page.locator("main .next-label")).toHaveText("Next deadline:");
    }
  });

  test("a name and an affiliation do not run together", async ({ page }) => {
    await page.goto("organization/");
    const text = await page.locator(".person").first().textContent();
    expect(text?.trim()).toMatch(/\S\s+\S/);
    const raw = await page
      .locator(".person")
      .first()
      .evaluate((person) => person.querySelector(".person__name")?.nextSibling?.textContent);
    expect(raw).toMatch(/\s/);
  });

  test("the statement's two lines read as two sentences", async ({ page }) => {
    await page.goto("");
    const pause = await page
      .locator(".exchange span")
      .first()
      .evaluate((span) => getComputedStyle(span, "::after").content);
    expect(pause).toContain(".");
  });
});

test.describe("touch and target sizes", () => {
  test("touch tablets have no invisible section links", async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      hasTouch: true,
      isMobile: true,
      viewport: { width: 820, height: 1180 },
    });
    const page = await context.newPage();
    await page.goto("call-for-papers/");
    await expect(page.locator(".section-anchor").first()).toBeHidden();
    await context.close();
  });

  test("a tapped button does not keep a hover border", async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      hasTouch: true,
      isMobile: true,
      viewport: PHONE,
    });
    const page = await context.newPage();
    await page.goto("");
    const before = await page
      .locator(".nav-toggle")
      .evaluate((e) => getComputedStyle(e).borderColor);
    await page.locator(".nav-toggle").tap();
    await page.locator(".nav-toggle").tap();
    await page.waitForTimeout(200);
    const after = await page
      .locator(".nav-toggle")
      .evaluate((e) => getComputedStyle(e).borderColor);
    expect(after).toBe(before);
    await context.close();
  });

  const minimums: [string, string, number, number][] = [
    [".brand in the header", ".site-header .brand", 1280, 44],
    ["desktop navigation", "#site-nav a", 1280, 44],
    ["phone navigation", "#site-nav a", 390, 44],
  ];
  for (const [name, selector, width, minimum] of minimums) {
    test(`${name} is at least ${minimum}px tall`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("");
      if (width < 1040) await page.locator(".nav-toggle").click();
      const heights = await page
        .locator(`${selector}:visible`)
        .evaluateAll((all) => all.map((e) => e.getBoundingClientRect().height));
      expect(heights.length).toBeGreaterThan(0);
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(minimum);
    });
  }

  test("the deadline bar's link is at least 44px tall", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a dated deadline");
    await page.goto("");
    const box = await page.locator(".deadline-strip a").boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("an abstract's control is at least 24px tall", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an abstract");
    await page.goto("program/");
    const box = await page.locator("summary").first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
  });
});

test.describe("one name for one thing", () => {
  test("terms match across pages", async ({ page }, testInfo) => {
    await page.goto("dates/");
    await expect(page.getByRole("heading", { name: "All dates" })).toBeVisible();
    await expect(page.locator("thead")).not.toContainText("Milestone");
    await expect(page.locator("tbody")).toContainText("Workshop date");
    await page.goto("call-for-papers/");
    await expect(page.locator("#important-dates ~ dl").first()).toContainText("Workshop date");
    await expect(page.getByRole("heading", { name: "Submission details" })).toBeVisible();
    await page.goto("news/");
    await expect(page.locator("main").getByRole("link", { name: "News feed" })).toBeVisible();
    await page.goto("accepted-papers/");
    await expect(page.locator("h1")).toHaveText("Accepted Papers");
    if (populated(testInfo.project.name)) {
      await page.goto("dates/");
      await expect(page.locator(".toolbar a")).toHaveText("Deadlines calendar (.ics)");
    }
  });
});

// The organizers asked for a site that does not overwhelm: a short menu, and a call for papers
// that leads with what matters and folds away the rest.
test.describe("less at once", () => {
  // Home is in the menu at every width: the organizers want the way back always named.
  test("the menu keeps Home and five pages, and the footer links the rest", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("");
    const menu = page.locator("#site-nav a");
    const expected = ["Home", "Call for Papers", "Dates", "Program", "Organization", "Attend"];
    if (populated(testInfo.project.name)) expected.splice(4, 0, "Accepted Papers");
    await expect(menu).toHaveText(expected);
    const footer = page.locator(".site-footer__links");
    for (const name of ["Submission", "Keynotes", "News", "Policies", "Previous Editions"]) {
      await expect(footer.getByRole("link", { name, exact: true })).toBeVisible();
    }
  });

  test("the call's scope opens on its goal, with the rest one click away", async ({ page }) => {
    await page.goto("call-for-papers/");
    const scope = page.locator("section", { has: page.locator("#scope") });
    await expect(scope.locator("> p").first()).toContainText("The goal of the workshop");
    const more = scope.locator("details");
    await expect(more.getByText("two-way relationship")).toBeHidden();
    await more.locator("summary").click();
    await expect(more.getByText("two-way relationship")).toBeVisible();
  });

  test("paper categories open onto their descriptions", async ({ page }) => {
    await page.goto("call-for-papers/");
    const research = page.locator(".paper-types details", { hasText: "Research papers" });
    await expect(research.getByRole("heading", { name: "Research papers" })).toBeVisible();
    await expect(research.getByText("Original research contributions")).toBeHidden();
    await research.locator("summary").click();
    await expect(research.getByText("Original research contributions")).toBeVisible();
  });

  test("facts not yet known share one sentence instead of rows", async ({ page }, testInfo) => {
    await page.goto("call-for-papers/");
    const details = page.locator("section", { has: page.locator("#submission") });
    const policies = page.locator("section", { has: page.locator("#policies") });
    if (populated(testInfo.project.name)) {
      await expect(details.locator(".facts > div", { hasText: "Review model" })).toHaveCount(1);
      await expect(details).not.toContainText("to be announced");
      return;
    }
    await expect(details).toContainText(
      "Submission system, template and review model: to be announced.",
    );
    await expect(details.locator(".facts > div", { hasText: "Review model" })).toHaveCount(0);
    await expect(policies).toContainText(
      "Dual submission and use of generative AI: to be announced.",
    );
    await expect(policies.locator(".facts")).toHaveCount(0);
    await expect(
      details.getByRole("link", { name: "How to prepare and submit a paper" }),
    ).toHaveAttribute("href", /submission\/$/);
  });
});

// The organizers asked for a phone view as finished as the desktop one.
test.describe("on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE);
  });

  // The organizers chose a photo card over a navy panel or a strip, and gave the call its own
  // phone budget in lighthouserc.json for it.
  test("the call opens on a photo of Lille, with its words on paper below", async ({ page }) => {
    await page.goto("call-for-papers/");
    const photo = page.locator(".page-header__photo");
    await expect(photo).toBeVisible();
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    const box = await photo.boundingBox();
    expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(16 / 9, 1);
    const heading = await page.locator(".page-header h1").boundingBox();
    expect(heading?.y ?? 0).toBeGreaterThan((box?.y ?? 0) + (box?.height ?? 0));
    const title = await page
      .locator(".page-header--photo h1")
      .evaluate((e) => getComputedStyle(e).color);
    expect(title).toBe(await page.evaluate(() => getComputedStyle(document.body).color));
    await expect(page.locator(".page-header--photo")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
  });

  test("the host city photo is a photo, not a sliver", async ({ page }) => {
    await page.goto("attend/");
    const photo = page.locator(".city-photo img");
    await photo.scrollIntoViewIfNeeded();
    const box = await photo.boundingBox();
    expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(1.5, 1);
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  });

  test("footer links never break in two", async ({ page }) => {
    await page.goto("");
    for (const link of await page.locator(".site-footer__links a").all()) {
      const lines = await link.evaluate((a) => a.getClientRects().length);
      expect(lines, (await link.textContent()) ?? "").toBe(1);
    }
  });

  test("a list that ends its section does not draw a second rule", async ({ page }) => {
    for (const path of ["call-for-papers/", "submission/", "attend/"]) {
      await page.goto(path);
      const widths = await page.locator("main > section").evaluateAll((sections) =>
        sections
          .filter((section) => section.lastElementChild?.matches(".facts"))
          .map((section) => {
            const row = section.lastElementChild?.lastElementChild;
            return row ? getComputedStyle(row).borderBottomWidth : "";
          }),
      );
      for (const width of widths) expect(width, path).toBe("0px");
    }
  });

  test("the topics share rows", async ({ page }) => {
    await page.goto("");
    const tops = await page
      .locator(".topic-list a")
      .evaluateAll((links) => links.map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBeLessThan(tops.length);
  });
});

test("a break in the program is set in the page's type", async ({ page }, testInfo) => {
  test.skip(!populated(testInfo.project.name), "needs a break");
  await page.goto("program/");
  const brief = page.locator(".session--brief h2").first();
  expect(await brief.evaluate((e) => getComputedStyle(e).fontFamily)).toContain("Source Serif 4");
});
