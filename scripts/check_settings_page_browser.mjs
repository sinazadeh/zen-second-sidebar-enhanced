import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), "..");
const require = createRequire(
  resolve(repositoryRoot, ".agent-tools", "playwright-runtime", "package.json"),
);
const { chromium } = require("playwright");
const settingsPath = "/src/second_sidebar/settings_page/settings.html";
const artifactRoot = resolve(repositoryRoot, ".agent-tools", "playwright");

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

function isWithinRoot(path) {
  const pathFromRoot = relative(repositoryRoot, path);
  return (
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith(
      `..${process.platform === "win32" ? "\\" : "/"}`,
    ) &&
    !isAbsolute(pathFromRoot)
  );
}

function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      const pathname = decodeURIComponent(requestUrl.pathname);
      const filePath = resolve(repositoryRoot, `.${pathname}`);
      if (!isWithinRoot(filePath) || !(await stat(filePath)).isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type":
          contentTypes.get(extname(filePath)) ?? "application/octet-stream",
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  return new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveServer(server));
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function inspectViewport(browser, baseUrl, testCase) {
  const page = await browser.newPage({ viewport: testCase.viewport });
  // Importing the settings model reaches a wrapper with a lazy-use Gecko
  // service. Provide only the inert import-time shape; keep Services undefined
  // so settings.mjs deliberately uses its standalone sample-data path.
  await page.addInitScript(() => {
    globalThis.Ci = { nsIChromeRegistry: {} };
    globalThis.Cc = new Proxy(
      {},
      {
        get: () => ({ getService: () => ({}) }),
      },
    );
  });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.stack}`));

  try {
    await page.goto(`${baseUrl}${settingsPath}`, {
      waitUntil: "networkidle",
    });
    try {
      await page.locator("#sections .card").first().waitFor({ timeout: 5000 });
    } catch {
      throw new Error(
        `${testCase.name}: settings did not render${errors.length > 0 ? `; ${errors.join("; ")}` : ""}`,
      );
    }

    assert(
      (await page.locator("h1").textContent())?.trim() === "Second Sidebar",
      `${testCase.name}: missing page title`,
    );
    assert(
      (await page.locator("#sections .card").count()) > 0,
      `${testCase.name}: settings sections were not rendered`,
    );
    assert(
      (await page.locator(".support-link").count()) === 2,
      `${testCase.name}: support links are incomplete`,
    );
    assert(
      (await page.locator(".startup-cache-note a").getAttribute("href")) ===
        "about:support",
      `${testCase.name}: startup-cache link is incorrect`,
    );

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    assert(
      overflow <= 1,
      `${testCase.name}: horizontal overflow is ${overflow}px`,
    );
    assert(errors.length === 0, `${testCase.name}: ${errors.join("; ")}`);

    await page.screenshot({
      fullPage: true,
      path: resolve(artifactRoot, `settings-${testCase.name}.png`),
    });
    console.log(`Passed ${testCase.name} (${testCase.viewport.width}px wide)`);
  } finally {
    await page.close();
  }
}

export async function main() {
  await mkdir(artifactRoot, { recursive: true });
  const server = await startStaticServer();
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const testCase of [
      { name: "desktop", viewport: { height: 900, width: 1440 } },
      { name: "tablet", viewport: { height: 900, width: 860 } },
      { name: "mobile", viewport: { height: 844, width: 390 } },
    ]) {
      await inspectViewport(browser, baseUrl, testCase);
    }
    console.log(`Screenshots written to ${artifactRoot}`);
  } finally {
    await browser?.close();
    await new Promise((resolveClose, reject) =>
      server.close((error) => (error ? reject(error) : resolveClose())),
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
