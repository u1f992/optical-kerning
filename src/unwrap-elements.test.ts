import { unwrapElements } from "./unwrap-elements.js";

import test from "node:test";
import assert from "node:assert";

import { JSDOM } from "jsdom";

test("unwrapElements", async (ctx) => {
  await ctx.test("basic case", () => {
    const jsdom = new JSDOM(`
<html>
  <body>
    <p>T<span class="unwrap">E</span>ST</p>
  </body>
</html>`);
    const { document } = jsdom.window;
    const p = document.querySelector("p")!;
    unwrapElements(p, (e) => e.classList.contains("unwrap"));
    assert.strictEqual(p.outerHTML, "<p>TEST</p>");
  });

  await ctx.test("multiple elements", () => {
    const jsdom = new JSDOM(`
<html>
  <body>
    <div>
      <span class="unwrap">Hello</span> <span class="unwrap">World</span>!
    </div>
  </body>
</html>`);
    const { document } = jsdom.window;
    const div = document.querySelector("div")!;
    unwrapElements(div, (e) => e.classList.contains("unwrap"));
    assert.strictEqual(
      div.innerHTML.replace(/\s+/g, " ").trim(),
      "Hello World!",
    );
  });

  await ctx.test("nested elements", () => {
    const jsdom = new JSDOM(`
<html>
  <body>
    <div>
      <span class="outer">Outer <span class="unwrap">Inner</span> Text</span>
    </div>
  </body>
</html>`);
    const { document } = jsdom.window;
    const div = document.querySelector("div")!;
    unwrapElements(div, (e) => e.classList.contains("unwrap"));
    assert.strictEqual(
      div.innerHTML.replace(/\s+/g, " ").trim(),
      '<span class="outer">Outer Inner Text</span>',
    );
  });

  await ctx.test("no elements to unwrap", () => {
    const jsdom = new JSDOM(`
<html>
  <body>
    <p>This is a text-only paragraph.</p>
  </body>
</html>`);
    const { document } = jsdom.window;
    const p = document.querySelector("p")!;
    const originalHTML = p.outerHTML;
    unwrapElements(p, (e) => e.classList.contains("unwrap"));
    assert.strictEqual(p.outerHTML, originalHTML);
  });

  await ctx.test("different element types", () => {
    const jsdom = new JSDOM(`
<html>
  <body>
    <article>
      <h1>Title</h1>
      <p>Text <a href="#" class="unwrap">Link</a> continues</p>
      <div class="unwrap">
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    </article>
  </body>
</html>`);
    const { document } = jsdom.window;
    const article = document.querySelector("article")!;
    unwrapElements(article, (e) => e.classList.contains("unwrap"));

    // Check that a tag was unwrapped
    assert.strictEqual(
      document.querySelector("p")!.innerHTML.replace(/\s+/g, " ").trim(),
      "Text Link continues",
    );

    // Check that div was unwrapped and ul is now direct child of article
    const ul = document.querySelector("ul")!;
    assert.strictEqual(ul.parentNode, article);
  });

  await ctx.test("different unwrap condition", () => {
    const jsdom = new JSDOM(`
<html>
  <body>
    <div>
      <span data-test="true">This is for testing</span>
      <span>Normal span</span><span data-test="true">!</span>
    </div>
  </body>
</html>`);
    const { document } = jsdom.window;
    const div = document.querySelector("div")!;
    unwrapElements(div, (e) => e.hasAttribute("data-test"));
    assert.strictEqual(
      div.innerHTML.replace(/\s+/g, " ").trim(),
      "This is for testing <span>Normal span</span>!",
    );
  });

  await ctx.test("empty elements", () => {
    const jsdom = new JSDOM(`
<html>
  <body>
    <div>
      before<span class="unwrap"></span>after
    </div>
  </body>
</html>`);
    const { document } = jsdom.window;
    const div = document.querySelector("div")!;
    unwrapElements(div, (e) => e.classList.contains("unwrap"));
    assert.strictEqual(
      div.innerHTML.replace(/\s+/g, " ").trim(),
      "beforeafter",
    );
  });

  await ctx.test("element without text nodes", () => {
    const jsdom = new JSDOM(`
<html>
  <body>
    <div>
      <span class="unwrap"><img src="test.jpg" alt="test"></span>
    </div>
  </body>
</html>`);
    const { document } = jsdom.window;
    const div = document.querySelector("div")!;
    unwrapElements(div, (e) => e.classList.contains("unwrap"));
    assert.strictEqual(
      div.innerHTML.replace(/\s+/g, " ").trim(),
      '<img src="test.jpg" alt="test">',
    );
  });
});
