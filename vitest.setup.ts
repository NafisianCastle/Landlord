import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { vi } from "vitest";
import { createTranslator } from "use-intl/core";
import messages from "./messages/en.json";

// jsdom omits pointer capture and scrolling used by accessible popup controls.
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {};
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};
}
if (typeof HTMLElement !== "undefined" && !HTMLElement.prototype.scrollIntoView)
  HTMLElement.prototype.scrollIntoView = () => {};

// Vitest/jsdom doesn't understand the "react-server" package.json export
// condition, so `next-intl/server`'s getTranslations would otherwise resolve
// to the client build and throw. Server actions/components only need plain
// string translation in tests, so swap in a synchronous translator backed by
// the same English messages used everywhere else in tests.
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) =>
    createTranslator({ locale: "en", messages, namespace: namespace as never }),
  getLocale: async () => "en",
}));
