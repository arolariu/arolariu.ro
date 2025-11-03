/**
 * @fileoverview Unit tests for comments builder
 */

import {describe, expect, it} from "vitest";
import {createCommentBuilder, MarkdownUtils} from "./index";

describe("CommentBuilder", () => {
  it("should build empty comment", () => {
    const builder = createCommentBuilder();
    expect(builder.build()).toBe("");
  });

  it("should add heading", () => {
    const builder = createCommentBuilder();
    builder.addHeading("Test Heading", 2);

    expect(builder.build()).toContain("## Test Heading");
  });

  it("should add paragraph", () => {
    const builder = createCommentBuilder();
    builder.addParagraph("Test paragraph");

    expect(builder.build()).toContain("Test paragraph");
  });

  it("should add multiple elements", () => {
    const builder = createCommentBuilder();
    builder.addHeading("Title", 1).addParagraph("Description").addNewline();

    const result = builder.build();
    expect(result).toContain("# Title");
    expect(result).toContain("Description");
  });

  it("should add badge", () => {
    const builder = createCommentBuilder();
    builder.addBadge("Success", "success");

    const result = builder.build();
    expect(result).toContain("Success");
  });

  it("should add code block with language", () => {
    const builder = createCommentBuilder();
    builder.addCodeBlock("const x = 10;", "javascript");

    const result = builder.build();
    expect(result).toContain("```javascript");
    expect(result).toContain("const x = 10;");
    expect(result).toContain("```");
  });

  it("should add code block without language", () => {
    const builder = createCommentBuilder();
    builder.addCodeBlock("some code");

    const result = builder.build();
    expect(result).toContain("```");
    expect(result).toContain("some code");
  });

  it("should add quote", () => {
    const builder = createCommentBuilder();
    builder.addQuote("This is a quote");

    const result = builder.build();
    expect(result).toContain("> This is a quote");
  });

  it("should add multi-line quote", () => {
    const builder = createCommentBuilder();
    builder.addQuote("Line 1\nLine 2\nLine 3");

    const result = builder.build();
    expect(result).toContain("> Line 1");
    expect(result).toContain("> Line 2");
    expect(result).toContain("> Line 3");
  });

  it("should add horizontal rule", () => {
    const builder = createCommentBuilder();
    builder.addRule();

    const result = builder.build();
    expect(result).toContain("---");
  });

  it("should add unordered list", () => {
    const builder = createCommentBuilder();
    builder.addList(["Item 1", "Item 2", "Item 3"], false);

    const result = builder.build();
    expect(result).toContain("- Item 1");
    expect(result).toContain("- Item 2");
    expect(result).toContain("- Item 3");
  });

  it("should add ordered list", () => {
    const builder = createCommentBuilder();
    builder.addList(["First", "Second", "Third"], true);

    const result = builder.build();
    expect(result).toContain("1. First");
    expect(result).toContain("2. Second");
    expect(result).toContain("3. Third");
  });

  it("should handle heading level limits", () => {
    const builder = createCommentBuilder();
    builder.addHeading("H1", 1);
    builder.addHeading("H6", 6);
    builder.addHeading("H7 clamped to 6", 7);
    builder.addHeading("H0 clamped to 1", 0);

    const result = builder.build();
    expect(result).toContain("# H1");
    expect(result).toContain("###### H6");
    expect(result).toContain("###### H7 clamped to 6");
    expect(result).toContain("# H0 clamped to 1");
  });

  it("should add table with center alignment", () => {
    const builder = createCommentBuilder();
    builder.addTable([{header: "Center", align: "center"}], [["Data"]]);

    const result = builder.build();
    expect(result).toContain(":---:");
  });

  it("should add table with right alignment", () => {
    const builder = createCommentBuilder();
    builder.addTable([{header: "Right", align: "right"}], [["Data"]]);

    const result = builder.build();
    expect(result).toContain("---:");
  });

  it("should handle table with default alignment", () => {
    const builder = createCommentBuilder();
    builder.addTable([{header: "Default"}], [["Data"]]);

    const result = builder.build();
    expect(result).toContain("---");
    expect(result).not.toContain(":---:");
    expect(result).not.toContain("---:");
  });

  it("should handle empty table gracefully", () => {
    const builder = createCommentBuilder();
    builder.addTable([], []);

    const result = builder.build();
    expect(result).not.toContain("|");
  });

  it("should add collapsible section collapsed by default", () => {
    const builder = createCommentBuilder();
    builder.addCollapsible("Click me", "Hidden content");

    const result = builder.build();
    expect(result).toContain("<details>");
    expect(result).not.toContain("<details open>");
  });

  it("should add collapsible section open", () => {
    const builder = createCommentBuilder();
    builder.addCollapsible("Already open", "Visible content", false);

    const result = builder.build();
    expect(result).toContain("<details open>");
  });

  it("should add different badge styles", () => {
    const builder = createCommentBuilder();
    builder.addBadge("Success", "success");
    builder.addBadge("Warning", "warning");
    builder.addBadge("Error", "error");
    builder.addBadge("Info", "info");

    const result = builder.build();
    expect(result).toContain("✅");
    expect(result).toContain("⚠️");
    expect(result).toContain("❌");
    expect(result).toContain("ℹ️");
  });

  it("should add raw markdown", () => {
    const builder = createCommentBuilder();
    builder.addRaw("**Bold** and _italic_ text");

    const result = builder.build();
    expect(result).toContain("**Bold** and _italic_ text");
  });

  it("should add section without collapsible", () => {
    const builder = createCommentBuilder();
    builder.addSection({
      title: "Section Title",
      content: "Section content",
      collapsible: false,
    });

    const result = builder.build();
    expect(result).toContain("### Section Title");
    expect(result).toContain("Section content");
    expect(result).not.toContain("<details>");
  });

  it("should add section with collapsible", () => {
    const builder = createCommentBuilder();
    builder.addSection({
      title: "Collapsible Section",
      content: "Hidden content",
      collapsible: true,
      collapsed: true,
    });

    const result = builder.build();
    expect(result).toContain("<details>");
  });

  it("should add multiple newlines", () => {
    const builder = createCommentBuilder();
    builder.addParagraph("Line 1");
    builder.addNewline(3);
    builder.addParagraph("Line 2");

    const result = builder.build();
    expect(result).toContain("\n\n\n");
  });

  it("should reset builder", () => {
    const builder = createCommentBuilder();
    builder.addHeading("Test", 1);
    builder.addParagraph("Content");

    expect(builder.build()).not.toBe("");

    builder.reset();
    expect(builder.build()).toBe("");
  });

  it("should add table", () => {
    const builder = createCommentBuilder();
    builder.addTable(
      [
        {header: "Name", align: "left"},
        {header: "Value", align: "right"},
      ],
      [
        ["Item 1", "100"],
        ["Item 2", "200"],
      ],
    );

    const result = builder.build();
    expect(result).toContain("| Name | Value |");
    expect(result).toContain("| Item 1 | 100 |");
  });

  it("should add collapsible section", () => {
    const builder = createCommentBuilder();
    builder.addCollapsible("Summary", "Details content", false);

    const result = builder.build();
    expect(result).toContain("details");
    expect(result).toContain("Summary");
    expect(result).toContain("Details content");
  });

  it("should add hidden identifier", () => {
    const builder = createCommentBuilder();
    builder.addIdentifier("test-id");

    const result = builder.build();
    expect(result).toContain("<!-- test-id -->");
  });

  it("should chain methods", () => {
    const builder = createCommentBuilder();
    const result = builder.addHeading("Test", 1).addParagraph("Text").addIdentifier("id").build();

    expect(result).toContain("# Test");
    expect(result).toContain("Text");
    expect(result).toContain("<!-- id -->");
  });
});

