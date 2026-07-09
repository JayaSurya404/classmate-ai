export interface SafeExtensionLog {
  level: "info" | "warn" | "error";
  event: string;
  operationId?: string | undefined;
  errorCode?: string | undefined;
  durationMs?: number | undefined;
  component?: string | undefined;
  metadata?: Readonly<Record<string, string | number | boolean>> | undefined;
}

export interface PerformanceMetric {
  name: string;
  durationMs: number;
  success: boolean;
  component?: string | undefined;
}

const SECRET_PATTERNS = [/api[_-]?key/i, /authorization/i, /bearer/i, /token/i, /password/i, /secret/i];

export function writeSafeLog(log: SafeExtensionLog): void {
  const record = {
    timestamp: new Date().toISOString(),
    context: "extension",
    level: log.level,
    event: safeText(log.event),
    ...(log.operationId ? { operationId: log.operationId } : {}),
    ...(log.errorCode ? { errorCode: safeText(log.errorCode) } : {}),
    ...(log.durationMs !== undefined ? { durationMs: Math.max(0, Math.round(log.durationMs)) } : {}),
    ...(log.component ? { component: safeText(log.component) } : {}),
    ...(log.metadata ? { metadata: sanitizeMetadata(log.metadata) } : {}),
  };
  if (log.level === "error") console.error(record);
  else if (log.level === "warn") console.warn(record);
  else console.info(record);
}

export function measurePerformance<T>(
  name: string,
  operation: () => T,
  component?: string,
): T {
  const startedAt = performance.now();
  try {
    const result = operation();
    writePerformanceMetric({ name, component, success: true, durationMs: performance.now() - startedAt });
    return result;
  } catch (error) {
    writePerformanceMetric({ name, component, success: false, durationMs: performance.now() - startedAt });
    throw error;
  }
}

export function writePerformanceMetric(metric: PerformanceMetric): void {
  writeSafeLog({
    level: metric.success ? "info" : "warn",
    event: "performance.metric",
    component: metric.component,
    durationMs: metric.durationMs,
    metadata: { name: metric.name, success: metric.success },
  });
}

export function healthSnapshot(): Readonly<Record<string, string | number | boolean>> {
  return {
    online: navigator.onLine,
    language: navigator.language,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: "deviceMemory" in navigator ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0) : 0,
  };
}

function sanitizeMetadata(metadata: Readonly<Record<string, string | number | boolean>>): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      safeText(key),
      SECRET_PATTERNS.some((pattern) => pattern.test(key)) ? "[redacted]" : typeof value === "string" ? safeText(value) : value,
    ]),
  );
}

function safeText(value: string): string {
  return value.replace(/https?:\/\/\S+/g, "[url]").replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]").slice(0, 500);
}
