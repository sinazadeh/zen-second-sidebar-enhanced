/**
 * Runs in a web panel's page: keeps only the element matching `selector`
 * (and the ancestors holding it), stretched to fill the panel. Serialized
 * into the page by buildSelectorScript, so it can't use anything from this
 * module.
 *
 * @param {string} selector
 */
function isolateSelectedElement(selector) {
  let element;
  try {
    element = document.querySelector(selector);
  } catch {
    // Not a valid selector.
    return;
  }
  if (!element) {
    return;
  }

  const toDelete = [];
  element.style.margin = 0;
  while (element.nodeName !== "BODY" && element.parentElement) {
    for (const child of element.parentElement.children) {
      if (!["STYLE", "SCRIPT"].includes(child.nodeName) && child !== element) {
        toDelete.push({ parent: element.parentElement, child });
      }
    }
    element.style.overflow = "visible";
    element.style.minWidth = "0px";
    element.style.minHeight = "0px";
    element.style.gridGap = "0px";
    element = element.parentElement;
    element.style.padding = 0;
    element.style.margin = 0;
    element.style.transform = "none";
  }
  for (const { parent, child } of toDelete) {
    parent.removeChild(child);
  }

  const body = document.querySelector("body");
  if (body) {
    body.style.overflow = "hidden";
    body.style.minWidth = "0px";
    body.style.minHeight = "0px";
  }
  window.scrollTo(0, 0);
}

/**
 * The javascript: URL that trims a web panel's page down to the element
 * matching `selector`. The selector comes from settings (typed, or from an
 * imported file), so it's passed as a JSON string literal rather than pasted
 * into the code, and the whole script is percent-encoded: javascript: URLs
 * are percent-decoded before they run, so a `%22` in the selector would
 * otherwise turn back into a quote that ends the string.
 *
 * @param {string} selector
 * @returns {string}
 */
export function buildSelectorScript(selector) {
  // `void` so the URL evaluates to undefined and doesn't replace the page.
  const code = `void (${isolateSelectedElement})(${JSON.stringify(selector)});`;
  return `javascript:${encodeURIComponent(code)}`;
}
