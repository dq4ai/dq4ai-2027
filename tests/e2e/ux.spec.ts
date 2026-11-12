/** Tasks and layouts found broken by watching visitors use the site, kept from breaking again. */
import { chromium, expect, test, type Browser, type Page } from "@playwright/test";
import ICAL from "ical.js";
import { readFileSync } from "node:fs";
import { datesTable, PAGES, section } from "./pages";

const populated = (name: string) => name === "populated-content";
const PHONE = { width: 390, height: 844 };
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("contact", () => {
  for (const path of [""]) {
    test("the page says how to reach the organizers", async ({ page }, testInfo) => {
      await page.goto(path);
      // At the end of the page, after the last section, as the organizers asked.
      const contact = page.locator("main > .contact");
      await expect(contact).toHaveCount(1);
      expect(await contact.evaluate((p) => p.nextElementSibling)).toBeNull();
      await expect(section(page, "organizers").locator(".contact")).toHaveCount(0);
      await expect(contact).toContainText("Contact:");
      if (populated(testInfo.project.name)) {
        await expect(contact.locator('a[href^="mailto:"]')).toHaveAttribute(
          "href",
          "mailto:chairs@example.org",
        );
      } else {
        await expect(contact.locator('a[href^="mailto:"]')).toHaveAttribute(
          "href",
          "mailto:soror.sahri@u-pariscite.fr",
        );
      }
    });
  }
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
    await page.goto("");
    const row = page.locator("tbody tr", { hasText: "Paper submission" });
    await expect(row.locator(".flag")).toHaveCount(0);
    const nextRow = page.locator("tbody tr", { hasText: "Author notification" });
    await expect(nextRow.locator(".flag")).toHaveCount(1);
  });

  test("an announcement is not called a deadline", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-12-19T12:01:00Z") });
    await page.goto("");
    await expect(page.locator("main .next-label")).toHaveText("Next date:");
  });

  test("nothing is flagged once nothing is left to wait for", async ({ page }) => {
    await page.clock.install({ time: new Date("2027-03-01T12:00:00Z") });
    await page.goto("");
    await expect(page.locator("main .flag")).toHaveCount(0);
  });

  test("a deadline passes on the minute, without a rebuild", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-12-19T11:57:30Z") });
    await page.goto("");
    const submission = page.locator("tbody tr", { hasText: "Paper submission" });
    const notification = page.locator("tbody tr", { hasText: "Author notification" });
    await expect(submission.locator(".flag")).toHaveCount(1);
    await page.clock.runFor(150_000);
    await expect(submission.locator(".flag")).toHaveCount(0);
    await expect(notification.locator(".flag")).toHaveCount(1);
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
    await page.goto("");
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

  test("the menu works when the script bundles never arrive", async ({ page }) => {
    await page.route("**/_astro/*.js", (route) => route.abort());
    await page.goto("");
    await page.locator(".nav-toggle").tap();
    await expect(page.locator("#site-nav a").first()).toBeVisible();
  });

  test("the time-zone button holds its place before its script runs", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a program");
    await page.route("**/_astro/*.js", (route) => route.abort());
    await page.goto("");
    await expect(page.locator(".tz-toggle")).toBeVisible();
  });
});

// The organizers asked for no theme button and no dark theme: the site is always light.
test("the site stays light whatever the system theme, with no button", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("");
  await expect(page.locator(".theme-toggle")).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    "rgb(251, 249, 244)",
  );
  expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe("rgb(35, 38, 45)");
});

