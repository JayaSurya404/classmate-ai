import { lazy, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const HighlightedCode = lazy(() => import("./ShikiCode").then((module) => ({ default: module.ShikiCode })));
export function MarkdownRenderer({ markdown }: { markdown: string }) {
  return <article className="prose prose-invert max-w-none text-[15px] leading-7"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={{ a: ({ children, href }) => <a href={safeHref(href)} target="_blank" rel="noopener noreferrer">{children}</a>, code: ({ children, className }) => { const language = /language-([\w-]+)/.exec(className ?? "")?.[1]; const value = String(children).replace(/\n$/, ""); return language ? <Suspense fallback={<pre><code>{value}</code></pre>}><HighlightedCode code={value} language={language} /></Suspense> : <code>{children}</code>; } }}>{markdown}</ReactMarkdown></article>;
}
function safeHref(href: string | undefined): string { if (!href) return "#"; try { const url = new URL(href); return url.protocol === "https:" || url.protocol === "http:" ? url.href : "#"; } catch { return "#"; } }
