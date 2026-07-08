import type { SourceType } from "@classmate/contracts";
import type { SiteFamily } from "../types";

export interface SiteClassification {
  siteFamily: SiteFamily;
  sourceType: SourceType;
  confidence: "high" | "medium" | "low";
}

export function classifySite(url: string, html: string): SiteClassification {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { siteFamily: "generic", sourceType: "generic", confidence: "low" };
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  if (path.endsWith(".pdf") || parsed.protocol === "file:" && path.endsWith(".pdf")) {
    return { siteFamily: "pdf", sourceType: "pdf", confidence: "high" };
  }

  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    return { siteFamily: "youtube", sourceType: "youtube", confidence: "high" };
  }

  if (host.includes("wikipedia.org")) {
    return { siteFamily: "wikipedia", sourceType: "article", confidence: "high" };
  }

  if (host.includes("developer.mozilla.org") || host === "mdn.dev") {
    return { siteFamily: "mdn", sourceType: "documentation", confidence: "high" };
  }

  if (host.includes("w3schools.com")) {
    return { siteFamily: "w3schools", sourceType: "documentation", confidence: "high" };
  }

  if (host.includes("geeksforgeeks.org")) {
    return { siteFamily: "geeksforgeeks", sourceType: "documentation", confidence: "high" };
  }

  if (host.includes("github.com")) {
    return { siteFamily: "github", sourceType: "repository", confidence: "high" };
  }

  if (host.includes("stackoverflow.com") || host.includes("stackexchange.com")) {
    return { siteFamily: "stackoverflow", sourceType: "documentation", confidence: "high" };
  }

  if (host.includes("medium.com") || html.includes('meta property="og:site_name" content="Medium"')) {
    return { siteFamily: "medium", sourceType: "article", confidence: "high" };
  }

  if (/arxiv\.org|doi\.org|scholar\./.test(host) || html.includes('citation_journal_title')) {
    return { siteFamily: "research_paper", sourceType: "article", confidence: "medium" };
  }

  if (/canvas|moodle|blackboard|brightspace|schoology/.test(host)) {
    return { siteFamily: "lms", sourceType: "lms", confidence: "high" };
  }

  if (
    html.includes('meta name="generator" content="GitBook"') ||
    html.includes('class="docs-') ||
    host.includes("readthedocs.io") ||
    host.includes("docs.")
  ) {
    return { siteFamily: "documentation", sourceType: "documentation", confidence: "medium" };
  }

  if (html.includes("<article") || html.includes('property="article:published_time"')) {
    return { siteFamily: "html_article", sourceType: "article", confidence: "medium" };
  }

  return { siteFamily: "generic", sourceType: "generic", confidence: "low" };
}

export function contentRootSelector(siteFamily: SiteFamily): string {
  switch (siteFamily) {
    case "wikipedia":
      return "#mw-content-text, .mw-parser-output";
    case "mdn":
      return "main, article, .main-page-content, .section";
    case "w3schools":
      return "#main, .w3-main, .w3-container";
    case "geeksforgeeks":
      return "article, .text, .entry-content";
    case "github":
      return "article.markdown-body, .repository-content, [data-testid='readme-content']";
    case "stackoverflow":
      return "#question, .question, .answercell, .s-prose";
    case "medium":
      return "article, main";
    case "research_paper":
      return "article, main, .ltx_document, .paper";
    case "documentation":
      return "main, article, .docs-content, .markdown-body, [role='main']";
    case "html_article":
      return "article, main, [role='main']";
    case "lms":
      return "main, #content, .course-content, [role='main']";
    default:
      return "main, article, [role='main'], .content, #content";
  }
}
