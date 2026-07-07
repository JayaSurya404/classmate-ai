import type {
  SessionRecord,
  SessionRepository,
  UserAccount,
  UserRepository
} from "../domain/identity";

import { connectMongo } from "../../../infrastructure/database/mongodb";
import { getSessionModel, getUserModel } from "./models";

export class MongoUserRepository implements UserRepository {
  async findByEmail(
    emailNormalized: string
  ): Promise<UserAccount | undefined> {
    await connectMongo();

    const value = await getUserModel()
      .findOne({ emailNormalized })
      .select("+passwordHash")
      .lean()
      .exec();

    return value ? mapUser(value) : undefined;
  }

  async create(
    user: Omit<UserAccount, "createdAt" | "updatedAt">
  ): Promise<UserAccount> {
    await connectMongo();

    const created = await getUserModel().create({
      ...user,
      roles: [...user.roles]
    });

    return mapUser(created.toObject());
  }
}

export class MongoSessionRepository implements SessionRepository {
  async create(session: SessionRecord): Promise<void> {
    await connectMongo();

    await getSessionModel().create(session);
  }

  async findActive(id: string): Promise<SessionRecord | undefined> {
    await connectMongo();

    const value = await getSessionModel()
      .findOne({
        id,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() }
      })
      .lean()
      .exec();

    if (!value) {
      return undefined;
    }

    return {
      id: value.id,
      userId: value.userId,
      tokenHash: value.tokenHash,
      expiresAt: value.expiresAt,
      ...(value.revokedAt ? { revokedAt: value.revokedAt } : {})
    };
  }

  async revoke(id: string): Promise<void> {
    await connectMongo();

    await getSessionModel()
      .updateOne(
        { id },
        {
          $set: {
            revokedAt: new Date()
          }
        }
      )
      .exec();
  }
}

function mapUser(value: {
  id: string;
  emailNormalized: string;
  passwordHash: string;
  roles: readonly string[];
  locale: string;
  timeZone: string;
  accountState: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}): UserAccount {
  if (
    value.accountState !== "active" &&
    value.accountState !== "locked" &&
    value.accountState !== "deletion-pending"
  ) {
    throw new Error("Invalid account state in persistence");
  }

  return {
    ...value,
    roles: [...value.roles],
    accountState: value.accountState
  };
}