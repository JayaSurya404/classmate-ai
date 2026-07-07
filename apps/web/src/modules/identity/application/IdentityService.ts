import type { SessionRepository, UserRepository } from "../domain/identity";
import { createTokenPair, hashRefreshToken, type TokenPair } from "./tokens";
import { hashPassword, verifyPassword } from "./passwords";

export type IdentityResult = { ok: true; tokens: TokenPair } | { ok: false; code: "INVALID_CREDENTIALS" | "ACCOUNT_UNAVAILABLE" };
export class IdentityService {
  constructor(private readonly users: UserRepository, private readonly sessions: SessionRepository) {}
  async register(input: { email: string; password: string; locale: string; timeZone: string }): Promise<IdentityResult> { const emailNormalized = input.email.trim().toLocaleLowerCase("en-US"); if (await this.users.findByEmail(emailNormalized)) return { ok: false, code: "ACCOUNT_UNAVAILABLE" }; const user = await this.users.create({ id: crypto.randomUUID(), emailNormalized, passwordHash: await hashPassword(input.password), roles: ["student"], locale: input.locale, timeZone: input.timeZone, accountState: "active", revision: 1 }); return { ok: true, tokens: await this.createSession(user.id) }; }
  async login(input: { email: string; password: string }): Promise<IdentityResult> { const user = await this.users.findByEmail(input.email.trim().toLocaleLowerCase("en-US")); if (!user || user.accountState !== "active" || !(await verifyPassword(input.password, user.passwordHash))) return { ok: false, code: "INVALID_CREDENTIALS" }; return { ok: true, tokens: await this.createSession(user.id) }; }
  private async createSession(userId: string): Promise<TokenPair> { const tokens = await createTokenPair(userId, ["profile:read", "profile:write", "library:read", "library:write", "generation:create", "practice:read", "practice:write", "offline_access"]); await this.sessions.create({ id: tokens.sessionId, userId, tokenHash: hashRefreshToken(tokens.refreshToken), expiresAt: tokens.refreshExpiresAt }); return tokens; }
}
