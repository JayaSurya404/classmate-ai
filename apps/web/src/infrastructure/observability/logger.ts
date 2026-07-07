export type LogLevel = "info" | "warn" | "error";
export interface SafeLogEvent { level: LogLevel; event: string; requestId?: string; operationId?: string; durationMs?: number; status?: number; errorCode?: string; }
export interface Logger { write(event: SafeLogEvent): void; }
class JsonConsoleLogger implements Logger {
  write(event: SafeLogEvent): void { const record = JSON.stringify({ timestamp: new Date().toISOString(), service: "classmate-web", ...event }); if (event.level === "error") console.error(record); else if (event.level === "warn") console.warn(record); else console.info(record); }
}
export const logger: Logger = new JsonConsoleLogger();
