/**
 * @fileoverview PR comment builder utilities.
 * @module github/scripts/helpers/comments
 *
 * @remarks
 * Provides builder patterns and utilities for constructing formatted PR comments.
 * Focuses on markdown generation and structured comment formatting.
 * Follows Builder pattern for complex comment construction.
 */

import * as core from "@actions/core";

/**
 * Section in a comment
 */
export interface CommentSection {
  /** Section title */
  title: string;
  /** Section content */
  content: string;
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Initial collapsed state */
  collapsed?: boolean;
}

/**
 * Table column definition
 */
export interface TableColumn {
  /** Column header */
  header: string;
  /** Column alignment */
  align?: "left" | "center" | "right";
}

/**
 * Table row data
 */
export type TableRow = string[];

/**
 * Badge style
 */
export type BadgeStyle = "success" | "warning" | "error" | "info";

/**
 * Comment builder interface
 * Provides fluent API for building PR comments
 */
export interface ICommentBuilder {
  /**
   * Adds a heading to the comment
   * @param text - Heading text
   * @param level - Heading level (1-6)
   * @returns Builder instance for chaining
   */
  addHeading(text: string, level?: number): ICommentBuilder;

  /**
   * Adds a paragraph to the comment
   * @param text - Paragraph text
   * @returns Builder instance for chaining
   */
  addParagraph(text: string): ICommentBuilder;

  /**
   * Adds a code block to the comment
   * @param code - Code content
   * @param language - Language identifier for syntax highlighting
   * @returns Builder instance for chaining
   */
  addCodeBlock(code: string, language?: string): ICommentBuilder;

  /**
   * Adds a quote to the comment
   * @param text - Quote text
   * @returns Builder instance for chaining
   */
  addQuote(text: string): ICommentBuilder;

  /**
   * Adds a horizontal rule
   * @returns Builder instance for chaining
   */
  addRule(): ICommentBuilder;

  /**
   * Adds a list to the comment
   * @param items - List items
   * @param ordered - Whether list is ordered (numbered)
   * @returns Builder instance for chaining
   */
  addList(items: string[], ordered?: boolean): ICommentBuilder;

  /**
   * Adds a table to the comment
   * @param columns - Table columns
   * @param rows - Table rows
   * @returns Builder instance for chaining
   */
  addTable(columns: TableColumn[], rows: TableRow[]): ICommentBuilder;

  /**
   * Adds a collapsible section
   * @param title - Section title
   * @param content - Section content
   * @param collapsed - Whether section is initially collapsed
   * @returns Builder instance for chaining
   */
  addCollapsible(title: string, content: string, collapsed?: boolean): ICommentBuilder;

  /**
   * Adds a badge/label
   * @param text - Badge text
   * @param style - Badge style
   * @returns Builder instance for chaining
   */
  addBadge(text: string, style?: BadgeStyle): ICommentBuilder;

  /**
   * Adds raw markdown
   * @param markdown - Raw markdown content
   * @returns Builder instance for chaining
   */
  addRaw(markdown: string): ICommentBuilder;

  /**
   * Adds a section with title and content
   * @param section - Section definition
   * @returns Builder instance for chaining
   */
  addSection(section: CommentSection): ICommentBuilder;

  /**
   * Adds a newline
   * @param count - Number of newlines to add
   * @returns Builder instance for chaining
   */
  addNewline(count?: number): ICommentBuilder;

  /**
   * Adds a unique identifier for comment lookup
   * @param id - Unique identifier (hidden in comment)
   * @returns Builder instance for chaining
   */
  addIdentifier(id: string): ICommentBuilder;

  /**
   * Builds the final comment markdown
   * @returns Complete markdown string
   */
  build(): string;

  /**
   * Resets the builder
   * @returns Builder instance for chaining
   */
  reset(): ICommentBuilder;
}

/**
 * Implementation of comment builder
 */
export class CommentBuilder implements ICommentBuilder {
  private parts: string[] = [];

