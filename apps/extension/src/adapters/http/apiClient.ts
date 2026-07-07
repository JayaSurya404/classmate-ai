import { z } from "zod";

const ErrorEnvelopeSchema = z.object({ error: z.object({ code: z.string(), message: z.string(), requestId: z.string(), retryable: z.boolean(), retryAfterSeconds: z.number().optional() }) });
export class ApiClientError extends Error { constructor(readonly code: string, message: string, readonly requestId: string, readonly isRetryable: boolean) { super(message); this.name = "ApiClientError"; } }
export class ApiClient {
  constructor(private readonly baseUrl: string, private readonly getAccessToken: () => Promise<string | undefined>) {}
  async request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> { const token = await this.getAccessToken(); const requestId = crypto.randomUUID(); const response = await fetch(new URL(path, this.baseUrl), { ...options, headers: { "Content-Type": "application/json", "X-Request-Id": requestId, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } }); const body: unknown = await response.json(); if (!response.ok) { const parsed = ErrorEnvelopeSchema.safeParse(body); if (parsed.success) throw new ApiClientError(parsed.data.error.code, parsed.data.error.message, parsed.data.error.requestId, parsed.data.error.retryable); throw new ApiClientError("INVALID_RESPONSE", "The server returned an invalid response.", requestId, response.status >= 500); } return schema.parse(body); }
}
