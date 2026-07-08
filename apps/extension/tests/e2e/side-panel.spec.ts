import { test, expect, chromium, type BrowserContext } from "@playwright/test";
import { resolve } from "node:path";

let context: BrowserContext;
test.beforeAll(async () => { const extensionPath = resolve(import.meta.dirname, "../../dist"); context = await chromium.launchPersistentContext("", { headless: false, args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`] }); });
test.afterAll(async () => { await context.close(); });
test("extension service worker and side panel artifact load", async () => { let workers = context.serviceWorkers(); if (workers.length === 0) await context.waitForEvent("serviceworker"); workers = context.serviceWorkers(); const worker = workers[0]; expect(worker).toBeDefined(); const extensionId = new URL(worker!.url()).host; const panel = await context.newPage(); await panel.goto(`chrome-extension://${extensionId}/side-panel.html`); await expect(panel.getByRole("heading", { name: "What are you studying?" })).toBeVisible(); await expect(panel.getByRole("heading", { name: "ClassMate AI" })).toBeVisible(); });