  /**
   * {@inheritDoc ICommentBuilder.addHeading}
   */
  addHeading(text: string, level: number = 2): ICommentBuilder {
    const hashes = "#".repeat(Math.max(1, Math.min(6, level)));
    this.parts.push(`${hashes} ${text}\n`);
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addParagraph}
   */
  addParagraph(text: string): ICommentBuilder {
    this.parts.push(`${text}\n`);
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addCodeBlock}
   */
  addCodeBlock(code: string, language: string = ""): ICommentBuilder {
    this.parts.push(`\`\`\`${language}\n${code}\n\`\`\`\n`);
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addQuote}
   */
  addQuote(text: string): ICommentBuilder {
    const lines = text.split("\n");
    const quoted = lines.map((line) => `> ${line}`).join("\n");
    this.parts.push(`${quoted}\n`);
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addRule}
   */
  addRule(): ICommentBuilder {
    this.parts.push("---\n");
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addList}
   */
  addList(items: string[], ordered: boolean = false): ICommentBuilder {
    const listItems = items.map((item, index) => {
      const marker = ordered ? `${index + 1}.` : "-";
      return `${marker} ${item}`;
    });
    this.parts.push(`${listItems.join("\n")}\n`);
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addTable}
   */
  addTable(columns: TableColumn[], rows: TableRow[]): ICommentBuilder {
    if (columns.length === 0 || rows.length === 0) {
      core.warning("Cannot create table with empty columns or rows");
      return this;
    }

    // Header row
    const headers = columns.map((col) => col.header).join(" | ");
    this.parts.push(`| ${headers} |\n`);

    // Separator row with alignment
    const separators = columns.map((col) => {
      const align = col.align ?? "left";
      if (align === "center") return ":---:";
      if (align === "right") return "---:";
      return "---";
    });
    this.parts.push(`| ${separators.join(" | ")} |\n`);

    // Data rows
    for (const row of rows) {
      const cells = row.slice(0, columns.length).join(" | ");
      this.parts.push(`| ${cells} |\n`);
    }

    this.parts.push("\n");
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addCollapsible}
   */
  addCollapsible(title: string, content: string, collapsed: boolean = true): ICommentBuilder {
    const openTag = collapsed ? "<details>" : "<details open>";
    this.parts.push(`${openTag}\n<summary>${title}</summary>\n\n${content}\n\n</details>\n`);
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addBadge}
   */
  addBadge(text: string, style: BadgeStyle = "info"): ICommentBuilder {
    const emoji = {
      success: "✅",
      warning: "⚠️",
      error: "❌",
      info: "ℹ️",
    };

    this.parts.push(`${emoji[style]} **${text}**\n`);
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addRaw}
   */
  addRaw(markdown: string): ICommentBuilder {
    this.parts.push(`${markdown}\n`);
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addSection}
   */
  addSection(section: CommentSection): ICommentBuilder {
    this.addHeading(section.title, 3);

    if (section.collapsible) {
      this.addCollapsible(section.title, section.content, section.collapsed);
    } else {
      this.addRaw(section.content);
    }

    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addNewline}
   */
  addNewline(count: number = 1): ICommentBuilder {
    this.parts.push("\n".repeat(count));
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.addIdentifier}
   */
  addIdentifier(id: string): ICommentBuilder {
    // Add as HTML comment (invisible in rendered markdown)
    this.parts.push(`<!-- ${id} -->\n`);
    return this;
  }

  /**
   * {@inheritDoc ICommentBuilder.build}
   */
  build(): string {
    return this.parts.join("");
  }

  /**
   * {@inheritDoc ICommentBuilder.reset}
   */
  reset(): ICommentBuilder {
    this.parts = [];
    return this;
  }
}

/**
 * Markdown utility functions
 */
export class MarkdownUtils {
  /**
   * Creates a markdown link
   * @param text - Link text
   * @param url - Link URL
   * @returns Markdown link string
   */
  static link(text: string, url: string): string {
    return `[${text}](${url})`;
  }

