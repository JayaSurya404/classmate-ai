import { NextResponse } from "next/server";

export function requestId(request: Request): string { return request.headers.get("x-request-id") ?? crypto.randomUUID(); }
export function dataResponse<T>(data: T, status = 200, id?: string): NextResponse { return NextResponse.json({ data, meta: { requestId: id ?? crypto.randomUUID() } }, { status, headers: { "Cache-Control": "no-store", "X-Request-Id": id ?? "" } }); }
export function errorResponse(code: string, message: string, status: number, id: string, retryable = false): NextResponse { return NextResponse.json({ error: { code, message, requestId: id, retryable } }, { status, headers: { "Cache-Control": "no-store", "X-Request-Id": id } }); }
