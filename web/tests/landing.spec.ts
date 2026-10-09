import { expect, test } from "@playwright/test";

const repoURL = "https://github.com/prathamsnehi/cyberdefense-hack-26";
const sectionIDs = ["top", "threat", "loop", "how", "demo", "compare", "team", "closing"];

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).origin === new URL(page.url()).origin) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    errors.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Albert AI/);
  await page.evaluate(() => document.fonts.ready);
  // Check errors after interactions too, not just on initial load.
  (page as typeof page & { landingErrors: string[] }).landingErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as typeof page & { landingErrors: string[] }).landingErrors).toEqual([]);
});

test("all sections render without horizontal overflow", async ({ page }, testInfo) => {
  for (const id of sectionIDs) {
    const section = page.locator(`section#${id}`);
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole("heading").first()).toBeVisible();
    for (const reveal of await section.locator(".reveal").all()) {
      await reveal.scrollIntoViewIfNeeded();
      await expect(reveal).toHaveClass(/is-visible/);
      await expect(reveal).toHaveCSS("opacity", "1");
    }
  }
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath(`${testInfo.project.name}-full.png`),
    fullPage: true,
    scale: "css",
    animations: "disabled",
  });
});

test("navigation links scroll to the requested sections", async ({ page }, testInfo) => {
  if (testInfo.project.name === "desktop") {
    for (const id of ["loop", "how", "demo", "team"]) {
      await page.getByRole("navigation", { name: "Primary" }).locator(`a[href="#${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect.poll(() => page.locator(`section#${id}`).evaluate((element) =>
        Math.abs(element.getBoundingClientRect().top),
      )).toBeLessThan(100);
    }
  } else {
    await page.getByRole("link", { name: "See the loop" }).click();
    await expect(page).toHaveURL(/#loop$/);
    await expect.poll(() => page.locator("section#loop").evaluate((element) =>
      Math.abs(element.getBoundingClientRect().top),
    )).toBeLessThan(100);
    await page.getByRole("link", { name: "Watch the demo" }).click();
    await expect(page).toHaveURL(/#demo$/);
    await expect.poll(() => page.locator("section#demo").evaluate((element) =>
      Math.abs(element.getBoundingClientRect().top),
    )).toBeLessThan(100);
  }
});

test("demo tabs support click, arrow keys, Home, End and wrapping", async ({ page }) => {
  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await tabs.nth(i).click();
    await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true");
    const panel = page.getByRole("tabpanel");
    await expect(panel).toHaveCount(1);
    await expect(panel).toHaveAttribute("aria-labelledby", `demo-tab-${i}`);
  }
  await tabs.nth(3).focus();
  for (const [key, index] of [
    ["ArrowRight", 0], ["ArrowLeft", 3], ["Home", 0], ["End", 3],
    ["ArrowDown", 0], ["ArrowUp", 3],
  ] as const) {
    await page.keyboard.press(key);
    await expect(tabs.nth(index)).toBeFocused();
    await expect(tabs.nth(index)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", `demo-tab-${index}`);
  }
});

test("GitHub links open the repository in a new tab", async ({ page }) => {
  const links = page.locator('a[target="_blank"]');
  expect(await links.count()).toBeGreaterThan(0);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("href", repoURL);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
  }
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "View on GitHub" }).first().click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(repoURL);
  await popup.close();
});

test("reduced motion shows content immediately and stops cycling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reveals = page.locator(".reveal");
  await expect.poll(() => reveals.evaluateAll((nodes) => nodes.every((node) => {
    const style = getComputedStyle(node);
    return node.classList.contains("is-visible") && style.opacity === "1" &&
      (style.transform === "none" || style.transform === "matrix(1, 0, 0, 1, 0, 0)");
  }))).toBe(true);
  const heroLoop = page.getByRole("list", { name: "The Albert AI loop", exact: true });
  await heroLoop.scrollIntoViewIfNeeded();
  await expect(heroLoop).toBeVisible();
  const initialHero = await heroLoop.innerHTML();
  await page.waitForTimeout(2100); // Longer than the hero's 1600ms cycle.
  expect(await heroLoop.innerHTML()).toBe(initialHero);

  const loop = page.locator(".loop-motion");
  await loop.scrollIntoViewIfNeeded();
  await expect(loop).toHaveClass(/is-entered/);
  await expect(loop).not.toHaveClass(/is-running/);
  const initialLoop = await loop.innerHTML();
  await page.waitForTimeout(3600); // Covers the loop intro and a normal step.
  expect(await loop.innerHTML()).toBe(initialLoop);
  await expect(loop).not.toHaveClass(/is-running/);
  const animations = await page.evaluate(() => document.getAnimations().filter((animation) =>
    animation.playState === "running",
  ).length);
  expect(animations).toBe(0);
});