test.describe("authors' tasks", () => {
  test("the template can be downloaded", async ({ page, request, baseURL }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a template");
    await page.goto("");
    const line = section(page, "submission").locator(".submit-line");
    await expect(line.getByRole("link", { name: "Example template" })).toHaveAttribute(
      "href",
      "https://example.org/template.zip",
    );
    const text = await (await request.get(`${baseURL}cfp.txt`)).text();
    expect(text).toContain("https://example.org/template.zip");
  });

  // The organizers asked for the previous edition's sentence, with a link that does nothing until
  // the real address is known: "after, we change it".
  test("Submission says how to submit, as the previous edition did", async ({ page }, testInfo) => {
    await page.goto("");
    const submission = section(page, "submission");
    await expect(submission.locator(".callout")).toHaveCount(0);
    await expect(submission).not.toContainText(/will be announced here|workshops page/);
    const line = submission.locator(".submit-line");
    if (populated(testInfo.project.name)) {
      await expect(line).toHaveText(
        "Authors must format their submissions according to the Example template, and all " +
          "submissions in PDF format should be submitted here.",
      );
      await expect(line.getByRole("link", { name: "here" })).toHaveAttribute(
        "href",
        /example\.org\/submit/,
      );
      return;
    }
    await expect(line).toContainText(
      "Authors must format their submissions according to the CEUR-WS proceedings template, and " +
        "all submissions in PDF format should be submitted here",
    );
    await expect(line.getByRole("link", { name: "CEUR-WS proceedings template" })).toHaveAttribute(
      "href",
      "https://ceur-ws.org/HOWTOSUBMIT.html",
    );
    // A placeholder: looks like the previous edition's link, goes nowhere, and says so aloud.
    const here = line.locator(".link-pending");
    await expect(here).toHaveText("here");
    await expect(here).not.toHaveAttribute("href");
    await expect(line.locator(".visually-hidden")).toHaveText("(link to come)");
  });

  test("the organizers' status note appears once they write one", async ({ page }, testInfo) => {
    for (const path of [""]) {
      await page.goto(path);
      await expect(page.locator(".status-note")).toHaveCount(
        populated(testInfo.project.name) ? 1 : 0,
      );
    }
  });

  // The organizers asked for the call to read straight through, without the links bar or the
  // related-venues section.
  test("the call for papers reads straight through", async ({ page }) => {
    await page.goto("");
    await expect(page.locator("#contents, .toc, .to-contents")).toHaveCount(0);
    await expect(page.locator("#related-venues")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("QDB");
    await page.goto("");
    await expect(page.locator("#related-venues")).toHaveCount(0);
  });
});

test.describe("values not yet known", () => {
  test("without a program, neither it nor papers have a section", async ({ page }, testInfo) => {
    test.skip(populated(testInfo.project.name), "needs an empty program");
    await page.goto("");
    await expect(page.locator("#program")).toHaveCount(0);
    // Accepted papers have no section until there are papers to list.
    await expect(page.locator("#accepted-papers")).toHaveCount(0);
  });

  test("an unnamed keynote says who is missing, in the body type", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an unknown speaker");
    await page.goto("");
    const chip = page.locator(".keynote h3 .tba");
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
    for (const path of [""]) {
      await page.goto(path);
      for (const row of await page.locator(".facts > div:visible").all()) {
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
      [1024, ""],
      [768, ""],
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
    await page.goto("");
    await page.addStyleTag({
      content: "html { font-size: 200% !important; scroll-behavior: auto !important; }",
    });
    await page.locator("#topics").evaluate((heading) => {
      heading.scrollIntoView();
    });
    const heading = await page.locator("#topics").boundingBox();
    const bar = await page.locator(".site-header").boundingBox();
    expect(heading?.y ?? 0).toBeGreaterThanOrEqual((bar?.y ?? 0) + (bar?.height ?? 0));
    await context.close();
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
    await page.goto("");
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
    await page.goto("");
    await page.locator(".tz-toggle").click();
    await page.goto("");
    await page.goto("");
    await expect(page.locator(".tz-toggle")).toHaveText("Show venue time");
    await expect(page.locator("[data-zone-note]")).toContainText("Asia/Tokyo");
    await context.close();
  });
});

test.describe("rows and tables line up", () => {
  test("the dates table starts its dates where other pages start values", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("");
    const rows = page.locator("dl.facts dd");
    test.skip((await rows.count()) === 0, "no other rows on the page");
    const edge = await rows.first().evaluate((dd) => dd.getBoundingClientRect().left);
    for (const table of [datesTable(page)]) {
      const left = await table
        .locator("thead th")
        .nth(1)
        .evaluate((th) => th.getBoundingClientRect().left);
      expect(left).toBeCloseTo(edge, 0);
    }
  });

  test("an extended date starts on the column, with Now still read aloud", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an extended deadline");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("");
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

  test("a table cut off on a narrow phone shows it scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("");
    const attachment = await page
      .locator(".table-wrap")
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundAttachment);
    expect(attachment).toContain("local");
  });

  test("a focus ring inside a table is not clipped", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("");
    const padding = await page
      .locator(".table-wrap")
      .first()
      .evaluate((e) => parseFloat(getComputedStyle(e).paddingInlineStart));
    expect(padding).toBeGreaterThanOrEqual(5);
  });

  test("phone toolbars stack evenly", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a program");
    await page.setViewportSize(PHONE);
    await page.goto("");
    const widths = await page
      .locator(".toolbar > :visible")
      .evaluateAll((all) => all.map((e) => e.getBoundingClientRect().width));
    expect(new Set(widths).size).toBe(1);
  });
});

