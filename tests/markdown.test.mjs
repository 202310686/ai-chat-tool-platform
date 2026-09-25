import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

test("assistant Markdown renders code and tables without raw HTML", () => {
  const markdown = "```js\nconsole.log(1)\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n<script>alert(1)</script>";
  const html = renderToStaticMarkup(React.createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm],
  }, markdown));
  assert.match(html, /<pre><code class="language-js">/);
  assert.match(html, /<table>/);
  assert.doesNotMatch(html, /<script>/);
});
