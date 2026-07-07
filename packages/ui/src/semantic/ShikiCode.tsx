import { createHighlighterCore, type HighlighterCore } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import bash from "@shikijs/langs/bash";
import css from "@shikijs/langs/css";
import html from "@shikijs/langs/html";
import javascript from "@shikijs/langs/javascript";
import json from "@shikijs/langs/json";
import markdown from "@shikijs/langs/markdown";
import python from "@shikijs/langs/python";
import typescript from "@shikijs/langs/typescript";
import githubDark from "@shikijs/themes/github-dark-default";
import { useEffect, useState } from "react";

const supportedLanguages = new Set(["bash", "css", "html", "javascript", "js", "json", "markdown", "md", "python", "py", "typescript", "ts"]);
let highlighterPromise: Promise<HighlighterCore> | undefined;
function getHighlighter(): Promise<HighlighterCore> { highlighterPromise ??= createHighlighterCore({ themes: [githubDark], langs: [bash, css, html, javascript, json, markdown, python, typescript], engine: createJavaScriptRegexEngine() }); return highlighterPromise; }
export function ShikiCode({ code, language }: { code: string; language: string }) {
  const [htmlValue, setHtmlValue] = useState<string>();
  useEffect(() => { let active = true; if (!supportedLanguages.has(language)) { setHtmlValue(undefined); return () => { active = false; }; } void getHighlighter().then((highlighter) => highlighter.codeToHtml(code, { lang: alias(language), theme: "github-dark-default" })).then((value) => { if (active) setHtmlValue(value); }).catch(() => { if (active) setHtmlValue(undefined); }); return () => { active = false; }; }, [code, language]);
  if (!htmlValue) return <pre><code>{code}</code></pre>;
  return <div className="overflow-x-auto rounded-lg" dangerouslySetInnerHTML={{ __html: htmlValue }} />;
}
function alias(language: string): string { return ({ js: "javascript", md: "markdown", py: "python", ts: "typescript" } as Readonly<Record<string, string>>)[language] ?? language; }
