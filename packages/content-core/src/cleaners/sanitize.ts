const BOILERPLATE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "nav",
  "aside",
  "footer",
  "header.site-header",
  ".navbar",
  ".nav",
  ".sidebar",
  ".advertisement",
  ".ad",
  ".cookie-banner",
  ".newsletter",
  "form",
  "input",
  "textarea",
  "select",
  "button",
  "[hidden]",
  "[aria-hidden='true']",
  "[contenteditable='true']",
] as const;

const SECRET_PATTERNS: readonly RegExp[] = [
  /\b(sk-[a-zA-Z0-9]{20,})\b/g,
  /\b(AIza[0-9A-Za-z\-_]{35})\b/g,
  /\b(ghp_[a-zA-Z0-9]{36,})\b/g,
  /\b(xox[baprs]-[0-9A-Za-z-]{10,})\b/g,
];

export function removeBoilerplate(root: ParentNode): void {
  for (const selector of BOILERPLATE_SELECTORS) {
    root.querySelectorAll(selector).forEach((node) => {
      node.remove();
    });
  }
}

export function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

export function normalizeVisibleText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function collapseWhitespace(value: string): string {
  return normalizeVisibleText(value.replace(/\s+/g, " "));
}
