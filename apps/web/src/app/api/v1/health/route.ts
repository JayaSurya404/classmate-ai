import { dataResponse } from "../../../../infrastructure/http/responses";
import { mongoReadiness } from "../../../../infrastructure/database/mongodb";

export const runtime = "nodejs";
export async function GET(): Promise<Response> { return dataResponse({ status: "ok", database: mongoReadiness(), version: "1.0.0", timestamp: new Date().toISOString() }); }
