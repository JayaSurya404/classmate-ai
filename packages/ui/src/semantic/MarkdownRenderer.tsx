import { lazy, Suspense, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const HighlightedCode = lazy(() =>
  import("./ShikiCode").then((module) => ({ default: module.ShikiCode })),
);

export interface MarkdownRendererProps {
  markdown: string;
  className?: string | undefined;
}

export function MarkdownRenderer({ markdown, className }: MarkdownRendererProps) {
  return (
    <article className={className ?? "ui-prose max-w-none"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ children, href }) => (
            <a href={safeHref(href)} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          code: ({ children, className: codeClassName }) => {
            const language = /language-([\w-]+)/.exec(codeClassName ?? "")?.[1];
            const value = extractCodeText(children);
            if (language) {
              return (
                <Suspense fallback={<pre><code>{value}</code></pre>}>
                  <HighlightedCode code={value} language={language} />
                </Suspense>
              );
            }
            return <code>{children}</code>;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}

function safeHref(href: string | undefined): string {
  if (!href) return "#";
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "#";
  } catch {
    return "#";
  }
}

function extractCodeText(children: ReactNode): string {
  if (typeof children === "string") return children.replace(/\n$/, "");
  if (Array.isArray(children)) {
    return children
      .map((child) => (typeof child === "string" ? child : ""))
      .join("")
      .replace(/\n$/, "");
  }
  return "";
}