test.describe("printing", () => {
  test("a printed program keeps its abstracts", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a talk with an abstract");
    await page.goto("");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("details p").first()).toBeVisible();
    await expect(page.locator("details summary").first()).toHaveCSS("list-style-type", "none");
  });

  test("a printed session stays with its time and names the workshop", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a program");
    await page.goto("");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".session__time").first()).toHaveCSS("break-after", "avoid");
    await expect(page.locator(".hero h1")).toBeVisible();
    await expect(page.locator(".hero h1")).toContainText("DQ4AI 2027");
  });

  test("links that print as nothing useful are left out", async ({ page }, testInfo) => {
    await page.goto("");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".record__note a")).toBeHidden();
    if (populated(testInfo.project.name)) {
      await page.goto("");
      await expect(page.locator(".session__meta a[download]").first()).toBeHidden();
    }
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
    expect(text.replaceAll("\r\n ", "")).toContain("/#program");
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

  test("other images stay lazy", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a keynote photo");
    await page.goto("");
    await expect(page.locator(".keynote img").first()).toHaveAttribute("loading", "lazy");
  });
});

test.describe("reading without seeing the layout", () => {
  test("repeated links name what they lead to", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs profile links");
    await page.goto("");
    // A name is itself the link to the person's profile, so the link reads as who it is about.
    await expect(page.getByRole("link", { name: "Jane Doe" }).first()).toHaveAttribute(
      "href",
      "https://dblp.org/pid/00/0000.html",
    );
  });

  test("the next deadline is named, not only colored", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a flagged date");
    await page.goto("");
    await expect(page.locator("main .next-label")).toHaveText("Next deadline:");
  });

  test("a name and an affiliation do not run together", async ({ page }) => {
    await page.goto("");
    const text = await page.locator(".person").first().textContent();
    expect(text?.trim()).toMatch(/\S\s+\S/);
    const raw = await page
      .locator(".person")
      .first()
      .evaluate((person) => person.querySelector(".person__name")?.nextSibling?.textContent);
    expect(raw).toMatch(/\s/);
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
    await page.goto("");
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

  test("an abstract's control is at least 24px tall", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an abstract");
    await page.goto("");
    const box = await page.locator("summary").first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
  });
});

test.describe("one name for one thing", () => {
  test("terms match across the page", async ({ page }) => {
    await page.goto("");
    await expect(page.getByRole("heading", { name: "Important dates", exact: true })).toBeVisible();
    await expect(datesTable(page).locator("thead")).not.toContainText("Milestone");
    await expect(datesTable(page).locator("tbody")).toContainText("Workshop date");
    await expect(page.getByRole("heading", { name: "Submission", exact: true })).toBeVisible();
  });
});

