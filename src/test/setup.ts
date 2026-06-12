import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "../lib/i18n";

afterEach(() => cleanup());

window.scrollTo = vi.fn() as typeof window.scrollTo;