describe("MarkdownUtils", () => {
  describe("bold", () => {
    it("should make text bold", () => {
      expect(MarkdownUtils.bold("test")).toBe("**test**");
    });
  });

  describe("italic", () => {
    it("should make text italic", () => {
      expect(MarkdownUtils.italic("test")).toBe("_test_");
    });
  });

  describe("code", () => {
    it("should make text inline code", () => {
      expect(MarkdownUtils.code("test")).toBe("`test`");
    });
  });

  describe("link", () => {
    it("should create markdown link", () => {
      expect(MarkdownUtils.link("GitHub", "https://github.com")).toBe("[GitHub](https://github.com)");
    });
  });

  describe("formatBytes", () => {
    it("should format bytes", () => {
      expect(MarkdownUtils.formatBytes(0)).toBe("0 B");
      expect(MarkdownUtils.formatBytes(1024)).toContain("KB");
      expect(MarkdownUtils.formatBytes(1048576)).toContain("MB");
    });
  });

  describe("formatPercent", () => {
    it("should format percentages", () => {
      expect(MarkdownUtils.formatPercent(0)).toContain("0");
      expect(MarkdownUtils.formatPercent(50.5)).toContain("50");
      expect(MarkdownUtils.formatPercent(100)).toContain("100");
    });
  });

  describe("diff", () => {
    it("should format positive diff", () => {
      expect(MarkdownUtils.diff(100)).toContain("100");
    });

    it("should format negative diff", () => {
      expect(MarkdownUtils.diff(-50)).toContain("50");
    });
  });

  describe("strikethrough", () => {
    it("should create strikethrough text", () => {
      expect(MarkdownUtils.strikethrough("deprecated")).toBe("~~deprecated~~");
    });
  });

  describe("escape", () => {
    it("should escape special markdown characters", () => {
      const text = "Test *bold* and _italic_ and `code`";
      const escaped = MarkdownUtils.escape(text);
      expect(escaped).toContain("\\*");
      expect(escaped).toContain("\\_");
      expect(escaped).toContain("\\`");
    });
  });

  describe("task", () => {
    it("should create unchecked task item", () => {
      expect(MarkdownUtils.task("Do something")).toBe("- [ ] Do something");
    });

    it("should create checked task item", () => {
      expect(MarkdownUtils.task("Done task", true)).toBe("- [x] Done task");
    });
  });

  describe("emoji", () => {
    it("should create emoji markdown", () => {
      expect(MarkdownUtils.emoji("rocket")).toBe(":rocket:");
      expect(MarkdownUtils.emoji("tada")).toBe(":tada:");
    });
  });
});

describe("Comment helper functions", () => {
  it("should create simple comment without identifier", async () => {
    const {createSimpleComment} = await import("./index");
    const comment = createSimpleComment("Title", "Content");
    expect(comment).toContain("## Title");
    expect(comment).toContain("Content");
  });

  it("should create simple comment with identifier", async () => {
    const {createSimpleComment} = await import("./index");
    const comment = createSimpleComment("Title", "Content", "test-id");
    expect(comment).toContain("## Title");
    expect(comment).toContain("Content");
    expect(comment).toContain("test-id");
  });

  it("should create status comment without identifier", async () => {
    const {createStatusComment} = await import("./index");
    const comment = createStatusComment("success", "Build", "Build passed!");
    expect(comment).toContain("## Build");
    expect(comment).toContain("Build passed!");
  });

  it("should create status comment with identifier", async () => {
    const {createStatusComment} = await import("./index");
    const comment = createStatusComment("error", "Build", "Build failed!", "build-status");
    expect(comment).toContain("## Build");
    expect(comment).toContain("Build failed!");
    expect(comment).toContain("build-status");
  });
});
