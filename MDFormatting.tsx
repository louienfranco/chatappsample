"use client";

import React, { useMemo } from "react";

interface MDFormattingProps {
  text: string;
  className?: string;
}

/** Basic emoji shortcode map – extend as needed */
const EMOJI_MAP: Record<string, string> = {
  smile: "😄",
  grin: "😁",
  joy: "😂",
  wink: "😉",
  thumbsup: "👍",
  thumbsdown: "👎",
  heart: "❤️",
  fire: "🔥",
  tada: "🎉",
  rocket: "🚀",
  warning: "⚠️",
  question: "❓",
  check: "✅",
};

const TOC_PLACEHOLDER = "§§__MD_TOC__§§";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtmlAttr(str: string): string {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

function unescapeMdUrl(str: string): string {
  return str.replace(/\\([()])/g, "$1");
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/<[\/!]*?[^<>]*?>/g, "") // strip HTML tags
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface LinkDef {
  url: string;
  title?: string;
}

interface DefsResult {
  cleaned: string;
  linkDefs: Record<string, LinkDef>;
  footnoteDefs: Record<string, string>;
  abbrDefs: Record<string, string>;
}

/**
 * Extract reference-style link defs, footnote defs, and abbreviations.
 * Returns cleaned markdown without those definition lines.
 */
function extractDefinitions(src: string): DefsResult {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const remaining: string[] = [];
  const linkDefs: Record<string, LinkDef> = {};
  const footnoteDefs: Record<string, string> = {};
  const abbrDefs: Record<string, string> = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Footnote: [^id]: text
    let m = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
    if (m) {
      const id = m[1];
      let text = m[2] || "";
      i++;
      // collect following indented/blank lines as part of the footnote
      while (i < lines.length) {
        const l = lines[i];
        if (/^( {4,}|\t)/.test(l)) {
          text += "\n" + l.replace(/^( {4}|\t)/, "");
          i++;
        } else if (/^\s*$/.test(l)) {
          text += "\n";
          i++;
        } else {
          break;
        }
      }
      footnoteDefs[id] = text;
      continue;
    }

    // Abbreviation: *[HTML]: HyperText Markup Language
    m = line.match(/^\*\[([^\]]+)\]:\s+(.+)$/);
    if (m) {
      abbrDefs[m[1]] = m[2];
      i++;
      continue;
    }

    // Reference-style link defs: [label]: url "optional title"
    m = line.match(/^\[([^\]]+)\]:\s*(\S+)(?:\s+"(.+?)")?\s*$/);
    if (m) {
      const label = m[1].toLowerCase();
      linkDefs[label] = { url: m[2], title: m[3] };
      i++;
      continue;
    }

    remaining.push(line);
    i++;
  }

  return {
    cleaned: remaining.join("\n"),
    linkDefs,
    footnoteDefs,
    abbrDefs,
  };
}

/**
 * Core markdown renderer: Markdown string -> HTML string (no external libs).
 */
