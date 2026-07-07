import { createIdentityService } from "../../../../composition";
import { errorResponse, dataResponse, requestId } from "../../../../../infrastructure/http/responses";
import { LoginRequestSchema } from "../../../../../modules/identity/presentation/schemas";
import { logger } from "../../../../../infrastructure/observability/logger";

export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> { const id = requestId(request); try { const input = LoginRequestSchema.safeParse(await request.json()); if (!input.success) return errorResponse("VALIDATION_ERROR", "The login details are invalid.", 400, id); const result = await createIdentityService().login(input.data); if (!result.ok) return errorResponse("UNAUTHENTICATED", "Email or password is incorrect.", 401, id); return dataResponse({ accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken, expiresInSeconds: result.tokens.accessExpiresInSeconds }, 200, id); } catch { logger.write({ level: "error", event: "identity.login.failed", requestId: id, errorCode: "INTERNAL_ERROR" }); return errorResponse("INTERNAL_ERROR", "Login could not be completed.", 500, id, true); } }
