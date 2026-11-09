/** The logo and topic icons are what the rest of the design is built around. */
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const TOPICS = [
  "Data quality for AI",
  "AI for data quality",
  "Knowledge graphs",
  "Quality in LLMs, NLP, and generative AI",
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

  test("the logo's colors follow the theme", async ({ page }) => {
    const arc = page.locator(".site-header .mark .mark__stroke-a").first();
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("");
    expect(await arc.evaluate((e) => getComputedStyle(e).stroke)).toBe("rgb(30, 58, 138)");
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await arc.evaluate((e) => getComputedStyle(e).stroke)).toBe("rgb(143, 176, 255)");
  });

  test("the home page opens with the logo", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("");
    const mark = page.locator(".hero svg.mark");
    await expect(mark).toBeInViewport({ ratio: 1 });
    expect((await mark.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(96);
  });

  test("the page's rule carries the logo's two colors", async ({ page }) => {
    await page.goto("dates/");
    const image = await page
      .locator(".page-header")
      .evaluate((e) => getComputedStyle(e).borderImageSource);
    expect(image).toContain("rgb(30, 58, 138)");
    expect(image).toContain("rgb(15, 127, 114)");
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
    await expect(
      page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]'),
    ).toHaveAttribute("content", "#fbf9f4");
    await expect(
      page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'),
    ).toHaveAttribute("content", "#141820");
  });
});

// The organizers asked for the topics as titles only, without icons.
test.describe("topics", () => {
  test("the home page's first section lists the eight topics by title, without icons", async ({
    page,
  }) => {
    await page.goto("");
    const first = page.locator("main > section").first();
    await expect(first.getByRole("heading", { name: "Topics of interest" })).toBeVisible();
    const titles = await first.locator(".topic-list > li").allTextContents();
    expect(titles.map((title) => title.trim()).toSorted()).toEqual(TOPICS.toSorted());
    await expect(first.locator("svg")).toHaveCount(0);
  });

  test("a topic title leads to its full description", async ({ page }) => {
    await page.goto("");
    await page.locator(".topic-list a", { hasText: "Knowledge graphs" }).click();
    await expect(page).toHaveURL(/call-for-papers\/#topic-knowledge-graphs$/);
    await expect(page.locator("#topic-knowledge-graphs")).toContainText("entity resolution");
    await expect(page.locator("#topic-knowledge-graphs")).toBeInViewport();
  });

  test("the call for papers gives each topic its title and description, without icons", async ({
    page,
  }) => {
    await page.goto("call-for-papers/");
    const rows = page.locator(".topics > li");
    await expect(rows).toHaveCount(TOPICS.length);
    await expect(page.locator(".topics svg")).toHaveCount(0);
    await expect(page.locator("#topic-data-quality-for-ai")).toContainText(
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

  test("the two-way statement is said in type alone", async ({ page }) => {
    await page.goto("");
    await expect(page.locator(".exchange span")).toHaveCount(2);
    await expect(page.locator(".exchange svg")).toHaveCount(0);
  });
});
