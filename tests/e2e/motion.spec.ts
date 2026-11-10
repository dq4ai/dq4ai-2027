/** Motion explains, gives feedback or directs attention. See "Motion" in docs/ARCHITECTURE.md. */
import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";

const running = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((e) => e.getAnimations({ subtree: true }).map((a) => a.playState));

test.describe("tokens", () => {
  test("durations and easings come only from tokens", () => {
    const folder = "src/styles/components";
    const sheets = [
      "src/styles/base.css",
      ...readdirSync(folder).map((name) => `${folder}/${name}`),
    ];
    for (const sheet of sheets) {
      const css = readFileSync(sheet, "utf8").replace(
        /(animation|transition)-duration: 0\.01ms/g,
        "",
      );
      expect(css, sheet).not.toMatch(/\b\d+m?s\b/);
      expect(css, sheet).not.toMatch(/cubic-bezier|(?<!--)\bease\b/);
    }
  });
});

test.describe("what moves", () => {
  test("the home logo's loop settles once around the checked data", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("");
    const names = await page
      .locator(".hero .mark__loop")
      .evaluate((e) => getComputedStyle(e).animationName);
    expect(names).toBe("settle");
    const header = await page
      .locator(".site-header .mark__loop")
      .evaluate((e) => getComputedStyle(e).animationName);
    expect(header).toBe("none");
  });

  test("the opening menu fades in, and closes at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("");
    await page.locator(".nav-toggle").click();
    const open = await page.locator("#site-nav").evaluate((e) => getComputedStyle(e).animationName);
    expect(open).toBe("reveal");
    await page.locator(".nav-toggle").click();
    await expect(page.locator("#site-nav")).toBeHidden();
  });

  test("a hovered button eases, and only then", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("");
    const link = page.locator(".go-top a").first();
    const duration = () => link.evaluate((e) => getComputedStyle(e).transitionDuration);
    expect(await duration()).toBe("0s");
    await link.hover();
    expect(await duration()).toBe("0.15s");
  });

  test("a pressed button gives way under the pointer", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("");
    const button = page.locator(".nav-toggle");
    await button.hover();
    await page.mouse.down();
    await expect
      .poll(() => button.evaluate((e) => getComputedStyle(e).transform))
      .toContain("matrix(0.97");
    await page.mouse.up();
  });
});

test.describe("what stays still", () => {
  test("section links jump, without a long scroll", async ({ page }) => {
    await page.goto("");
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
    ).toBe("auto");
  });

  test("reduced motion stops every movement, and keeps every state", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("");
    expect(await running(page, ".hero")).toEqual([]);
    const toggle = page.locator(".nav-toggle");
    await toggle.click();
    expect(await running(page, "#site-nav")).toEqual([]);
    await expect(toggle).toHaveText("Close");
    await expect(page.locator("#site-nav a").first()).toBeVisible();
    await toggle.hover();
    await page.mouse.down();
    expect(await toggle.evaluate((e) => getComputedStyle(e).transform)).toBe("none");
    await page.mouse.up();
  });
});

test.describe("every control shows its state", () => {
  const colorOf = (page: Page, selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((e) => getComputedStyle(e).color);

  test("the logo responds to a pointer", async ({ page }) => {
    await page.goto("");
    const before = await colorOf(page, ".site-header .brand");
    await page.locator(".site-header .brand").hover();
    await expect.poll(() => colorOf(page, ".site-header .brand")).not.toBe(before);
  });

  test("an abstract's control responds to a pointer", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "populated-content", "needs an abstract");
    await page.goto("");
    const summary = page.locator("#program ~ .session summary").first();
    const before = await summary.evaluate((e) => getComputedStyle(e).textDecorationLine);
    await summary.hover();
    expect(await summary.evaluate((e) => getComputedStyle(e).textDecorationLine)).not.toBe(before);
  });

  test("touch does not leave a link looking hovered", async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto("");
    const link = page.locator(".go-top a").first();
    await link.evaluate((a) => {
      a.addEventListener("click", (event) => {
        event.preventDefault();
      });
    });
    const before = await link.evaluate((e) => getComputedStyle(e).color);
    await link.tap();
    await page.waitForTimeout(250);
    expect(await link.evaluate((e) => getComputedStyle(e).color)).toBe(before);
    await context.close();
  });

  test("small lists of links are comfortable to tap", async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto("");
    for (const selector of [".go-top a"]) {
      const box = await page.locator(selector).first().boundingBox();
      expect(box?.height ?? 0, selector).toBeGreaterThanOrEqual(44);
    }
    await context.close();
  });

  test("a section's own link is a full pointer target", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto("");
    const box = await page.locator(".section-anchor").first().boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  });

  test("a focus ring is not cut off at the bottom of the screen", async ({ page }) => {
    await page.goto("");
    const padding = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollPaddingBlockEnd,
    );
    expect(parseFloat(padding)).toBeGreaterThan(0);
  });

  test("the skip link's target has no ring around the whole page", async ({ page }) => {
    await page.goto("");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    await expect(page.locator("main")).toHaveCSS("outline-style", "none");
  });
});

// The organizers asked for a banner as soft and inviting as classic workshop sites. Its art is the
// logo's two directions, so it says what the workshop is about without a word.
test.describe("the home banner", () => {
  test("its two directions drift in once from their own sides", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("");
    const name = (selector: string) =>
      page.locator(selector).evaluate((e) => getComputedStyle(e).animationName);
    expect(await name(".hero-waves--a")).toBe("drift-from-left");
    expect(await name(".hero-waves--b")).toBe("drift-from-right");
    const count = await page
      .locator(".hero-waves--a")
      .evaluate((e) => getComputedStyle(e).animationIterationCount);
    expect(count).toBe("1");
  });

  test("its art is decoration, recoloured by the theme, and left off paper", async ({ page }) => {
    await page.goto("");
    await expect(page.locator(".hero-waves")).toHaveCount(2);
    for (const svg of await page.locator(".hero-waves").all()) {
      await expect(svg).toHaveAttribute("aria-hidden", "true");
    }
    const stop = page.locator(".wave-stop--a-deep").first();
    await page.emulateMedia({ colorScheme: "light" });
    const light = await stop.evaluate((e) => getComputedStyle(e).stopColor);
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await stop.evaluate((e) => getComputedStyle(e).stopColor)).not.toBe(light);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".hero-waves").first()).toBeHidden();
  });

  test("its words stay readable over the art", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("");
      await expect(page.locator(".hero__banner h1")).toBeVisible();
      const veil = await page
        .locator(".hero__banner")
        .evaluate((e) => getComputedStyle(e, "::after").backgroundImage);
      expect(veil, scheme).toContain("radial-gradient");
    }
  });
});
