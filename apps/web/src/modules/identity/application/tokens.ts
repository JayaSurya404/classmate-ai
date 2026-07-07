import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getEnvironment } from "../../../infrastructure/config/environment";

export interface TokenPair { accessToken: string; refreshToken: string; sessionId: string; accessExpiresInSeconds: number; refreshExpiresAt: Date; }
function secret(): Uint8Array { return new TextEncoder().encode(getEnvironment().JWT_SECRET); }
export async function createTokenPair(userId: string, scopes: readonly string[]): Promise<TokenPair> { const sessionId = crypto.randomUUID(); const refreshSecret = randomBytes(32).toString("base64url"); const accessExpiresInSeconds = 15 * 60; const accessToken = await new SignJWT({ scopes, sessionId }).setProtectedHeader({ alg: "HS256" }).setIssuer(getEnvironment().JWT_ISSUER).setAudience(getEnvironment().JWT_AUDIENCE).setSubject(userId).setIssuedAt().setExpirationTime(`${accessExpiresInSeconds}s`).sign(secret()); const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); return { accessToken, refreshToken: `${sessionId}.${refreshSecret}`, sessionId, accessExpiresInSeconds, refreshExpiresAt }; }
export function hashRefreshToken(token: string): string { return createHash("sha256").update(token).digest("base64url"); }
export async function verifyAccessToken(token: string): Promise<JWTPayload> { const result = await jwtVerify(token, secret(), { algorithms: ["HS256"], issuer: getEnvironment().JWT_ISSUER, audience: getEnvironment().JWT_AUDIENCE }); return result.payload; }
