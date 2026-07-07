import { createIdentityService } from "../../../../composition";
import { errorResponse, dataResponse, requestId } from "../../../../../infrastructure/http/responses";
import { RegisterRequestSchema } from "../../../../../modules/identity/presentation/schemas";
import { logger } from "../../../../../infrastructure/observability/logger";

export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> { const id = requestId(request); try { const input = RegisterRequestSchema.safeParse(await request.json()); if (!input.success) return errorResponse("VALIDATION_ERROR", "The registration details are invalid.", 400, id); const result = await createIdentityService().register(input.data); if (!result.ok) return dataResponse({ accepted: true }, 202, id); return dataResponse({ accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken, expiresInSeconds: result.tokens.accessExpiresInSeconds }, 201, id); } catch { logger.write({ level: "error", event: "identity.register.failed", requestId: id, errorCode: "INTERNAL_ERROR" }); return errorResponse("INTERNAL_ERROR", "Registration could not be completed.", 500, id, true); } }
