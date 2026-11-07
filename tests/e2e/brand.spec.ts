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
    expect(surface).toBe("rgb(252, 253, 254)");
    await expect(
      page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]'),
    ).toHaveAttribute("content", "#fcfdfe");
    await expect(
      page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'),
    ).toHaveAttribute("content", "#0d1626");
  });
});

test.describe("topic icons", () => {
  test("the home page's first section is the eight topics, each with its icon", async ({
    page,
  }) => {
    await page.goto("");
    await expect(page.locator("main > section").first()).toHaveClass(/topic-band/);
    const tiles = page.locator(".topic-grid > li");
    const titles = await tiles.allTextContents();
    expect(titles.map((title) => title.trim()).toSorted()).toEqual(TOPICS.toSorted());
    for (const tile of await tiles.all()) {
      await expect(tile.locator("svg.topic-icon")).toBeVisible();
      await expect(tile.locator("svg.topic-icon")).toHaveAttribute("aria-hidden", "true");
    }
  });

  test("a tile leads to that topic's full description", async ({ page }) => {
    await page.goto("");
    await page.locator(".topic-grid a", { hasText: "Knowledge graphs" }).click();
    await expect(page).toHaveURL(/call-for-papers\/#topic-knowledge-graphs$/);
    await expect(page.locator("#topic-knowledge-graphs")).toContainText("entity resolution");
    await expect(page.locator("#topic-knowledge-graphs")).toBeInViewport();
  });

  test("the call for papers keeps each description with its icon", async ({ page }) => {
    await page.goto("call-for-papers/");
    const rows = page.locator(".topics > li");
    await expect(rows).toHaveCount(TOPICS.length);
    for (const row of await rows.all()) {
      await expect(row.locator("svg.topic-icon")).toBeVisible();
    }
    await expect(page.locator("#topic-data-quality-for-ai")).toContainText(
      "Quality of training and fine-tuning data",
    );
  });

  test("the grid fits every width without sideways scrolling", async ({ page }) => {
    for (const [width, columns] of [
      [320, 2],
      [390, 2],
      [820, 4],
      [1440, 4],
    ] as const) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("");
      const tracks = await page
        .locator(".topic-grid")
        .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length);
      expect(tracks, `${width}px`).toBe(columns);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px`).toBe(0);
    }
  });

  test("a tile is a large target", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("");
    const box = await page.locator(".topic-grid a").first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("the two-way statement carries the first two topics' icons", async ({ page }) => {
    await page.goto("");
    await expect(page.locator(".exchange svg.topic-icon")).toHaveCount(2);
  });

  test("the icons print, since the home page's topics are only titles now", async ({ page }) => {
    await page.goto("");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".topic-grid > li").first()).toBeVisible();
    await expect(page.locator(".topic-grid svg").first()).toBeVisible();
  });
});
