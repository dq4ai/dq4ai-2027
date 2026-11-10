import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import ICAL from "ical.js";
import { datesTable, OLD_PAGES, PAGES, section } from "./pages";

const populated = (name: string) => name === "populated-content";
const PRINT_PAGES = 8;

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

test("the home page leads with the workshop's purpose", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".about")).toContainText(
    "bring together researchers and practitioners",
  );
  await expect(page.locator("main .topics")).toContainText("Multimodal data quality");
});

// The chairs asked for nothing between the banner and "About": no statement, button or key facts.
test("the home page goes from the banner straight to About", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("");
  const banner = page.locator(".hero__banner");
  await expect(banner).toContainText("Lille, France");
  await expect(banner.getByRole("link", { name: "EDBT/ICDT 2027" })).toBeVisible();
  await expect(page.locator(".hero > *")).toHaveCount(1);
  await expect(page.locator(".exchange, .record, .hero__actions, .hero__body")).toHaveCount(0);
  await expect(page.locator("main").getByRole("link", { name: /call for papers/i })).toHaveCount(0);
  await expect(page.locator("main > section").first().locator("h2")).toHaveText(
    "About the DQ4AI Workshop",
  );
});

// The organizers asked for no "Read more" or "Show less": everything is read in place.
test("About shows the whole scope and goal, with nothing to open", async ({ page }) => {
  await page.goto("");
  const about = page.locator(".about");
  await expect(about.getByRole("heading", { name: "About the DQ4AI Workshop" })).toBeVisible();
  await expect(about.getByText("The rapid emergence")).toBeVisible();
  await expect(about.getByText("two-way relationship")).toBeVisible();
  await expect(about.getByText("The goal of the workshop")).toBeVisible();
  // Talk abstracts in a program may still open; nothing else does.
  await expect(page.locator("main details:not(.session details)")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/Read more|Show less/);
});

// As on the previous edition's site: the categories, then the dates, then how to submit.
test("the Submission section reads like the previous edition's", async ({ page }) => {
  await page.goto("");
  const submission = section(page, "submission");
  await expect(submission.locator("h3")).toHaveText([
    "Paper categories",
    "Important dates",
    "Submission details",
  ]);
  await expect(submission.locator("#checklist, #faq")).toHaveCount(0);
});

test("the page has no News section, as the organizers asked", async ({ page }) => {
  await page.goto("");
  await expect(page.locator("#news, [id^='news-']")).toHaveCount(0);
  await expect(page.locator("main h2", { hasText: /news/i })).toHaveCount(0);
});

test("Submission does not link to the dates just below it", async ({ page }) => {
  await page.goto("");
  await expect(section(page, "submission").locator('> p a[href$="#dates"]')).toHaveCount(0);
});

test("every old page address leads to its section", async ({ page }) => {
  for (const [path, id] of Object.entries(OLD_PAGES)) {
    if (id === "keynotes") continue; // Only there while there are keynotes.
    await page.goto(path);
    await expect(page, path).toHaveURL(new RegExp(`/#${id}$`));
    await expect(page.locator(`#${id}`), path).toBeVisible();
  }
});

test("a phone's first screen reaches About", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  await expect(page.locator(".hero__banner")).toBeInViewport({ ratio: 1 });
  await expect(page.locator("#about")).toBeInViewport({ ratio: 1 });
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
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: "Topics of Interest", exact: true }),
  ).toBeVisible();
});

test("the navigation stays visible wherever its links fit", async ({ page }) => {
  // A link for every section: one row on a wide screen, and it may wrap where the page narrows.
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("");
  const tops = await page
    .locator("#site-nav a:visible")
    .evaluateAll((all) => all.map((link) => link.getBoundingClientRect().top));
  expect(new Set(tops).size, "links share one row at 1440px").toBe(1);
  await page.setViewportSize({ width: 1040, height: 800 });
  await expect(page.locator(".nav-toggle")).toBeHidden();
  const links = page.locator("#site-nav a:visible");
  const boxes = await links.evaluateAll((all) =>
    all.map((link) => {
      const { top, right } = link.getBoundingClientRect();
      return { top, right };
    }),
  );
  const header = await page.locator(".site-header__inner").boundingBox();
  expect(Math.max(...boxes.map((box) => box.right))).toBeLessThanOrEqual(
    (header?.x ?? 0) + (header?.width ?? 0),
  );
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(page.locator(".nav-toggle")).toBeVisible();
});