// The organizers asked for a site that does not overwhelm: a short menu, and a call for papers
// that leads with what matters and folds away the rest.
test.describe("less at once", () => {
  // The organizers asked for the previous edition's menu: Home, then one link per section, in the
  // page's order. As there, the topics have no link of their own.
  test("the menu has a link for every section of the page but the topics", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("");
    const menu = page.locator("#site-nav a");
    await expect(menu.first()).toHaveText("Home");
    const targets = await menu.evaluateAll((links) =>
      links.slice(1).map((link) => new URL((link as HTMLAnchorElement).href).hash.slice(1)),
    );
    const sections = await page
      .locator("main > section > h2")
      .evaluateAll((headings) =>
        headings
          .map((h) => h.id)
          .filter((id) => !["sponsors", "topics", "organizers", "past-edition"].includes(id)),
      );
    expect(targets).toEqual(sections);
    await expect(menu).toHaveText([
      "Home",
      "About",
      "Submission",
      ...(populated(testInfo.project.name) ? ["Program"] : []),
      "Keynote Speakers",
      "Program Committee",
    ]);
    // The organizers asked for no "Organizers", on the page or in the menu.
    await expect(menu.filter({ hasText: "Organizers" })).toHaveCount(0);
    await expect(page.locator(".site-footer nav")).toHaveCount(0);
  });

  test("the menu takes its own row under the logo on a wide screen", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("");
    const [brand, nav] = await Promise.all([
      page.locator(".site-header .brand").boundingBox(),
      page.locator("#site-nav").boundingBox(),
    ]);
    expect(nav?.y ?? 0).toBeGreaterThanOrEqual((brand?.y ?? 0) + (brand?.height ?? 0));
  });

  // As on the previous edition's site: one bullet each, the name in bold, nothing to open.
  test("paper categories are one bullet each, then their lengths", async ({ page }, testInfo) => {
    await page.goto("");
    const items = page.locator(".paper-types > li");
    await expect(items).toHaveCount(3);
    const research = items.filter({ hasText: "Research papers" });
    await expect(research.locator("strong")).toHaveText("Research papers:");
    await expect(research.getByText("Original research contributions")).toBeVisible();
    await expect(page.locator(".paper-types details, .paper-types a, .paper-type")).toHaveCount(0);
    expect(
      await items
        .first()
        .evaluate((li) => getComputedStyle(li.parentElement as Element).listStyleType),
    ).toBe("disc");
    // The organizers asked for the lengths in one sentence after the categories, not in each.
    await expect(items.filter({ hasText: /page/i })).toHaveCount(0);
    const categories = page.locator(".subsection.paper-categories");
    await expect(categories.locator("> p").first()).toHaveText(
      "The workshop solicits papers in the following categories:",
    );
    if (!populated(testInfo.project.name)) {
      await expect(categories.locator(".paper-lengths")).toContainText(
        "full papers (up to 8 pages, including references)",
      );
      await expect(categories.locator(".paper-lengths")).toContainText(
        "(up to 4 pages, including references)",
      );
    }
  });

  // As on the previous edition's site, facts not yet known are simply not listed.
  test("Submission lists only what is known", async ({ page }, testInfo) => {
    await page.goto("");
    const details = section(page, "submission").locator(".subsection", {
      has: page.locator("#submission-details"),
    });
    await expect(details).not.toContainText(/to be announced/i);
    await expect(details.locator(".facts > div", { hasText: "Review model" })).toHaveCount(
      populated(testInfo.project.name) ? 1 : 0,
    );
  });
});

// The organizers asked for a phone view as finished as the desktop one.
test.describe("on a phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE);
  });

  test("a list that ends its section does not draw a second rule", async ({ page }) => {
    for (const path of [""]) {
      await page.goto(path);
      // A section ends on its way back to the top, so the list is the one before it.
      const widths = await page.locator("main > section").evaluateAll((sections) =>
        sections
          .map((section) => section.lastElementChild?.previousElementSibling)
          .filter((list) => list?.matches(".facts"))
          .map((list) => {
            const row = list?.lastElementChild;
            return row ? getComputedStyle(row).borderBottomWidth : "";
          }),
      );
      for (const width of widths) expect(width, path).toBe("0px");
    }
  });

  test("the banner's host stays whole on its line", async ({ page }) => {
    await page.goto("");
    const host = page.locator(".hero__where a");
    expect(await host.evaluate((a) => a.getClientRects().length)).toBe(1);
  });
});

test("a break in the program is set in the page's type", async ({ page }, testInfo) => {
  test.skip(!populated(testInfo.project.name), "needs a break");
  await page.goto("");
  const brief = page.locator(".session--brief h3").first();
  expect(await brief.evaluate((e) => getComputedStyle(e).fontFamily)).toContain("Source Serif 4");
});
