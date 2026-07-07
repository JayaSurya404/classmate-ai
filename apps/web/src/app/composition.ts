import { IdentityService } from "../modules/identity/application/IdentityService";
import { MongoSessionRepository, MongoUserRepository } from "../modules/identity/infrastructure/MongoIdentityRepositories";

export function createIdentityService(): IdentityService { return new IdentityService(new MongoUserRepository(), new MongoSessionRepository()); }