test("the wordmark keeps its words apart", async ({ page }) => {
  await page.goto("");
  for (const area of [".site-header", ".site-footer"]) {
    await expect(
      page.locator(area).getByRole("link", { name: "DQ4AI 2027", exact: true }),
    ).toHaveCount(1);
    const text = await page.locator(`${area} .brand`).textContent();
    expect(text?.trim()).toBe("DQ4AI 2027");
  }
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

test("no page shows the raw value TBA or the old wording", async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator("main"), path).not.toContainText(/\bTBA\b/);
    await expect(page.locator("main"), path).not.toContainText(/not yet set/i);
  }
});

// The organizers asked for no Attend section: the host conference handles venue and travel.
test("the page has no Attend, Policies, Previous editions or Contact section", async ({ page }) => {
  await page.goto("");
  await expect(page.locator("#attend, #policies, #previous-editions, #contact")).toHaveCount(0);
  await expect(page.locator("main figure, main .city-photo")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/Visa letters|Host city/);
});

test("no photo reaches the first screen, and every photo waits to be scrolled to", async ({
  page,
}) => {
  await page.goto("");
  for (const image of await page.locator("main img").all()) {
    await expect(image).toHaveAttribute("loading", "lazy");
    await expect(image).not.toBeInViewport();
  }
});

// As the previous edition: "© QuaLLM-KG 2026 — All rights reserved" on one line, with no menu,
// and each page ends on a way back to the top.
test("the footer is one line with the copyright and no menu", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("");
  const footer = page.locator(".site-footer");
  await expect(footer.locator(".site-footer__title")).toHaveText(
    "© DQ4AI 2027 — All rights reserved",
  );
  await expect(footer.getByRole("link")).toHaveCount(1);
  await expect(footer.locator("nav")).toHaveCount(0);
  const box = (selector: string) =>
    footer.locator(selector).evaluate((item) => item.getBoundingClientRect().toJSON() as DOMRect);
  const [brand, title] = await Promise.all([box(".brand"), box(".site-footer__title")]);
  const middle = (rect: DOMRect) => rect.top + rect.height / 2;
  expect(Math.abs(middle(brand) - middle(title))).toBeLessThan(1);
  const lineHeight = await footer
    .locator(".site-footer__title")
    .evaluate((p) => parseFloat(getComputedStyle(p).lineHeight));
  expect(title.height).toBeLessThanOrEqual(lineHeight + 1);
});

