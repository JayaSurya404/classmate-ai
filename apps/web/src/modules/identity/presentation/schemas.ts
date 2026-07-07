import { z } from "zod";

export const RegisterRequestSchema = z.object({ email: z.string().email().max(320), password: z.string().min(12).max(256), locale: z.string().min(2).max(32), timeZone: z.string().min(1).max(100) }).strict();
export const LoginRequestSchema = z.object({ email: z.string().email().max(320), password: z.string().min(1).max(256) }).strict();
