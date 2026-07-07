import { z } from "zod";

const FeatureFlagsSchema = z.object({ sync: z.boolean(), sharing: z.boolean(), reminders: z.boolean(), serverProviderProxy: z.boolean() });
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;
export function getFeatureFlags(environment: Record<string, string | undefined> = process.env): FeatureFlags { return FeatureFlagsSchema.parse({ sync: environment.FEATURE_SYNC === "true", sharing: environment.FEATURE_SHARING === "true", reminders: environment.FEATURE_REMINDERS === "true", serverProviderProxy: environment.FEATURE_SERVER_PROVIDER_PROXY === "true" }); }
