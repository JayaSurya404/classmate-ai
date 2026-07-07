import { z } from "zod";

const FlagsSchema = z.object({ sync: z.boolean(), sharing: z.boolean(), reminders: z.boolean(), serverProviderProxy: z.boolean() });
export type FeatureFlags = z.infer<typeof FlagsSchema>;
const defaults: FeatureFlags = { sync: false, sharing: false, reminders: false, serverProviderProxy: false };
export async function loadFeatureFlags(): Promise<FeatureFlags> { const stored = await chrome.storage.local.get("featureFlags"); const parsed = FlagsSchema.safeParse(stored.featureFlags); return parsed.success ? parsed.data : defaults; }
