import assert from "node:assert/strict";
import { test } from "node:test";

const { buildSelectorScript } =
  await import("../src/second_sidebar/utils/selector_script.mjs");

class FakeElement {
  constructor(nodeName, id = "") {
    this.nodeName = nodeName;
    this.id = id;
    this.parentElement = null;
    this.children = [];
    this.style = {};
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
    return this;
  }

  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    child.parentElement = null;
  }
}

/**
 * Runs a javascript: URL the way Firefox does: percent-decode it, then
 * evaluate it with the page's `document` and `window`.
 *
 * @param {string} url
 * @param {{document: object, window: object}} page
 * @returns {*} the value the URL evaluates to
 */
function runJavascriptURL(url, { document, window }) {
  assert.ok(url.startsWith("javascript:"));
  const code = decodeURIComponent(url.slice("javascript:".length));
  return new Function(
    "document",
    "window",
    `return eval(${JSON.stringify(code)});`,
  )(document, window);
}

function fakePage(querySelector) {
  let scrolledTo = null;
  return {
    document: { querySelector },
    window: { scrollTo: (x, y) => (scrolledTo = [x, y]) },
    get scrolledTo() {
      return scrolledTo;
    },
  };
}

test("passes any selector through to querySelector unchanged", () => {
  const selectors = [
    "#main",
    "a[href='x']",
    'a[title="y"]',
    "');globalThis.injected=1;//",
    '");globalThis.injected=1;//',
    "%22);globalThis.injected=1;//",
    "%27);globalThis.injected=1;//",
    "\\');globalThis.injected=1;//",
    "</script><b>",
    "div.é > span:not(.ü)",
    "line\nbreak",
    "100%",
  ];
  for (const selector of selectors) {
    const seen = [];
    runJavascriptURL(
      buildSelectorScript(selector),
      fakePage((s) => (seen.push(s), null)),
    );
    assert.deepEqual(seen, [selector], selector);
    assert.equal(globalThis.injected, undefined, selector);
  }
});

test("does nothing when the selector matches nothing or is invalid", () => {
  const nothing = fakePage(() => null);
  runJavascriptURL(buildSelectorScript("#missing"), nothing);
  assert.equal(nothing.scrolledTo, null);

  const invalid = fakePage(() => {
    throw new SyntaxError("not a valid selector");
  });
  runJavascriptURL(buildSelectorScript("a["), invalid);
  assert.equal(invalid.scrolledTo, null);
});

test("evaluates to undefined, so the page isn't replaced", () => {
  assert.equal(
    runJavascriptURL(
      buildSelectorScript("#missing"),
      fakePage(() => null),
    ),
    undefined,
  );
});

test("keeps only the selected element and its ancestors", () => {
  const body = new FakeElement("BODY");
  const main = new FakeElement("DIV", "main");
  const target = new FakeElement("SECTION", "target");
  const sibling = new FakeElement("ASIDE", "sibling");
  const header = new FakeElement("HEADER", "header");
  const style = new FakeElement("STYLE");
  body.append(header, main, style);
  main.append(target, sibling);

  const page = fakePage((s) => ({ "#target": target, body })[s] ?? null);
  runJavascriptURL(buildSelectorScript("#target"), page);

  assert.deepEqual(
    body.children.map((c) => c.id || c.nodeName),
    ["main", "STYLE"],
  );
  assert.deepEqual(main.children, [target]);
  assert.equal(target.style.margin, 0);
  assert.equal(main.style.overflow, "visible");
  assert.equal(body.style.overflow, "hidden");
  assert.deepEqual(page.scrolledTo, [0, 0]);
});
