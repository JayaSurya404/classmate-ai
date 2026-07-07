export interface UserAccount { id: string; emailNormalized: string; passwordHash: string; roles: readonly string[]; locale: string; timeZone: string; accountState: "active" | "locked" | "deletion-pending"; revision: number; createdAt: Date; updatedAt: Date; }
export interface UserRepository { findByEmail(emailNormalized: string): Promise<UserAccount | undefined>; create(user: Omit<UserAccount, "createdAt" | "updatedAt">): Promise<UserAccount>; }
export interface SessionRecord { id: string; userId: string; tokenHash: string; expiresAt: Date; revokedAt?: Date; }
export interface SessionRepository { create(session: SessionRecord): Promise<void>; findActive(id: string): Promise<SessionRecord | undefined>; revoke(id: string): Promise<void>; }