  /**
   * Creates bold text
   * @param text - Text to bold
   * @returns Bold markdown
   */
  static bold(text: string): string {
    return `**${text}**`;
  }

  /**
   * Creates italic text
   * @param text - Text to italicize
   * @returns Italic markdown
   */
  static italic(text: string): string {
    return `_${text}_`;
  }

  /**
   * Creates inline code
   * @param text - Code text
   * @returns Inline code markdown
   */
  static code(text: string): string {
    return `\`${text}\``;
  }

  /**
   * Creates strikethrough text
   * @param text - Text to strike through
   * @returns Strikethrough markdown
   */
  static strikethrough(text: string): string {
    return `~~${text}~~`;
  }

  /**
   * Escapes special markdown characters
   * @param text - Text to escape
   * @returns Escaped text
   */
  static escape(text: string): string {
    return text.replace(/([\\`*_{}[\]()#+\-.!])/g, "\\$1");
  }

  /**
   * Creates a task list item
   * @param text - Task text
   * @param checked - Whether task is checked
   * @returns Task list item markdown
   */
  static task(text: string, checked: boolean = false): string {
    const checkbox = checked ? "[x]" : "[ ]";
    return `- ${checkbox} ${text}`;
  }

  /**
   * Creates an emoji
   * @param name - Emoji name
   * @returns Emoji markdown
   */
  static emoji(name: string): string {
    return `:${name}:`;
  }

  /**
   * Formats a file size
   * @param bytes - Size in bytes
   * @returns Formatted size string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Formats a percentage
   * @param value - Value to format (0-1 or 0-100)
   * @param normalize - Whether to normalize (multiply by 100)
   * @returns Formatted percentage string
   */
  static formatPercent(value: number, normalize: boolean = false): string {
    const percent = normalize ? value * 100 : value;
    return `${percent.toFixed(2)}%`;
  }

  /**
   * Creates a diff indicator
   * @param value - Numeric value
   * @param showPlus - Whether to show + for positive values
   * @returns Formatted diff string
   */
  static diff(value: number, showPlus: boolean = true): string {
    if (value === 0) return "±0";
    if (value > 0) return `${showPlus ? "+" : ""}${value}`;
    return `${value}`;
  }
}

/**
 * Creates a new comment builder instance
 * @returns Comment builder instance
 * @example
 * ```typescript
 * const comment = createCommentBuilder()
 *   .addHeading('Build Results', 2)
 *   .addBadge('Success', 'success')
 *   .addParagraph('All checks passed!')
 *   .addTable(
 *     [{ header: 'File' }, { header: 'Size', align: 'right' }],
 *     [['app.js', '125 KB'], ['styles.css', '45 KB']]
 *   )
 *   .addIdentifier('build-comment-v1')
 *   .build();
 * ```
 */
export function createCommentBuilder(): ICommentBuilder {
  return new CommentBuilder();
}

/**
 * Quick helper to create a simple comment
 * @param title - Comment title
 * @param content - Comment content
 * @param identifier - Optional unique identifier
 * @returns Formatted markdown comment
 */
export function createSimpleComment(title: string, content: string, identifier?: string): string {
  const builder = createCommentBuilder().addHeading(title, 2).addParagraph(content);

  if (identifier) {
    builder.addIdentifier(identifier);
  }

  return builder.build();
}

/**
 * Creates a status comment with badge and message
 * @param status - Status type
 * @param title - Comment title
 * @param message - Status message
 * @param identifier - Optional unique identifier
 * @returns Formatted markdown comment
 */
export function createStatusComment(status: BadgeStyle, title: string, message: string, identifier?: string): string {
  const builder = createCommentBuilder().addHeading(title, 2).addBadge(message, status);

  if (identifier) {
    builder.addIdentifier(identifier);
  }

  return builder.build();
}
