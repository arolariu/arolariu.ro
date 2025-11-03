/**
 * @fileoverview Unit tests for comments builder
 */

import { describe, it, expect } from 'vitest';
import { createCommentBuilder, MarkdownUtils } from './index';

describe('CommentBuilder', () => {
  it('should build empty comment', () => {
    const builder = createCommentBuilder();
    expect(builder.build()).toBe('');
  });

  it('should add heading', () => {
    const builder = createCommentBuilder();
    builder.addHeading('Test Heading', 2);
    
    expect(builder.build()).toContain('## Test Heading');
  });

  it('should add paragraph', () => {
    const builder = createCommentBuilder();
    builder.addParagraph('Test paragraph');
    
    expect(builder.build()).toContain('Test paragraph');
  });

  it('should add multiple elements', () => {
    const builder = createCommentBuilder();
    builder
      .addHeading('Title', 1)
      .addParagraph('Description')
      .addNewline();
    
    const result = builder.build();
    expect(result).toContain('# Title');
    expect(result).toContain('Description');
  });

  it('should add badge', () => {
    const builder = createCommentBuilder();
    builder.addBadge('Success', 'success');
    
    const result = builder.build();
    expect(result).toContain('Success');
  });

  it('should add table', () => {
    const builder = createCommentBuilder();
    builder.addTable(
      [
        { header: 'Name', align: 'left' },
        { header: 'Value', align: 'right' }
      ],
      [
        ['Item 1', '100'],
        ['Item 2', '200']
      ]
    );
    
    const result = builder.build();
    expect(result).toContain('| Name | Value |');
    expect(result).toContain('| Item 1 | 100 |');
  });

  it('should add collapsible section', () => {
    const builder = createCommentBuilder();
    builder.addCollapsible('Summary', 'Details content', false);
    
    const result = builder.build();
    expect(result).toContain('details');
    expect(result).toContain('Summary');
    expect(result).toContain('Details content');
  });

  it('should add hidden identifier', () => {
    const builder = createCommentBuilder();
    builder.addIdentifier('test-id');
    
    const result = builder.build();
    expect(result).toContain('<!-- test-id -->');
  });

  it('should chain methods', () => {
    const builder = createCommentBuilder();
    const result = builder
      .addHeading('Test', 1)
      .addParagraph('Text')
      .addIdentifier('id')
      .build();
    
    expect(result).toContain('# Test');
    expect(result).toContain('Text');
    expect(result).toContain('<!-- id -->');
  });
});

describe('MarkdownUtils', () => {
  describe('bold', () => {
    it('should make text bold', () => {
      expect(MarkdownUtils.bold('test')).toBe('**test**');
    });
  });

  describe('italic', () => {
    it('should make text italic', () => {
      expect(MarkdownUtils.italic('test')).toBe('_test_');
    });
  });

  describe('code', () => {
    it('should make text inline code', () => {
      expect(MarkdownUtils.code('test')).toBe('`test`');
    });
  });

  describe('link', () => {
    it('should create markdown link', () => {
      expect(MarkdownUtils.link('GitHub', 'https://github.com'))
        .toBe('[GitHub](https://github.com)');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(MarkdownUtils.formatBytes(0)).toBe('0 B');
      expect(MarkdownUtils.formatBytes(1024)).toContain('KB');
      expect(MarkdownUtils.formatBytes(1048576)).toContain('MB');
    });
  });

  describe('formatPercent', () => {
    it('should format percentages', () => {
      expect(MarkdownUtils.formatPercent(0)).toContain('0');
      expect(MarkdownUtils.formatPercent(50.5)).toContain('50');
      expect(MarkdownUtils.formatPercent(100)).toContain('100');
    });
  });

  describe('diff', () => {
    it('should format positive diff', () => {
      expect(MarkdownUtils.diff(100)).toContain('100');
    });

    it('should format negative diff', () => {
      expect(MarkdownUtils.diff(-50)).toContain('50');
    });
  });
});
