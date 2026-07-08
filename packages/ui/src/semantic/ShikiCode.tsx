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
import githubLight from "@shikijs/themes/github-light-default";
import { useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeProvider";
import { Button } from "../primitives/Button";

const supportedLanguages = new Set([
  "bash",
  "css",
  "html",
  "javascript",
  "js",
  "json",
  "markdown",
  "md",
  "python",
  "py",
  "typescript",
  "ts",
]);

let highlighterPromise: Promise<HighlighterCore> | undefined;

function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [githubDark, githubLight],
    langs: [bash, css, html, javascript, json, markdown, python, typescript],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighterPromise;
}

export interface ShikiCodeProps {
  code: string;
  language: string;
  showCopy?: boolean | undefined;
}

export function ShikiCode({ code, language, showCopy = true }: ShikiCodeProps) {
  const { resolvedTheme } = useTheme();
  const [htmlValue, setHtmlValue] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const themeName = resolvedTheme === "light" ? "github-light-default" : "github-dark-default";
  const isSupported = supportedLanguages.has(language);

  useEffect(() => {
    if (!isSupported) return undefined;

    let active = true;
    void getHighlighter()
      .then((highlighter) =>
        highlighter.codeToHtml(code, { lang: alias(language), theme: themeName }),
      )
      .then((value) => {
        if (active) setHtmlValue(value);
      })
      .catch(() => {
        if (active) setHtmlValue(undefined);
      });
    return () => {
      active = false;
    };
  }, [code, isSupported, language, themeName]);

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  if (!isSupported || !htmlValue) {
    return (
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg bg-surface-2 p-4">
          <code>{code}</code>
        </pre>
        {showCopy && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute end-2 top-2"
            onClick={() => {
              void copy();
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="overflow-x-auto rounded-lg" dangerouslySetInnerHTML={{ __html: htmlValue }} />
      {showCopy && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute end-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => {
            void copy();
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      )}
    </div>
  );
}

function alias(language: string): string {
  return (
    { js: "javascript", md: "markdown", py: "python", ts: "typescript" } as Readonly<
      Record<string, string>
    >
  )[language] ?? language;
}
