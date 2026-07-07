import { parseServerEnvironment } from "@classmate/config";

export type ServerEnvironment = ReturnType<typeof parseServerEnvironment>;
let cached: ServerEnvironment | undefined;
export function getEnvironment(): ServerEnvironment { cached ??= parseServerEnvironment({ NODE_ENV: process.env.NODE_ENV, MONGODB_URI: process.env.MONGODB_URI, JWT_ISSUER: process.env.JWT_ISSUER, JWT_AUDIENCE: process.env.JWT_AUDIENCE, JWT_SECRET: process.env.JWT_SECRET }); return cached; }