test("every section ends on a way back to the top", async ({ page }) => {
  await page.goto("");
  const sections = page.locator("main > section");
  expect(await sections.count()).toBeGreaterThanOrEqual(7);
  for (const each of await sections.all()) {
    const link = each.locator("> .go-top:last-child a");
    await expect(link).toHaveText("Go to top ↑");
    await expect(link).toHaveAttribute("href", "#top");
  }
  // At the far right of the page, as the organizers asked, in line with the header.
  await page.setViewportSize({ width: 1366, height: 800 });
  const right = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((e) => e.getBoundingClientRect().right);
  expect(await right(".go-top a")).toBeCloseTo(await right(".site-header__inner"), 0);
  await section(page, "organizers").locator(".go-top a").click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("a section heading is plain text with its link beside it", async ({ page }) => {
  await page.goto("");
  await expect(page.locator("#topics a")).toHaveCount(0);
  const anchor = page.getByRole("link", {
    name: "Link to section: Topics of Interest",
    exact: true,
  });
  await expect(anchor).toHaveAttribute("href", "#topics");
  await page.setViewportSize({ width: 1100, height: 800 });
  await anchor.focus();
  await expect(anchor).toHaveCSS("opacity", "1");
  // Measured together: focusing the link can scroll the page.
  const boxes = await anchor.evaluate((link) => {
    const own = link.getBoundingClientRect();
    const heading = document.querySelector("#topics")?.getBoundingClientRect();
    return { linkX: own.left, linkY: own.top, headingX: heading?.left, headingY: heading?.top };
  });
  expect(boxes.linkX).toBeLessThan(boxes.headingX ?? 0);
  expect(boxes.linkX, "the link is not cut off by the page edge").toBeGreaterThanOrEqual(0);
  expect(Math.abs(boxes.linkY - (boxes.headingY ?? Infinity))).toBeLessThan(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(anchor).toBeHidden();
});

// The chairs asked for the deadlines and the workshop's day only: no host conference dates, no
// calendar file or time-zone buttons.
test("the dates section lists the deadlines and the workshop's day only", async ({ page }) => {
  await page.goto("");
  const dates = datesTable(page);
  await expect(dates.locator("tbody th").last()).toHaveText("Workshop date");
  await expect(dates.locator("table")).not.toContainText("EDBT/ICDT");
  await expect(page.locator("main")).not.toContainText("6–9 April");
  await expect(dates.locator(".toolbar, .tz-toggle, [data-zone-note]")).toHaveCount(0);
  await expect(dates.locator('a[href$=".ics"]')).toHaveCount(0);
});

test("a table that may scroll can be reached by keyboard", async ({ page }) => {
  await page.goto("");
  for (const table of await page.locator(".table-wrap").all()) {
    await expect(table).toHaveAttribute("tabindex", "0");
    await expect(table).toHaveRole("region");
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

test("navigation reaches a section of the page", async ({ page }) => {
  await page.goto("");
  await page.locator("#site-nav").getByRole("link", { name: "Organizers" }).click();
  await expect(page).toHaveURL(/\/#organizers$/);
  await expect(page.locator("#organizers")).toBeInViewport();
});

test("the site works without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 800 },
  });
  const page = await context.newPage();
  await page.goto(baseURL ?? "");
  await expect(page.locator("#site-nav a").first()).toBeVisible();
  await expect(page.locator(".nav-toggle")).toBeHidden();
  await context.close();
});

test("the deadlines calendar downloads and parses", async ({ request, baseURL }, testInfo) => {
  const response = await request.get(`${baseURL}calendar/deadlines.ics`);
  expect(response.ok()).toBe(true);
  const calendar = new ICAL.Component(ICAL.parse(await response.text()));
  const summaries = calendar
    .getAllSubcomponents("vevent")
    .map((component) => new ICAL.Event(component).summary);
  expect(summaries).toContain("EDBT/ICDT 2027 (host conference)");
  expect(summaries).toContain("DQ4AI 2027 workshop");
  expect(summaries).toHaveLength(populated(testInfo.project.name) ? 6 : 5);
});

test("organizers are listed once and the committee is sorted as configured", async ({
  page,
}, testInfo) => {
  await page.goto("");
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
    await expect(section(page, "organizers").locator("h3").first()).toHaveText("Honorary Chair");
  }
});

test.describe("states that depend on content", () => {
  test("empty and populated program", async ({ page, request, baseURL }, testInfo) => {
    await page.goto("");
    const program = section(page, "program");
    if (!populated(testInfo.project.name)) {
      await expect(program.locator(".tba")).toHaveText("To be announced");
      await expect(page.locator(".tz-toggle")).toBeHidden();
      return;
    }
    await expect(program.locator(".session")).toHaveCount(2);
    const abstract = program.locator("details").first();
    await expect(abstract.locator("p")).toBeHidden();
    await abstract.locator("summary").click();
    await expect(abstract.locator("p")).toBeVisible();
    const session = await request.get(`${baseURL}calendar/session-opening.ics`);
    expect(await session.text()).toContain("DTSTART:20270407T070000Z");
  });

  test("a session's details end before its calendar link", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a session with a chair");
    await page.goto("");
    await expect(page.locator(".session__meta", { hasText: "Chair:" }).first()).toContainText(
      /Chair: [^.]+\. Add to calendar/,
    );
  });

  test("an extended deadline says so even when it is not the next one", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an extended deadline");
    await page.goto("");
    const dates = datesTable(page);
    const row = dates.locator("tbody tr", { hasText: "Author notification" });
    await expect(row.locator(".status--extended:visible")).toHaveText("Extended");
    const plain = dates.locator("tbody tr", { hasText: "Camera-ready" });
    await expect(plain.locator(".status--extended")).toHaveCount(0);
  });

  test("on a phone the dates table is two columns and keeps its status", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a dated deadline");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("");
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

  // Both content sets have dated deadlines now; the undated table is no longer built anywhere.
  test("the dates table shows each deadline's status once dates are set", async ({ page }) => {
    await page.goto("");
    await expect(page.locator("thead").getByText("Status")).toBeVisible();
    const row = page.locator("tbody tr", { hasText: "Paper submission" });
    await expect(row.getByText("To be announced")).toHaveCount(0);
  });

  test("only the next deadline is flagged, where deadlines are listed", async ({ page }) => {
    await page.goto("");
    await expect(datesTable(page).locator(".flag")).toHaveCount(1);
    await expect(page.locator("main .flag")).toHaveCount(1);
    await expect(page.locator(".deadline-strip")).toHaveCount(0);
  });

  test("the conference's dates are not given as the workshop's", async ({ page }, testInfo) => {
    await page.goto("");
    await expect(page.locator(".hero__date")).toHaveText(
      populated(testInfo.project.name) ? "(April 7, 2027)" : "(April 6, 2027)",
    );
    // The organizers asked to leave out the host conference's dates.
    await expect(page.locator("main")).not.toContainText("6–9 April 2027");
  });

  test("the page limit is with the paper categories", async ({ page }) => {
    await page.goto("");
    await expect(page.locator(".subsection.paper-categories")).toContainText(/Page limit/);
  });

  // As on the previous edition's site, accepted papers are part of the program.
  test("the menu has no Accepted Papers link", async ({ page }) => {
    await page.goto("");
    const link = page.locator("#site-nav").getByRole("link", { name: "Accepted Papers" });
    await expect(link).toHaveCount(0);
  });

  test("an extended deadline strikes through the old date", async ({ page }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs an extended deadline");
    await page.goto("");
    const row = page.locator("tbody tr", { hasText: "Paper submission" });
    await expect(row.locator("del")).toHaveText("11 December 2026, 23:59 AoE");
    await expect(row.getByText("18 December 2026, 23:59 AoE")).toBeVisible();
    await expect(row.locator(".status--extended:visible")).toBeVisible();
    await expect(row).toContainText("Was");
    await expect(row).toContainText("Now");
  });
});

test("the page prints without site chrome", async ({ page }) => {
  await page.goto("");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator(".site-footer")).toBeHidden();
  await expect(page.locator("#topics")).toBeVisible();
  const pdf = await page.pdf({ format: "A4" });
  const pages = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g)?.length ?? 0;
  expect(pages).toBeGreaterThan(0);
  // The whole site is one page now, so it prints as a short document rather than one sheet.
  expect(pages).toBeLessThanOrEqual(PRINT_PAGES);
});

test("a flagged date prints on the same column as the others", async ({ page }, testInfo) => {
  test.skip(!populated(testInfo.project.name), "needs a flagged date");
  await page.goto("");
  await page.emulateMedia({ media: "print" });
  const lefts = await datesTable(page)
    .locator("td > time")
    .evaluateAll((times) => times.map((time) => time.getBoundingClientRect().left));
  expect(lefts.length).toBeGreaterThan(1);
  expect(new Set(lefts).size).toBe(1);
});

test("the home page prints at document sizes", async ({ page }) => {
  await page.goto("");
  await page.emulateMedia({ media: "print" });
  const title = await page
    .locator(".hero h1")
    .evaluate((h1) => parseFloat(getComputedStyle(h1).fontSize));
  expect(title).toBeLessThanOrEqual(27);
});
