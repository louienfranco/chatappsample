// app/page.tsx
"use client";

import React, { useRef, useState } from "react";
import MDFormatting from "@/components/chat/MDFormatting"; // adjust path as needed

const MarkdownEditor: React.FC = () => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const updateValue = (next: string) => {
    setValue(next);
  };

  // ---- Generic helpers -----------------------------------------------------

  const wrapSelection = (
    before: string,
    after: string = before,
    placeholder = "text"
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart == null || selectionEnd == null) return;

    const selected = value.slice(selectionStart, selectionEnd);
    const inner = selected || placeholder;

    const next =
      value.slice(0, selectionStart) +
      before +
      inner +
      after +
      value.slice(selectionEnd);

    updateValue(next);

    const start = selectionStart + before.length;
    const end = start + inner.length;

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  };

  const insertAtCursor = (
    snippet: string,
    selectOffsetStart?: number,
    selectOffsetEnd?: number
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart == null || selectionEnd == null) return;

    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);
    const next = before + snippet + after;
    updateValue(next);

    const base = before.length;
    const start = base + (selectOffsetStart ?? snippet.length);
    const end = base + (selectOffsetEnd ?? snippet.length);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  };

  const applyLineTransform = (transform: (lines: string[]) => string[]) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart == null || selectionEnd == null) return;

    let start = selectionStart;
    let end = selectionEnd;

    // If nothing selected, operate on the current line
    if (start === end) {
      while (start > 0 && value[start - 1] !== "\n") start--;
      while (end < value.length && value[end] !== "\n") end++;
    }

    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    const lines = selected.split("\n");
    const newLines = transform(lines);
    const changed = newLines.join("\n");

    const next = before + changed + after;
    updateValue(next);

    const newStart = start;
    const newEnd = start + changed.length;

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newStart, newEnd);
    });
  };

  // ---- Block type: paragraph / headings ------------------------------------

  const setParagraph = () => {
    applyLineTransform((lines) =>
      lines.map((line) => line.replace(/^\s*(#{1,6}\s+)/, ""))
    );
  };

  const setHeading = (level: 1 | 2 | 3) => {
    const hashes = "#".repeat(level) + " ";
    applyLineTransform((lines) =>
      lines.map((line) => {
        const without = line.replace(/^\s*(#{1,6}\s+)?/, "");
        if (!without.trim()) return hashes;
        return `${hashes}${without}`;
      })
    );
  };

  // ---- Inline styles -------------------------------------------------------

  const makeBold = () => wrapSelection("**", "**", "bold");
  const makeItalic = () => wrapSelection("*", "*", "italic");
  const makeUnderline = () => wrapSelection("<u>", "</u>", "underlined"); // inline HTML
  const makeStrike = () => wrapSelection("~~", "~~", "strikethrough");
  const makeInlineCode = () => wrapSelection("`", "`", "code");
  const makeHighlight = () => wrapSelection("==", "==", "highlight");

  const setColor = () => {
    const color =
      window.prompt(
        "Color (named: red, blue, green, ... or hex: #ff0000):",
        "red"
      ) || "";
    if (!color) return;
    wrapSelection(`[color=${color}]`, "[/color]", "colored text");
  };

  // ---- Lists, blockquote, code block, HR -----------------------------------

  const toggleBulletList = () => {
    applyLineTransform((lines) => {
      const allBulleted = lines.every(
        (line) => !line.trim() || /^\s*[-*+]\s+/.test(line)
      );
      if (allBulleted) {
        return lines.map((line) => line.replace(/^\s*[-*+]\s+/, ""));
      }
      return lines.map((line) => {
        if (!line.trim()) return line;
        const cleaned = line
          .replace(/^\s*\d+\.\s+/, "")
          .replace(/^\s*[-*+]\s+\[( |x|X)\]\s+/, "");
        return `- ${cleaned.trimStart()}`;
      });
    });
  };

  const toggleOrderedList = () => {
    applyLineTransform((lines) => {
      const allOrdered = lines.every(
        (line) => !line.trim() || /^\s*\d+\.\s+/.test(line)
      );
      if (allOrdered) {
        return lines.map((line) => line.replace(/^\s*\d+\.\s+/, ""));
      }
      let counter = 1;
      return lines.map((line) => {
        if (!line.trim()) return line;
        const cleaned = line
          .replace(/^\s*[-*+]\s+/, "")
          .replace(/^\s*\d+\.\s+/, "");
        return `${counter++}. ${cleaned.trimStart()}`;
      });
    });
  };

  const toggleTaskList = () => {
    applyLineTransform((lines) => {
      const taskRe = /^\s*[-*+]\s+\[( |x|X)\]\s+/;
      const allTasks = lines.every((line) => !line.trim() || taskRe.test(line));
      if (allTasks) {
        // turn tasks into normal bullet list
        return lines.map((line) =>
          line.replace(/^\s*([-*+])\s+\[( |x|X)\]\s+/, "$1 ")
        );
      }
      // turn into tasks
      return lines.map((line) => {
        if (!line.trim()) return line;
        const bulletMatch = line.match(/^\s*[-*+]\s+(.*)$/);
        const text = bulletMatch ? bulletMatch[1] : line.trim();
        return `- [ ] ${text}`;
      });
    });
  };

  const toggleBlockquote = () => {
    applyLineTransform((lines) => {
      const allQuoted = lines.every(
        (line) => !line.trim() || /^\s*> ?/.test(line)
      );
      return lines.map((line) => {
        if (!line.trim()) return line;
        if (allQuoted) {
          return line.replace(/^\s*> ?/, "");
        }
        return `> ${line.replace(/^\s*> ?/, "")}`;
      });
    });
  };

  const insertCodeBlock = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart == null || selectionEnd == null) return;

    const lang = window.prompt("Language (optional, e.g. ts, js):", "") || "";
    const selected = value.slice(selectionStart, selectionEnd) || "code";

    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);

    const info = lang.trim();
    const block = `\n\`\`\`${info}\n${selected}\n\`\`\`\n`;

    const next = before + block + after;
    updateValue(next);

    const pos = before.length + block.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  };

  const insertHorizontalRule = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart == null || selectionEnd == null) return;

    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);

    const prefix = before.endsWith("\n") || !before ? "" : "\n\n";
    const suffix = after.startsWith("\n") || !after ? "\n\n" : "\n\n";

    const snip = `${prefix}---${suffix}`;
    const next = before + snip + after;
    updateValue(next);

    const pos = before.length + snip.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  };

  // ---- Insert: link, image, table, TOC, footnote, abbreviation -------------

  const insertLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart == null || selectionEnd == null) return;

    const url = window.prompt("Enter URL:", "https://")?.trim();
    if (!url) return;

    const selected = value.slice(selectionStart, selectionEnd) || "link text";
    const md = `[${selected}](${url})`;

    const next =
      value.slice(0, selectionStart) + md + value.slice(selectionEnd);
    updateValue(next);

    const start = selectionStart + 1;
    const end = start + selected.length;

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  };

  const insertImage = () => {
    const alt = window.prompt("Alt text:", "Image") ?? "";
    if (alt === null) return;
    const url = window.prompt("Image URL:", "https://")?.trim();
    if (!url) return;
    insertAtCursor(`![${alt}](${url})`);
  };

  const insertTable = () => {
    const table =
      "\n\n| Column 1 | Column 2 |\n" +
      "| -------- | -------- |\n" +
      "| Cell 1   | Cell 2   |\n" +
      "| Cell 3   | Cell 4   |\n\n";
    insertAtCursor(table);
  };

  const insertToc = () => {
    insertAtCursor("[toc]\n\n");
  };

  const insertFootnote = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const id = window.prompt("Footnote id (e.g. 1, note):", "1");
    if (!id) return;
    const text = window.prompt("Footnote text:", "Footnote text") ?? "";

    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart == null || selectionEnd == null) return;

    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);

    const ref = `[^${id}]`;
    const definition = `\n\n[^${id}]: ${text}\n`;

    const next = before + ref + after + definition;
    updateValue(next);

    const pos = before.length + ref.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  };

  const insertAbbreviation = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const abbr = window.prompt("Abbreviation (e.g. HTML):", "HTML");
    if (!abbr) return;
    const title =
      window.prompt("Full text:", "HyperText Markup Language") ?? "";

    const { selectionStart, selectionEnd } = textarea;
    if (selectionStart == null || selectionEnd == null) return;

    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);

    const snippet = abbr;
    const def = `\n\n*[${abbr}]: ${title}\n`;

    const next = before + snippet + after + def;
    updateValue(next);

    const start = before.length;
    const end = start + snippet.length;

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    });
  };

  // ---- Extra helpers: issue, mention, emoji shortcode ----------------------

  const insertIssueReference = () => {
    const num = window.prompt("Issue / PR number:", "123")?.trim();
    if (!num) return;
    insertAtCursor(`#${num}`);
  };

  const insertMention = () => {
    const user = window.prompt("Username (without @):", "username")?.trim();
    if (!user) return;
    insertAtCursor(`@${user}`);
  };

  const insertEmojiShortcode = () => {
    const code = window
      .prompt("Emoji shortcode (e.g. smile, grin, joy):", "smile")
      ?.trim();
    if (!code) return;
    insertAtCursor(`:${code}:`);
  };

  // ---- UI (toolbar: single row, horizontal scroll hidden via Tailwind) -----

  return (
    <div className="flex h-full w-full flex-col gap-2">
      {/* Toolbar: no wrap, horizontal scroll, scrollbar visually hidden */}
      <div className="rounded-md border bg-muted/40 text-xs overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex flex-nowrap items-center gap-1 px-2 py-1">
          {/* Block type */}
          <div className="inline-flex overflow-hidden rounded border bg-background">
            <button
              type="button"
              onClick={setParagraph}
              className="px-2 py-1 text-xs hover:bg-muted border-r"
            >
              P
            </button>
            <button
              type="button"
              onClick={() => setHeading(1)}
              className="px-2 py-1 text-xs hover:bg-muted border-r"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => setHeading(2)}
              className="px-2 py-1 text-xs hover:bg-muted border-r"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => setHeading(3)}
              className="px-2 py-1 text-xs hover:bg-muted"
            >
              H3
            </button>
          </div>

          <span className="mx-1 h-4 w-px bg-border" />

          {/* Inline styles */}
          <div className="inline-flex overflow-hidden rounded border bg-background">
            <button
              type="button"
              onClick={makeBold}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              B
            </button>
            <button
              type="button"
              onClick={makeItalic}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              I
            </button>
            <button
              type="button"
              onClick={makeUnderline}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              U
            </button>
            <button
              type="button"
              onClick={makeStrike}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              S
            </button>
            <button
              type="button"
              onClick={makeInlineCode}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              {"</>"}
            </button>
            <button
              type="button"
              onClick={makeHighlight}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              HL
            </button>
            <button
              type="button"
              onClick={setColor}
              className="px-2 py-1 hover:bg-muted"
            >
              Color
            </button>
          </div>

          <span className="mx-1 h-4 w-px bg-border" />

          {/* Lists & block-level */}
          <div className="inline-flex overflow-hidden rounded border bg-background">
            <button
              type="button"
              onClick={toggleBulletList}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              • List
            </button>
            <button
              type="button"
              onClick={toggleOrderedList}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              1. List
            </button>
            <button
              type="button"
              onClick={toggleTaskList}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              [ ] Task
            </button>
            <button
              type="button"
              onClick={toggleBlockquote}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              &gt; Quote
            </button>
            <button
              type="button"
              onClick={insertCodeBlock}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              Code
            </button>
            <button
              type="button"
              onClick={insertHorizontalRule}
              className="px-2 py-1 hover:bg-muted"
            >
              HR
            </button>
          </div>

          <span className="mx-1 h-4 w-px bg-border" />

          {/* Insert: link, image, table, TOC, footnote, abbreviation */}
          <div className="inline-flex overflow-hidden rounded border bg-background">
            <button
              type="button"
              onClick={insertLink}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              Link
            </button>
            <button
              type="button"
              onClick={insertImage}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              Img
            </button>
            <button
              type="button"
              onClick={insertTable}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              Tbl
            </button>
            <button
              type="button"
              onClick={insertFootnote}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              Fn
            </button>
            <button
              type="button"
              onClick={insertToc}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              TOC
            </button>
            <button
              type="button"
              onClick={insertAbbreviation}
              className="px-2 py-1 hover:bg-muted"
            >
              Abbr
            </button>
          </div>

          <span className="mx-1 h-4 w-px bg-border" />

          {/* Extra syntax: issue, mention, emoji */}
          <div className="inline-flex overflow-hidden rounded border bg-background">
            <button
              type="button"
              onClick={insertIssueReference}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              #123
            </button>
            <button
              type="button"
              onClick={insertMention}
              className="px-2 py-1 hover:bg-muted border-r"
            >
              @user
            </button>
            <button
              type="button"
              onClick={insertEmojiShortcode}
              className="px-2 py-1 hover:bg-muted"
            >
              :smile:
            </button>
          </div>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className="flex min-h-[300px] flex-1 rounded-md border">
        <div className="flex w-1/2 flex-col border-r">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => updateValue(e.target.value)}
            className="h-full w-full resize-none bg-background p-2 text-sm font-mono outline-none"
            placeholder="Write Markdown here..."
          />
        </div>
        <div className="w-1/2 overflow-auto p-2">
          <MDFormatting text={value} />
        </div>
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      <div className="w-full max-w-4xl space-y-4">
        <MarkdownEditor />
      </div>
    </main>
  );
}
