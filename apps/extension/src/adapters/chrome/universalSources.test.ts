import { describe, expect, it } from "vitest";
import {
  isImageUrl,
  isPdfUrl,
  isYoutubeUrl,
  parseYoutubePageData,
  parseYoutubeTranscriptXml,
} from "./universalSources";

describe("universal source Chrome adapters", () => {
  it("detects supported source URLs", () => {
    expect(isPdfUrl("https://example.com/notes.pdf")).toBe(true);
    expect(isPdfUrl("https://example.com/notes.pdf?download=1")).toBe(true);
    expect(isImageUrl("https://example.com/diagram.webp#view")).toBe(true);
    expect(isYoutubeUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
    expect(isYoutubeUrl("https://youtu.be/abc123")).toBe(true);
    expect(isYoutubeUrl("https://example.com/watch?v=abc123")).toBe(false);
  });

  it("parses transcript XML into timestamped segments", () => {
    const segments = parseYoutubeTranscriptXml(
      '<transcript><text start="0" dur="4.2">Hello &amp; welcome</text><text start="4.2" dur="3">Binary &lt;b&gt;search&lt;/b&gt;</text></transcript>',
      "en",
      [{ title: "Introduction", startMs: 0, endMs: 4_199 }],
    );

    expect(segments).toHaveLength(2);
    expect(segments[0]?.text).toBe("Hello & welcome");
    expect(segments[0]?.durationMs).toBe(4_200);
    expect(segments[0]?.chapterTitle).toBe("Introduction");
    expect(segments[1]?.startMs).toBe(4_200);
  });

  it("parses YouTube page metadata, captions, thumbnails, and chapters", () => {
    const playerResponse = {
      videoDetails: {
        videoId: "abc123",
        title: "Sorting Lecture",
        shortDescription: "0:00 Intro\n1:30 Merge sort",
        author: "Course Channel",
        thumbnail: { thumbnails: [{ url: "https://img.youtube.com/vi/abc123/default.jpg" }] },
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            {
              baseUrl: "https://example.com/api/timedtext?v=abc123&lang=en",
              languageCode: "en",
              name: { simpleText: "English" },
              isTranslatable: true,
            },
          ],
        },
      },
    };
    const html = `<script>var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</script>`;

    const pageData = parseYoutubePageData("https://www.youtube.com/watch?v=abc123", html);

    expect(pageData.videoId).toBe("abc123");
    expect(pageData.title).toBe("Sorting Lecture");
    expect(pageData.thumbnailUrl).toContain("abc123");
    expect(pageData.tracks[0]?.sourceUrl).toContain("timedtext");
    expect(pageData.chapters[1]?.title).toBe("Merge sort");
    expect(pageData.chapters[1]?.startMs).toBe(90_000);
  });
});
