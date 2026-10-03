import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatReloadCountdown,
  parseNotifications,
} from "../src/second_sidebar/utils/string.mjs";

test("parseNotifications reads the unread count sites put in titles", () => {
  assert.equal(parseNotifications("(3) Inbox - Gmail"), 3);
  assert.equal(parseNotifications("Inbox (12) - me@example.com - Gmail"), 12);
  assert.equal(parseNotifications("[5] Feed"), 5);
  assert.equal(parseNotifications("  (7) Messenger"), 7);
  assert.equal(parseNotifications("Inbox (1,234) - Gmail"), 1234);
  // "More than 99" is at least 100, which the badge shows as 99+.
  assert.equal(parseNotifications("(99+) Discord"), 100);
});

test("parseNotifications ignores numbers that aren't a count", () => {
  for (const title of [
    "Top 10 movies of 2024 - IMDb",
    "Chapter 12 - Book",
    "2 new messages",
    "WhatsApp",
    "Inception (2010) - IMDb",
    "Item(3)",
    "(3)rd place",
    "",
  ]) {
    assert.equal(parseNotifications(title), null, title);
  }
  assert.equal(parseNotifications(undefined), null);
  assert.equal(parseNotifications(null), null);
});

test("parseNotifications counts a year-like number at the start", () => {
  assert.equal(parseNotifications("(2010) Discord"), 2010);
  // A year later on doesn't hide the count before it, or after it.
  assert.equal(parseNotifications("(4) Inception (2010)"), 4);
  assert.equal(parseNotifications("Inception (2010) (4)"), 4);
});

test("formatReloadCountdown shows minutes and seconds, rounded up", () => {
  assert.equal(formatReloadCountdown(0), "0:00");
  assert.equal(formatReloadCountdown(1), "0:01");
  assert.equal(formatReloadCountdown(61000), "1:01");
  assert.equal(formatReloadCountdown(-5), "0:00");
  assert.equal(formatReloadCountdown(Number.NaN), "0:00");
});
