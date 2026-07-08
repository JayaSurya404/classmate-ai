import { describe, expect, it } from "vitest";
import { classifySite } from "../classifiers/siteClassifier";
import {
  GENERIC_ARTICLE_HTML,
  GEEKSFORGEEKS_HTML,
  GITHUB_README_HTML,
  MDN_HTML,
  MEDIUM_HTML,
  RESEARCH_PAPER_HTML,
  STACKOVERFLOW_HTML,
  W3SCHOOLS_HTML,
  WIKIPIA_HTML,
  DOCUMENTATION_HTML,
} from "../testing/fixtures";

describe("siteClassifier", () => {
  it("classifies Wikipedia", () => {
    const result = classifySite("https://en.wikipedia.org/wiki/OS", WIKIPIA_HTML);
    expect(result.siteFamily).toBe("wikipedia");
    expect(result.sourceType).toBe("article");
  });

  it("classifies MDN", () => {
    const result = classifySite("https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array", MDN_HTML);
    expect(result.siteFamily).toBe("mdn");
    expect(result.sourceType).toBe("documentation");
  });

  it("classifies GitHub", () => {
    const result = classifySite("https://github.com/example/classmate-ai", GITHUB_README_HTML);
    expect(result.siteFamily).toBe("github");
    expect(result.sourceType).toBe("repository");
  });

  it("classifies Stack Overflow", () => {
    const result = classifySite("https://stackoverflow.com/questions/123/example", STACKOVERFLOW_HTML);
    expect(result.siteFamily).toBe("stackoverflow");
  });

  it("classifies generic articles", () => {
    const result = classifySite("https://example.org/notes", GENERIC_ARTICLE_HTML);
    expect(result.siteFamily).toBe("html_article");
  });

  it("classifies PDF URLs", () => {
    const result = classifySite("https://example.org/paper.pdf", "");
    expect(result.siteFamily).toBe("pdf");
  });

  it("classifies YouTube URLs", () => {
    const result = classifySite("https://www.youtube.com/watch?v=abc", "");
    expect(result.siteFamily).toBe("youtube");
  });

  it("classifies W3Schools", () => {
    const result = classifySite("https://www.w3schools.com/js/default.asp", W3SCHOOLS_HTML);
    expect(result.siteFamily).toBe("w3schools");
    expect(result.sourceType).toBe("documentation");
  });

  it("classifies GeeksForGeeks", () => {
    const result = classifySite("https://www.geeksforgeeks.org/data-structures/", GEEKSFORGEEKS_HTML);
    expect(result.siteFamily).toBe("geeksforgeeks");
  });

  it("classifies Medium", () => {
    const result = classifySite("https://medium.com/example/learning", MEDIUM_HTML);
    expect(result.siteFamily).toBe("medium");
  });

  it("classifies research papers", () => {
    const result = classifySite("https://arxiv.org/abs/1234.5678", RESEARCH_PAPER_HTML);
    expect(result.siteFamily).toBe("research_paper");
  });

  it("classifies documentation sites", () => {
    const result = classifySite("https://docs.example.dev/install", DOCUMENTATION_HTML);
    expect(result.siteFamily).toBe("documentation");
  });
});
