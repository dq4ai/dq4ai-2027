/** The header stays within reach, and the photo of Lille is credited and fills its column. */
import { expect, test } from "@playwright/test";
import { PAGES } from "./pages";

const populated = (name: string) => name === "populated-content";

test.describe("the header stays within reach", () => {
  for (const [width, height] of [
    [1440, 900],
    [820, 1180],
    [390, 844],
    [844, 390],
  ] as const) {
    test(`at ${width}x${height} it stays at the top while scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("");
      await page.evaluate(() => {
        scrollTo(0, 1500);
      });
      await expect.poll(async () => (await page.locator(".site-header").boundingBox())?.y).toBe(0);
      await expect(page.locator(".site-header")).toBeInViewport();
      const opaque = await page
        .locator(".site-header")
        .evaluate((e) => getComputedStyle(e).backgroundColor);
      expect(opaque).not.toBe("rgba(0, 0, 0, 0)");
    });
  }

  test("a link in the header still goes anywhere after scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("");
    await page.evaluate(() => {
      scrollTo(0, 2000);
    });
    await page.locator("#site-nav").getByRole("link", { name: "Organization" }).click();
    await expect(page).toHaveURL(/\/#organization$/);
    await expect(page.locator("#organization")).toBeInViewport();
  });

  test("a section link does not land under it", async ({ page }) => {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("#policies");
      await expect
        .poll(async () => {
          const header = await page.locator(".site-header").boundingBox();
          const heading = await page.locator("#policies").boundingBox();
          return (heading?.y ?? 0) - ((header?.y ?? 0) + (header?.height ?? 0));
        })
        .toBeGreaterThanOrEqual(0);
    }
  });

  test("keyboard focus never hides under it", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("");
    await page.evaluate(() => {
      scrollTo(0, document.body.scrollHeight);
    });
    for (let stop = 0; stop < 12; stop += 1) {
      await page.keyboard.press("Shift+Tab");
    }
    const hidden = await page.evaluate(() => {
      const header = document.querySelector(".site-header")?.getBoundingClientRect();
      const active = document.activeElement;
      if (!header || !active || document.querySelector(".site-header")?.contains(active))
        return false;
      return active.getBoundingClientRect().top < header.bottom;
    });
    expect(hidden).toBe(false);
  });

  test("every link of an open menu can be reached on a short phone", async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto("");
    await page.evaluate(() => {
      scrollTo(0, 400);
    });
    await page.locator(".nav-toggle").click();
    const last = page.locator("#site-nav a").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await expect(page.locator(".nav-toggle")).toHaveAttribute("aria-expanded", "true");
  });

  test("a very large browser font does not pin half the screen", async ({ baseURL }) => {
    const { chromium } = await import("@playwright/test");
    const large = await chromium.launch({ args: ["--blink-settings=defaultFontSize=32"] });
    const page = await large.newPage({ baseURL, viewport: { width: 390, height: 844 } });
    await page.goto("");
    await expect(page.locator(".site-header")).toHaveCSS("position", "static");
    await large.close();
  });

  test("it is not printed", async ({ page }) => {
    await page.goto("");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".site-header")).toBeHidden();
  });

  test("no page scrolls sideways because of it", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    for (const path of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBe(0);
    }
  });
});

test.describe("the host city", () => {
  test("the photo leads to a description of Lille", async ({ page }, testInfo) => {
    await page.goto("");
    const expected = populated(testInfo.project.name)
      ? "https://example.org/city"
      : "https://fr.wikipedia.org/wiki/Lille";
    await expect(page.locator(".city-photo a:has(img)")).toHaveAttribute("href", expected);
    await expect(
      page.locator(".city-photo figcaption").getByRole("link", { name: /Wikipedia/ }),
    ).toHaveAttribute("href", expected);
  });

  test("the real photo is the Grand'Place at dusk, credited to its author", async ({
    page,
  }, testInfo) => {
    test.skip(populated(testInfo.project.name), "the fixture has its own images");
    await page.goto("");
    const caption = page.locator(".city-photo figcaption");
    await expect(caption).toContainText("Velvet");
    await expect(caption.getByRole("link", { name: "CC BY-SA 4.0" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-sa/4.0/",
    );
    await expect(caption.getByRole("link", { name: "Wikimedia Commons" })).toHaveAttribute(
      "href",
      /File:Lille_gd_place_pano_ter\.jpg/,
    );
  });

  test("the panorama fills its column", async ({ page }, testInfo) => {
    test.skip(populated(testInfo.project.name), "the fixture has its own images");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("");
    const image = page.locator(".city-photo img");
    await image.scrollIntoViewIfNeeded();
    expect((await image.boundingBox())?.width ?? 0).toBeGreaterThan(700);
  });
});
