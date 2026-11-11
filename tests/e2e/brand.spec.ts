/** The logo and topic icons are what the rest of the design is built around. */
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const TOPICS = [
  "Data quality for AI",
  "AI for data quality",
  "Quality in KGs",
  "Quality in LLMs and generative AI",
  "Data management and governance for AI",
  "Multimodal data quality",
  "Evaluation and benchmarks",
  "Applications and case studies",
];

test.describe("logo", () => {
  for (const area of [".site-header", ".site-footer"]) {
    test(`${area} shows the logo beside the name`, async ({ page }) => {
      await page.goto("");
      const brand = page.locator(`${area} .brand`);
      const mark = brand.locator("svg.mark");
      await expect(mark).toBeVisible();
      await expect(mark).toHaveAttribute("aria-hidden", "true");
      const [logo, name] = await Promise.all([
        mark.boundingBox(),
        brand.locator(".brand__name").boundingBox(),
      ]);
      expect((logo?.x ?? 0) + (logo?.width ?? 0)).toBeLessThanOrEqual(name?.x ?? 0);
    });
  }

  test("the name's 4 is teal, and amber is left to the next deadline", async ({ page }) => {
    await page.goto("");
    const digit = page.locator(".site-header .brand__digit");
    await expect(digit).toHaveText("4");
    const [color, background] = await digit.evaluate((e) => {
      const style = getComputedStyle(e);
      return [style.color, style.backgroundColor];
    });
    expect(color).toBe("rgb(15, 127, 114)");
    expect(background).toBe("rgba(0, 0, 0, 0)");
  });

  // Light only, as the organizers asked: a dark system theme changes nothing.
  test("the logo keeps its colors whatever the system theme", async ({ page }) => {
    const arc = page.locator(".site-header .mark .mark__stroke-a").first();
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("");
    expect(await arc.evaluate((e) => getComputedStyle(e).stroke)).toBe("rgb(30, 58, 138)");
  });

  test("the home page opens with the logo", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("");
    const mark = page.locator(".hero svg.mark");
    await expect(mark).toBeInViewport({ ratio: 1 });
    expect((await mark.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(96);
  });

  test("the favicon is the logo, in the logo's colors", () => {
    const favicon = readFileSync("public/favicon.svg", "utf8");
    expect(favicon.toLowerCase()).toContain("#1e3a8a");
    expect(favicon.toLowerCase()).toContain("#0f7f72");
    expect(favicon.toLowerCase()).not.toContain("#f6c945");
  });

  test("the browser toolbar matches the page", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("");
    const surface = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(surface).toBe("rgb(251, 249, 244)");
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#fbf9f4");
  });
});

// The organizers asked for the topics without icons, then as the previous edition listed them:
// each topic a heading over its bullet points, shown in full on the one page.
test.describe("topics", () => {
  for (const path of [""]) {
    test("the page lists the eight topics as headings over bullet points", async ({ page }) => {
      await page.goto(path);
      const section = page.locator("main > section", { has: page.locator("#topics") });
      const topics = section.locator(".topics");
      const titles = await topics.locator("h3").allTextContents();
      expect(titles.map((title) => title.trim()).toSorted()).toEqual(TOPICS.toSorted());
      for (const heading of await topics.locator("h3").all()) {
        const bullets = await heading.evaluate(
          (h) => h.nextElementSibling?.matches("ul") && h.nextElementSibling.children.length,
        );
        expect(bullets, (await heading.textContent()) ?? "").toBeGreaterThan(0);
      }
      await expect(topics.locator("svg, a, details")).toHaveCount(0);
    });
  }

  test("each topic has its own address", async ({ page }) => {
    // The organizers asked for "Quality in KGs" rather than "Knowledge graphs".
    await page.goto("#topic-quality-in-kgs");
    const heading = page.locator("#topic-quality-in-kgs");
    await expect(heading).toBeInViewport();
    await expect(page.locator("#topic-quality-in-kgs + ul")).toContainText(
      "Entity resolution and ontology alignment",
    );
    await expect(page.locator("#topic-data-quality-for-ai + ul")).toContainText(
      "Quality of training and fine-tuning data",
    );
  });

  test("the topics fit every width without sideways scrolling", async ({ page }) => {
    for (const width of [320, 390, 820, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px`).toBe(0);
    }
  });
});
