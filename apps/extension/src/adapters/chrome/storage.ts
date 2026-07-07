import { ProviderIdSchema, SettingsSchema, type ProviderId, type Settings } from "@classmate/contracts";
import { z } from "zod";

const defaultSettings: Settings = { schemaVersion: 1, theme: "dark", locale: "en", defaultProvider: "gemini", explanationDepth: "standard", telemetryConsent: false };
const CredentialSchema = z.object({ providerId: ProviderIdSchema, apiKey: z.string().min(1).max(1000).optional(), baseUrl: z.string().url().optional() });
export type DeviceCredential = z.infer<typeof CredentialSchema>;

export class ChromeSettingsRepository {
  async get(): Promise<Settings> { const stored = await chrome.storage.local.get("settings"); const parsed = SettingsSchema.safeParse(stored.settings); return parsed.success ? parsed.data : defaultSettings; }
  async save(settings: Settings): Promise<void> { await chrome.storage.local.set({ settings: SettingsSchema.parse(settings) }); }
  subscribe(listener: (settings: Settings) => void): () => void { const handle = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => { if (area !== "local" || !changes.settings?.newValue) return; const parsed = SettingsSchema.safeParse(changes.settings.newValue); if (parsed.success) listener(parsed.data); }; chrome.storage.onChanged.addListener(handle); return () => chrome.storage.onChanged.removeListener(handle); }
}
export class ChromeCredentialVault {
  private key(providerId: ProviderId): string { return `credential:${providerId}`; }
  async get(providerId: ProviderId): Promise<DeviceCredential | undefined> { const stored = await chrome.storage.local.get(this.key(providerId)); const parsed = CredentialSchema.safeParse(stored[this.key(providerId)]); return parsed.success ? parsed.data : undefined; }
  async save(credential: DeviceCredential): Promise<void> { const validated = CredentialSchema.parse(credential); await chrome.storage.local.set({ [this.key(validated.providerId)]: validated }); }
  async remove(providerId: ProviderId): Promise<void> { await chrome.storage.local.remove(this.key(providerId)); }
}
export const settingsRepository = new ChromeSettingsRepository();
export const credentialVault = new ChromeCredentialVault();