export function renderMarkdown(src: string): string {
  const { cleaned, linkDefs, footnoteDefs, abbrDefs } = extractDefinitions(src);

  const placeholderMap = new Map<string, string>();
  let placeholderId = 0;

  const makePlaceholder = (html: string): string => {
    const key = `\uE000${placeholderId++}\uE001`;
    placeholderMap.set(key, html);
    return key;
  };

  const restorePlaceholders = (s: string): string => {
    let result = s;
    placeholderMap.forEach((html, key) => {
      result = result.split(key).join(html);
    });
    return result;
  };

  const headings: { level: number; text: string; id: string }[] = [];

  const renderInline = (text: string): string => {
    if (!text) return "";

    let s = text;

    // Normalize newlines
    s = s.replace(/\r\n?/g, "\n");

    // Treat *all* newlines inside a block as hard line breaks
    // (instead of converting to spaces).
    s = s.replace(/\n/g, () => makePlaceholder('<br class="block" />'));

    // Escapes: \* \# \_ etc.
    s = s.replace(
      /\\([\\`*_{}\[\]()#+\-.!|>~:=])/g,
      (_m, ch: string) => makePlaceholder(escapeHtml(ch))
    );

    // Code spans: `code`
    s = s.replace(/`([^`]+)`/g, (_m, code: string) =>
      makePlaceholder(
        `<code class="rounded bg-muted px-1 py-0.5 text-[0.8em] font-mono">${escapeHtml(
          code
        )}</code>`
      )
    );

    // Autolinks with angle brackets: <https://...>, <email@example.com>
    s = s.replace(
      /<((?:https?|ftp):\/\/[^>]+)>/g,
      (_m, url: string) =>
        makePlaceholder(
          `<a href="${escapeHtmlAttr(
            url
          )}" target="_blank" rel="noreferrer" class="text-primary underline-offset-2 hover:underline">${escapeHtml(
            url
          )}</a>`
        )
    );

    s = s.replace(
      /<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>/g,
      (_m, email: string) =>
        makePlaceholder(
          `<a href="mailto:${escapeHtmlAttr(
            email
          )}" class="text-primary underline-offset-2 hover:underline">${escapeHtml(
            email
          )}</a>`
        )
    );

    // HTML comments
    s = s.replace(/<!--[\s\S]*?-->/g, (m) => makePlaceholder(m));

    // Inline HTML tags (rough)
    s = s.replace(/<\/?[A-Za-z][^>]*>/g, (m) => makePlaceholder(m));

    // Reference-style images: ![alt][id]
    s = s.replace(
      /!\[([^\]]*)\]\[([^\]]*)\]/g,
      (_m, alt: string, id: string) => {
        const key = (id || alt).toLowerCase();
        const def = linkDefs[key];
        if (!def) return _m;
        const url = escapeHtmlAttr(def.url);
        const titleAttr = def.title
          ? ` title="${escapeHtmlAttr(def.title)}"`
          : "";
        return makePlaceholder(
          `<img src="${url}" alt="${escapeHtmlAttr(
            alt
          )}"${titleAttr} class="inline-block max-w-full align-middle rounded-md" />`
        );
      }
    );

    // Inline images: ![alt](url "title")
    s = s.replace(
      /!\[([^\]]*)\]\((\S+?)(?:\s+"(.+?)")?\)/g,
      (_m, alt: string, url: string, title?: string) => {
        const srcUrl = escapeHtmlAttr(unescapeMdUrl(url));
        const titleAttr = title ? ` title="${escapeHtmlAttr(title)}"` : "";
        return makePlaceholder(
          `<img src="${srcUrl}" alt="${escapeHtmlAttr(
            alt
          )}"${titleAttr} class="inline-block max-w-full align-middle rounded-md" />`
        );
      }
    );

    // Reference-style links: [text][id]
    s = s.replace(
      /\[([^\]]+)\]\[([^\]]*)\]/g,
      (_m, label: string, id: string) => {
        const key = (id || label).toLowerCase();
        const def = linkDefs[key];
        if (!def) return _m;
        const url = escapeHtmlAttr(def.url);
        const titleAttr = def.title
          ? ` title="${escapeHtmlAttr(def.title)}"`
          : "";
        const inner = escapeHtml(label);
        return makePlaceholder(
          `<a href="${url}"${titleAttr} target="_blank" rel="noreferrer" class="text-primary underline-offset-2 hover:underline">${inner}</a>`
        );
      }
    );

    // Inline links: [text](url "title")
    s = s.replace(
      /\[([^\]]+)\]\((\S+?)(?:\s+"(.+?)")?\)/g,
      (_m, label: string, url: string, title?: string) => {
        const href = escapeHtmlAttr(unescapeMdUrl(url));
        const titleAttr = title ? ` title="${escapeHtmlAttr(title)}"` : "";
        const inner = escapeHtml(label);
        return makePlaceholder(
          `<a href="${href}"${titleAttr} target="_blank" rel="noreferrer" class="text-primary underline-offset-2 hover:underline">${inner}</a>`
        );
      }
    );

    // Footnote references: [^id]
    s = s.replace(/\[\^([^\]]+)\]/g, (_m, id: string) => {
      const fid = escapeHtmlAttr(id);
      return makePlaceholder(
        `<sup id="fnref-${fid}" class="text-[0.7em] align-super"><a href="#fn-${fid}" class="text-primary underline-offset-2 hover:underline">[${escapeHtml(
          fid
        )}]</a></sup>`
      );
    });

    // Highlight: ==text==
    s = s.replace(/==([^=]+)==/g, (_m, content: string) =>
      makePlaceholder(
        `<mark class="rounded bg-yellow-200/70 px-0.5 dark:bg-yellow-500/40">${escapeHtml(
          content
        )}</mark>`
      )
    );

    // Bold + italic: ***text*** or ___text___
    s = s.replace(
      /(\*\*\*|___)([^]+?)\1/g,
      (_m, _wrapper: string, content: string) =>
        makePlaceholder(
          `<strong class="font-semibold"><em class="italic">${escapeHtml(
            content
          )}</em></strong>`
        )
    );

    // Bold: **text** or __text__
    s = s.replace(
      /(\*\*|__)([^]+?)\1/g,
      (_m, _wrapper: string, content: string) =>
        makePlaceholder(
          `<strong class="font-semibold">${escapeHtml(content)}</strong>`
        )
    );

    // Italic: *text* or _text_
    s = s.replace(
      /(\*|_)([^]+?)\1/g,
      (_m, _wrapper: string, content: string) =>
        makePlaceholder(`<em class="italic">${escapeHtml(content)}</em>`)
    );

    // Strikethrough: ~~text~~
    s = s.replace(/~~([^~]+)~~/g, (_m, content: string) =>
      makePlaceholder(
        `<del class="opacity-70">${escapeHtml(content)}</del>`
      )
    );

    // Colored text
    s = s.replace(
      /\[color=([#a-zA-Z0-9]+)\]([\s\S]+?)\[\/color\]/g,
      (_m, rawColor: string, content: string) => {
        const lower = rawColor.toLowerCase();

        const namedColors = new Set([
          "red",
          "blue",
          "green",
          "yellow",
          "pink",
          "purple",
          "orange",
        ]);
        if (namedColors.has(lower)) {
          const cls = `text-${lower}-500`;
          return makePlaceholder(
            `<span class="${escapeHtmlAttr(cls)}">${renderInline(
              content
            )}</span>`
          );
        }

        const hexMatch = lower.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (hexMatch) {
          const hex = `#${hexMatch[1]}`;
          return makePlaceholder(
            `<span style="color:${escapeHtmlAttr(
              hex
            )}">${renderInline(content)}</span>`
          );
        }

        return _m;
      }
    );

    // Emoji shortcodes :smile:
    s = s.replace(/:([a-z0-9_+-]+):/gi, (_m, code: string) => {
      const emoji = EMOJI_MAP[code.toLowerCase()];
      if (!emoji) return _m;
      return makePlaceholder(
        `<span class="md-emoji inline-block align-[-0.15em]" role="img" aria-label="${escapeHtmlAttr(
          code
        )}">${emoji}</span>`
      );
    });

    // Autolink literal URLs
    s = s.replace(
      /(^|[\s(])((?:https?|ftp):\/\/[^\s<]+[^\s<\.,:;"')\]\}!])/gi,
      (_m, pre: string, url: string) =>
        pre +
        makePlaceholder(
          `<a href="${escapeHtmlAttr(
            url
          )}" target="_blank" rel="noreferrer" class="text-primary underline-offset-2 hover:underline break-all">${escapeHtml(
            url
          )}</a>`
        )
    );

    // Autolink literal emails
    s = s.replace(
      /(^|[\s(])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
      (_m, pre: string, email: string) =>
        pre +
        makePlaceholder(
          `<a href="mailto:${escapeHtmlAttr(
            email
          )}" class="text-primary underline-offset-2 hover:underline">${escapeHtml(
            email
          )}</a>`
        )
    );

    // Issue / PR linking: #123
    s = s.replace(
      /(^|[\s(])#(\d+)\b/g,
      (_m, pre: string, num: string) =>
        pre +
        makePlaceholder(
          `<a href="#${escapeHtmlAttr(
            num
          )}" class="md-issue text-blue-600 underline-offset-2 hover:underline dark:text-blue-400">#${escapeHtml(
            num
          )}</a>`
        )
    );

    // User mentions: @username
    s = s.replace(
      /(^|[\s(])@([a-zA-Z0-9_][a-zA-Z0-9_-]*)/g,
      (_m, pre: string, user: string) =>
        pre +
        makePlaceholder(
          `<span class="md-mention inline-flex items-center rounded bg-primary/10 px-1 text-[0.75rem] font-medium text-primary">@${escapeHtml(
            user
          )}</span>`
        )
    );

    // Commit hashes: 7-40 hex chars
    s = s.replace(
      /(^|[\s(])([0-9a-f]{7,40})\b/gi,
      (_m, pre: string, hash: string) =>
        pre +
        makePlaceholder(
          `<code class="md-commit rounded bg-muted px-1 py-0.5 text-[0.75em] font-mono">${escapeHtml(
            hash
          )}</code>`
        )
    );

    // Abbreviations
    Object.keys(abbrDefs).forEach((abbr) => {
      const title = abbrDefs[abbr];
      const re = new RegExp(`\\b${escapeRegex(abbr)}\\b`, "g");
      s = s.replace(re, () =>
        makePlaceholder(
          `<abbr title="${escapeHtmlAttr(
            title
          )}" class="cursor-help underline decoration-dotted">${escapeHtml(
            abbr
          )}</abbr>`
        )
      );
    });

    return s;
  };

  const isTableDivider = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const pipeCount = (trimmed.match(/\|/g) || []).length;
    if (pipeCount < 1) return false;
    const cells = trimmed
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    if (!cells.length) return false;
    return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  };

  const parseTableAt = (
    lines: string[],
    start: number
  ): { html: string; next: number } => {
    const headerLine = lines[start];
    const dividerLine = lines[start + 1];

    const splitRow = (line: string): string[] =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());

    const headers = splitRow(headerLine);
    const alignCells = splitRow(dividerLine);
    const aligns = alignCells.map((c) => {
      const left = c.startsWith(":");
      const right = c.endsWith(":");
      if (left && right) return "center";
      if (right) return "right";
      if (left) return "left";
      return "";
    });

    const rows: string[][] = [];
    let i = start + 2;
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim() || !l.includes("|")) break;
      rows.push(splitRow(l));
      i++;
    }

    const thead =
      '<thead class="bg-muted/40"><tr>' +
      headers
        .map((h, idx) => {
          const align = aligns[idx] || "";
          const style = align ? ` style="text-align:${align}"` : "";
          return `<th${style} class="border-b border-border/60 px-2 py-1 text-left text-[0.75rem] font-medium text-muted-foreground">${renderInline(
            h
          )}</th>`;
        })
        .join("") +
      "</tr></thead>";

    const tbody =
      "<tbody>" +
      rows
        .map(
          (row) =>
            "<tr>" +
            row
              .map((cell, idx) => {
                const align = aligns[idx] || "";
                const style = align ? ` style="text-align:${align}"` : "";
                return `<td${style} class="border-b border-border/40 px-2 py-1 align-top">${renderInline(
                  cell
                )}</td>`;
              })
              .join("") +
            "</tr>"
        )
        .join("") +
      "</tbody>";

    const html = `<table class="my-3 w-full border-collapse overflow-hidden rounded-md border border-border/60 text-xs">${thead}${tbody}</table>`;
    return { html, next: i };
  };

  const parseListAt = (
    lines: string[],
    start: number
  ): { html: string; next: number } => {
    const itemRe = /^(\s*)([*+-]|\d+\.)\s+(.*)$/;
    let m = lines[start].match(itemRe);
    if (!m) {
      return { html: "", next: start + 1 };
    }
    const baseIndent = m[1].length;
    const ordered = /\d+\./.test(m[2]);
    const tag = ordered ? "ol" : "ul";

    const items: string[] = [];
    let i = start;

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) break;
      m = line.match(itemRe);
      if (!m) break;

      const indent = m[1].length;
      if (indent < baseIndent) break;

      if (indent > baseIndent) {
        // nested list under previous item
        const nested = parseListAt(lines, i);
        if (items.length > 0) {
          items[items.length - 1] += nested.html;
        }
        i = nested.next;
        continue;
      }

      // same-level item
      const content = m[3];
      i++;

      const itemLines: string[] = [content];

      // gather continuation lines (paragraphs inside this list item)
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) {
          i++;
          break;
        }
        const mm = l.match(itemRe);
        // any new list item (same or deeper) ends this item's paragraph
        if (mm) break;

        itemLines.push(
          l.replace(new RegExp(`^\\s{0,${baseIndent + 2}}`), "")
        );
        i++;
      }

      // Task list?
      const taskMatch = itemLines[0].match(/^\[( |x|X)\]\s+(.*)$/);
      let prefix = "";
      let bodyText: string;
      if (taskMatch) {
        const checked = taskMatch[1].toLowerCase() === "x";
        prefix = `<input type="checkbox" disabled${
          checked ? " checked" : ""
        } class="mr-1 h-3 w-3 rounded border border-border align-middle accent-primary" /> `;
        bodyText = [taskMatch[2], ...itemLines.slice(1)].join("\n");
      } else {
        bodyText = itemLines.join("\n");
      }

      items.push(
        `<li class="ml-1">${prefix}${renderInline(bodyText.trim())}</li>`
      );
    }

    const listClass = ordered
      ? "list-decimal list-inside ml-4 my-2 space-y-1"
      : "list-disc list-inside ml-4 my-2 space-y-1";

    const html = `<${tag} class="${listClass}">${items.join("")}</${tag}>`;
    return { html, next: i };
  };

  /**
   * Tailwind-style heading sizes:
   * H1 largest, then step down to H6.
   */
  const headingClass = (level: number): string => {
    switch (level) {
      case 1:
        return "mt-6 mb-3 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl";
      case 2:
        return "mt-6 mb-3 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0";
      case 3:
        return "mt-4 mb-2 scroll-m-20 text-2xl font-semibold tracking-tight";
      case 4:
        return "mt-4 mb-2 scroll-m-20 text-xl font-semibold tracking-tight";
      case 5:
        return "mt-3 mb-2 scroll-m-20 text-lg font-semibold tracking-tight";
      case 6:
      default:
        return "mt-3 mb-2 scroll-m-20 text-base font-semibold tracking-tight text-muted-foreground";
    }
  };

  const parseBlocks = (src: string): string => {
    const lines = src.replace(/\r\n?/g, "\n").split("\n");
    const out: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) {
        i++;
        continue;
      }

      // Fenced code blocks: ``` or ~~~
      let m = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
      if (m) {
        const fence = m[2];
        const info = (m[3] || "").trim();
        const lang = info.split(/\s+/)[0] || "";
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith(fence)) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // skip closing
        const code = escapeHtml(codeLines.join("\n"));
        const langClass = lang ? `language-${escapeHtmlAttr(lang)}` : "";
        out.push(
          `<pre class="my-2 overflow-x-auto rounded-md bg-muted/60 p-2 text-xs font-mono"><code class="${langClass}">${code}</code></pre>`
        );
        continue;
      }

      // Indented code block
      if (/^( {4,}|\t)/.test(line)) {
        const codeLines: string[] = [];
        while (i < lines.length && /^( {4,}|\t)/.test(lines[i])) {
          codeLines.push(lines[i].replace(/^( {4}|\t)/, ""));
          i++;
        }
        const code = escapeHtml(codeLines.join("\n"));
        out.push(
          `<pre class="my-2 overflow-x-auto rounded-md bg-muted/60 p-2 text-xs font-mono"><code>${code}</code></pre>`
        );
        continue;
      }

      // Headings
      m = line.match(/^(\s{0,3})(#{1,6})\s+(.*)$/);
      if (m) {
        const level = m[2].length;
        let textContent = m[3].trim();
        textContent = textContent.replace(/\s+#+\s*$/, "");
        const id = slugify(textContent);
        const inner = renderInline(textContent);
        headings.push({ level, text: textContent, id });
        out.push(
          `<h${level} id="${id}" class="${headingClass(
            level
          )}">${inner}</h${level}>`
        );
        i++;
        continue;
      }

      // Horizontal rule
      if (/^(\s{0,3})([-*_])(?:\s*\2){2,}\s*$/.test(line)) {
        out.push('<hr class="my-3 border-border/60" />');
        i++;
        continue;
      }

      // Blockquote
      if (/^\s*>/.test(line)) {
        const quoteLines: string[] = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          quoteLines.push(lines[i].replace(/^\s*> ?/, ""));
          i++;
        }
        const inner = parseBlocks(quoteLines.join("\n"));
        out.push(
          `<blockquote class="my-2 border-l-2 border-muted-foreground/30 pl-3 text-[0.85rem] text-muted-foreground space-y-1">${inner}</blockquote>`
        );
        continue;
      }

      // TOC directive
      if (/^\s*\[(toc|TOC)\]\s*$/.test(line)) {
        out.push(TOC_PLACEHOLDER);
        i++;
        continue;
      }

      // Table
      if (
        line.includes("|") &&
        i + 1 < lines.length &&
        isTableDivider(lines[i + 1])
      ) {
        const { html, next } = parseTableAt(lines, i);
        out.push(html);
        i = next;
        continue;
      }

      // List
      if (/^\s*([*+-]|\d+\.)\s+/.test(line)) {
        const { html, next } = parseListAt(lines, i);
        out.push(html);
        i = next;
        continue;
      }

      // HTML comment block
      if (/^\s*<!--/.test(line)) {
        const commentLines: string[] = [];
        while (i < lines.length) {
          commentLines.push(lines[i]);
          if (lines[i].includes("-->")) {
            i++;
            break;
          }
          i++;
        }
        out.push(commentLines.join("\n"));
        continue;
      }

      // Block HTML (very simple)
      if (/^\s*</.test(line)) {
        const htmlLines: string[] = [];
        while (i < lines.length && lines[i].trim()) {
          htmlLines.push(lines[i]);
          i++;
        }
        out.push(htmlLines.join("\n"));
        continue;
      }

      // Definition list: "Term : Definition"
      m = line.match(/^(.+?)\s*:\s+(.+)$/);
      if (m) {
        const items: string[] = [];
        while (i < lines.length) {
          const d = lines[i].match(/^(.+?)\s*:\s+(.+)$/);
          if (!d) break;
          items.push(
            `<dt class="font-medium text-xs text-muted-foreground uppercase tracking-wide">${renderInline(
              d[1].trim()
            )}</dt><dd class="ml-3 text-sm">${renderInline(
              d[2].trim()
            )}</dd>`
          );
          i++;
        }
        out.push(`<dl class="my-2 space-y-1">${items.join("")}</dl>`);
        continue;
      }

      // Paragraph
      const paraLines: string[] = [line];
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (!l.trim()) break;
        if (
          /^(\s{0,3})(#{1,6})\s+/.test(l) ||
          /^(\s{0,3})([-*_])(?:\s*\2){2,}\s*$/.test(l) ||
          /^\s*>/.test(l) ||
          /^\s*([*+-]|\d+\.)\s+/.test(l) ||
          (l.includes("|") &&
            i + 1 < lines.length &&
            isTableDivider(lines[i + 1])) ||
          /^(\s*)(`{3,}|~{3,})(.*)$/.test(l) ||
          /^( {4,}|\t)/.test(l) ||
          /^\s*</.test(l) ||
          /^(.+?)\s*:\s+(.+)$/.test(l) ||
          /^\s*\[(toc|TOC)\]\s*$/.test(l)
        ) {
          break;
        }
        paraLines.push(l);
        i++;
      }
      const paraText = paraLines.join("\n").trim();
      if (paraText) {
        out.push(
          `<p class="my-1 text-sm leading-relaxed">${renderInline(
            paraText
          )}</p>`
        );
      }
    }

    return out.join("\n");
  };

  let html = parseBlocks(cleaned);

  // TOC: replace placeholder with generated TOC
  if (html.includes(TOC_PLACEHOLDER)) {
    const tocItems = headings.map((h) => {
      const indentPx = (h.level - 1) * 12;
      return `<div style="margin-left:${indentPx}px"><a href="#${escapeHtmlAttr(
        h.id
      )}" class="block text-xs text-muted-foreground hover:text-foreground">${escapeHtml(
        h.text
      )}</a></div>`;
    });
    const tocHtml = `<nav class="md-toc mb-3 rounded-md border bg-muted/40 p-2 text-xs space-y-1">${tocItems.join(
      ""
    )}</nav>`;
    html = html.split(TOC_PLACEHOLDER).join(tocHtml);
  }

  // Footnotes section
  if (Object.keys(footnoteDefs).length) {
    const footnotesHtml =
      '<section class="footnotes mt-4 space-y-1 text-xs text-muted-foreground"><hr class="my-2 border-border/60" /><ol class="list-decimal list-inside ml-4 space-y-1">' +
      Object.keys(footnoteDefs)
        .map((id) => {
          const fid = escapeHtmlAttr(id);
          const body = parseBlocks(footnoteDefs[id]);
          return `<li id="fn-${fid}" class="ml-1">${body} <a href="#fnref-${fid}" class="footnote-backref text-primary underline-offset-2 hover:underline">↩︎</a></li>`;
        })
        .join("") +
      "</ol></section>";

    html += `\n${footnotesHtml}`;
  }

  html = restorePlaceholders(html);
  return html;
}

const MDFormatting: React.FC<MDFormattingProps> = ({ text, className }) => {
  const html = useMemo(() => renderMarkdown(text || ""), [text]);

  const classes =
    "md-formatting text-sm leading-relaxed space-y-1 break-words" +
    (className ? ` ${className}` : "");

  return <div className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default MDFormatting;
