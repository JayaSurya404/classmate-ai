import { describe, expect, it } from "vitest";
import { redactSecrets } from "../cleaners";
import { blocksFromPlainText, parseBlocksFromElement } from "../parsers/blockParser";
import { parseHTML } from "linkedom";

describe("cleaners and parsers", () => {
  it("redacts likely API keys", () => {
    const text = "Use key sk-abcdefghijklmnopqrstuvwxyz123456 for access";
    expect(redactSecrets(text)).toContain("[REDACTED]");
    expect(redactSecrets(text)).not.toContain("sk-abc");
  });

  it("parses headings, lists, and code from HTML", () => {
    const { document } = parseHTML(`
      <article>
        <h1>Title</h1>
        <p>Paragraph one.</p>
        <ul><li>Alpha</li><li>Beta</li></ul>
        <pre><code class="language-python">print("hi")</code></pre>
      </article>
    `);
    const root = document.querySelector("article")!;
    const blocks = parseBlocksFromElement(root);

    expect(blocks.some((block) => block.type === "heading" && block.text === "Title")).toBe(true);
    expect(blocks.some((block) => block.type === "list")).toBe(true);
    expect(blocks.some((block) => block.type === "code" && block.language === "python")).toBe(true);
  });

  it("creates paragraph blocks from plain text", () => {
    const blocks = blocksFromPlainText("Line one.\n\nLine two.", ["Section"]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.headingPath).toEqual(["Section"]);
  });
});
