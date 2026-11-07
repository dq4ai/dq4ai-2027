/** The header stays within reach, and photos of Lille never cost the text its contrast. */
import { expect, test } from "@playwright/test";
import { PAGES } from "./pages";

const populated = (name: string) => name === "populated-content";

/** WCAG contrast of white text over the lightest possible pixel behind a scrim of this color. */
const contrastOverWhite = ([r, g, b, a]: number[]) => {
  const over = [r, g, b].map((channel) => (channel ?? 0) * (a ?? 0) + 255 * (1 - (a ?? 0)));
  const [lr, lg, lb] = over.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * (lr ?? 0) + 0.7152 * (lg ?? 0) + 0.0722 * (lb ?? 0);
  return 1.05 / (luminance + 0.05);
};

test.describe("the header stays within reach", () => {
  for (const [width, height] of [
    [1440, 900],
    [820, 1180],
    [390, 844],
    [844, 390],
  ] as const) {
    test(`at ${width}x${height} it stays at the top while scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("call-for-papers/");
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
    await page.goto("call-for-papers/");
    await page.evaluate(() => {
      scrollTo(0, 2000);
    });
    await page.locator("#site-nav").getByRole("link", { name: "Dates" }).click();
    await expect(page).toHaveURL(/dates\/$/);
  });

  test("a section link does not land under it", async ({ page }) => {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("call-for-papers/#policies");
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
    await page.goto("call-for-papers/");
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

  test("the deadline bar scrolls away rather than stacking under it", async ({
    page,
  }, testInfo) => {
    test.skip(!populated(testInfo.project.name), "needs a dated deadline");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("");
    await expect(page.locator(".deadline-strip")).toHaveCSS("position", "static");
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
    await page.goto("attend/");
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
    await page.goto("attend/");
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
    await page.goto("attend/");
    const image = page.locator(".city-photo img");
    await image.scrollIntoViewIfNeeded();
    expect((await image.boundingBox())?.width ?? 0).toBeGreaterThan(700);
  });
});

test.describe("the call for papers banner", () => {
  test("the panorama sits behind the title and leaves it readable", async ({ page }, testInfo) => {
    test.skip(populated(testInfo.project.name), "the fixture has its own images");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("call-for-papers/");
    const header = page.locator(".page-header--photo");
    const image = header.locator("img");
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    const [imageBox, titleBox] = await Promise.all([
      image.boundingBox(),
      header.locator("h1").boundingBox(),
    ]);
    expect(imageBox?.y ?? Infinity).toBeLessThanOrEqual(titleBox?.y ?? 0);
    expect(await header.locator("h1").evaluate((e) => getComputedStyle(e).color)).toBe(
      "rgb(255, 255, 255)",
    );
  });

  for (const [width, height] of [
    [1440, 900],
    [820, 1180],
    [390, 844],
  ] as const) {
    test(`white text holds AA over any photo at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("call-for-papers/");
      const samples = await page.locator(".page-header--photo").evaluate((header) => {
        const box = header.getBoundingClientRect();
        const text = [...header.querySelectorAll(".page-context, h1, .lede")].map((e) => {
          const range = document.createRange();
          range.selectNodeContents(e);
          return range.getBoundingClientRect();
        });
        const right = Math.max(...text.map((rect) => rect.right));
        return {
          share: (right - box.left) / box.width,
          stops: getComputedStyle(header, "::before").backgroundImage,
        };
      });
      const stops = [...samples.stops.matchAll(/rgba?\(([^)]+)\)\s*([\d.]+)%?/g)].map((match) => ({
        color: (match[1] ?? "").split(",").map(Number),
        at: Number(match[2]) / 100,
      }));
      const covering = stops.filter((stop) => stop.at <= samples.share || stop === stops.at(-1));
      const first = stops.find((stop) => stop.at >= samples.share) ?? stops.at(-1);
      for (const stop of [...covering.slice(0, -1), first]) {
        if (stop) expect(contrastOverWhite(stop.color)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  test("the panorama shows no credit line on the site", async ({ page }) => {
    for (const path of ["call-for-papers/", "attend/"]) {
      await page.goto(path);
      await expect(page.locator(".photo-credit")).toHaveCount(0);
      await expect(page.locator("main")).not.toContainText("banner");
    }
  });

  test("it prints as plain text, without the photo", async ({ page }) => {
    await page.goto("call-for-papers/");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".page-header--photo img")).toBeHidden();
    expect(
      await page.locator(".page-header--photo h1").evaluate((e) => getComputedStyle(e).color),
    ).toBe("rgb(0, 0, 0)");
  });

  test("a phone gets the title on navy, without downloading the photo", async ({ page }) => {
    const panorama: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("grand-place-panorama")) panorama.push(request.url());
    });
    await page.setViewportSize({ width: 412, height: 823 });
    await page.goto("call-for-papers/", { waitUntil: "networkidle" });
    expect(panorama).toEqual([]);
    await expect(page.locator(".page-header__photo")).toBeHidden();
    await expect(page.locator(".page-header--photo h1")).toBeVisible();
  });

  test("other pages keep the plain header", async ({ page }) => {
    await page.goto("dates/");
    await expect(page.locator(".page-header--photo")).toHaveCount(0);
  });
});
