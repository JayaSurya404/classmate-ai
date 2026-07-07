import { z } from "zod";
export const ServerEnvironmentSchema = z.object({ NODE_ENV: z.enum(["development", "test", "production"]), MONGODB_URI: z.string().min(1), JWT_ISSUER: z.string().url(), JWT_AUDIENCE: z.string().min(1), JWT_SECRET: z.string().min(32) });
export function parseServerEnvironment(environment: Record<string, string | undefined>): z.infer<typeof ServerEnvironmentSchema> { return ServerEnvironmentSchema.parse(environment); }
