import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createServer } from "vite";
import type { PreviewServer } from "vite";
import puppeteer from "puppeteer";
import type { Browser, Page } from "puppeteer";
import { autoRetry } from "../utils";

const url = "http://localhost:3000";

describe("basic", async () => {
  let server: PreviewServer;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    server = await createServer({
      preview: { port: 3000 },
      root: process.cwd(),
      mode: "dev",
    });
    server.httpServer.listen(3000);
    // server = await preview({ preview: { port: 3000 }, root: process.cwd() });
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
    server.httpServer.close();
  });

  it("basic render", async () => {
    await page.goto(url);
    expect(await page.content()).toContain("Workers");
    expect(await page.content()).toContain("Loading");
    await autoRetry(async () => {
      expect(await page.content()).toContain("102334155");
    });

    await page.click("#increment");
    expect(await page.content()).toContain("Loading");
    await autoRetry(async () => {
      expect(await page.content()).toContain("165580141");
    });
  });
});
