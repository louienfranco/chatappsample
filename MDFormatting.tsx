# Markdown Feature Demo

[toc]

---

## 1. Headings & Paragraphs

This is a normal paragraph with some **bold**, *italic*, ***bold + italic***, and ~~strikethrough~~ text.

Inline `code` also works, plus ==highlighted text== for emphasis.

Multiple  
manual  
line breaks (each newline will show as its own line).

---

## 2. Links, Images, and Autolinks

Inline link: [OpenAI](https://openai.com "OpenAI Homepage")

Reference-style link: [Markdown Guide][md-guide]

Inline image:

![Sample Image](https://via.placeholder.com/120 "Inline image")

Reference-style image:

![Logo][logo]

Autolink URL: https://example.com

Autolink URL in angle brackets: <https://example.com/docs>

Autolink email: support@example.com and <hello@example.com>

---

## 3. Lists (Bulleted, Numbered, Task, Nested)

### Bulleted list

- First bullet
- Second bullet with *italic* text
- Third bullet

### Numbered list

1. First item
2. Second item
3. Third item

### Task list

- [ ] Incomplete task
- [x] Completed task
- [ ] Another task

### Nested lists

- Parent item A
  - Child item A.1
  - Child item A.2
    - Grandchild item A.2.a
- Parent item B
  1. Nested ordered item B.1
  2. Nested ordered item B.2

---

## 4. Blockquotes

> This is a simple blockquote.
>
> It can span multiple lines and include **inline formatting**.

> Nested elements:
>
> - Bullet inside quote
> - Another bullet
>
> 1. Ordered inside quote
> 2. Second ordered

---

## 5. Code Blocks

Fenced code block with language:

~~~ts
function greet(name: string) {
  console.log(`Hello, ${name}!`);
}
greet("World");
~~~

Indented code block (4 spaces):

    const answer = 42;
    console.log(answer);

---

## 6. Horizontal Rules

Above and below this line should be horizontal rules.

---

More text after the rule.

---

## 7. Tables

| Feature      | Supported | Notes                          |
|-------------|:---------:|-------------------------------:|
| Headings    |   Yes     | H1–H6 with custom classes      |
| Lists       |   Yes     | Nested, ordered, tasks         |
| Tables      |   Yes     | With alignment left/center/right |
| Footnotes   |   Yes     | See example below[^footnote]   |

Another small table:

| Left | Center | Right |
|:-----|:------:|------:|
| a    |   b    |     c |
| 1    |   2    |     3 |

---

## 8. Footnotes

Here is a sentence with a footnote reference.[^footnote]

And another one with a second note.[^another-note]

---

## 9. Abbreviations & Definition Lists

Using abbreviations: HTML and CSS are both widely used.

Definition list:

Term One : The first term in a definition list.
Term Two : Another term, with **formatted** description.

---

## 10. Colors, Emoji, Mentions, Issues, Commits

[color=red]This text is red (named color).[/color]

[color=#ff00aa]This text uses a hex color.[/color]

Shortcodes for emoji: :smile: :grin: :tada: :rocket: :fire:

Mentions and issues:

- Mention: @alice and @bob
- Issue reference: #123, #4567

Commit hash detection:

- Short hash: 1a2b3c4
- Longer hash: a1b2c3d4e5f6a7b8c9d0e1

---

## 11. TOC Example

The `[toc]` directive at the top of this document should have rendered a
table of contents with links to each heading.

---

## 12. HTML Blocks and Comments

<!-- This is an HTML comment and should not be visible in the output -->

<div class="custom-block">
  This is a raw HTML block. It should pass through as-is.
</div>

You can also inline HTML like <span style="color: green;">this green text</span>.

---

## 13. Mixed Content Example

Here is a paragraph with many features:

[color=blue]Blue text[/color], some `inline code`, an issue reference #99,
a user mention @charlie, an emoji :joy:, and a small footnote marker.[^tiny]

Followed by a list:

- Item with a [link](https://example.org)
- Item with an abbreviation: HTML
- Item with a commit hash: deadbeefcafebabe

---

*[HTML]: HyperText Markup Language
*[CSS]: Cascading Style Sheets

[md-guide]: https://markdownguide.org "Markdown Guide"
[logo]: https://via.placeholder.com/80 "Reference-style image"

[^footnote]: This is a sample footnote demonstrating the footnote system.
[^another-note]: Another footnote, with **bold** text and a link to [OpenAI](https://openai.com).
[^tiny]: A tiny note just for demonstration.
