// Lets a browser window take a modifier-click on a link in one of its tabs
// before Firefox opens the link (see ContentClickPatcher).
//
// Clicks on links reach the parent process as ClickHandlerParent's
// "Content:Click" message, which contentAreaClick() handles: it opens
// Shift+clicked links in a new window and Ctrl+clicked ones in a new tab
// (the page itself only follows clicks without modifiers). Its content click
// listeners only hear about a click afterwards, so this replaces
// contentAreaClick instead.
//
// ClickHandlerParent is shared by every window, so this module is imported
// with ChromeUtils.importESModule, into the shared system global, not into a
// window like the rest of this addon. A replacement function created in a
// window's own scope would become a dead object when that window closed, and
// every link click in the other windows would then throw.

const MODULE_URLS = ["resource:///actors/ClickHandlerParent.sys.mjs"];

// Where the handlers live, on the replacement itself: if two copies of this
// module load (the addon installed through two loaders, which serve it from
// different URLs), the second one finds and shares the first one's handlers
// instead of wrapping contentAreaClick twice.
const HANDLERS = Symbol.for("second-sidebar.contentClickHandlers");

/**
 * @returns {object | null} ClickHandlerParent's prototype
 */
function getClickHandlerParentPrototype() {
  for (const url of MODULE_URLS) {
    try {
      return ChromeUtils.importESModule(url).ClickHandlerParent.prototype;
    } catch {
      // Not at this URL in this version.
    }
  }
  return null;
}

/**
 * @returns {Map<object, function(object):boolean> | null} the handlers by
 *   window, or null if contentAreaClick can't be found in this version
 */
function install() {
  const prototype = getClickHandlerParentPrototype();
  if (typeof prototype?.contentAreaClick !== "function") {
    return null;
  }
  if (prototype.contentAreaClick[HANDLERS]) {
    return prototype.contentAreaClick[HANDLERS];
  }

  const handlers = new Map();
  const original = prototype.contentAreaClick;
  const contentAreaClick = function (data) {
    if (runHandler(handlers, this, data)) {
      return undefined;
    }
    return original.call(this, data);
  };
  contentAreaClick[HANDLERS] = handlers;
  prototype.contentAreaClick = contentAreaClick;
  return handlers;
}

/**
 * @param {Map<object, function(object):boolean>} handlers
 * @param {object} actor the ClickHandlerParent the click came to
 * @param {object} data the click
 * @returns {boolean} whether the window of the clicked tab took the click
 */
function runHandler(handlers, actor, data) {
  try {
    const browser = actor.manager.browsingContext.top.embedderElement;
    // defaultView, the window's WindowProxy, is what the window registered
    // as `window`; ownerGlobal would be the inner window, a different object.
    const handler = browser && handlers.get(browser.ownerDocument.defaultView);
    return handler ? handler(data) === true : false;
  } catch (error) {
    // Let Firefox handle the click as usual.
    console.error("Second Sidebar: failed to handle a link click", error);
    return false;
  }
}

/**
 * Calls `handler` with every click on a link in `window`'s tabs, before
 * Firefox acts on it. When it returns true, Firefox leaves the click alone.
 *
 * @param {object} window a browser window
 * @param {function(object):boolean} handler gets the click: its `button`,
 *   modifier keys, `href` and `originAttributes`
 * @returns {boolean} false if this browser version can't be hooked
 */
export function addContentClickHandler(window, handler) {
  const handlers = install();
  if (!handlers) {
    return false;
  }
  handlers.set(window, handler);
  return true;
}

/**
 * @param {object} window
 */
export function removeContentClickHandler(window) {
  install()?.delete(window);
}
