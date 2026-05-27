import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

window.scrollTo = vi.fn() as typeof window.scrollTo;
