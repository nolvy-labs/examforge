import { describe, expect, it } from "vitest"

import {
	RICH_TEXT_PERSISTENCE_MARKER,
} from "@/components/common/rich-text.contract"
import {
	renderRichTextHtml,
	richTextToPlainText,
} from "@/components/common/rich-text-renderer"

function documentFor(content: string) {
	const html = renderRichTextHtml(content)
	expect(html).not.toBeNull()
	const container = document.createElement("div")
	container.innerHTML = html ?? ""
	return container
}

describe("Admin/Study persisted rich-text structure", () => {
	it("preserves canonical block, inline, list, quote, rule, code, and table elements", () => {
		const document = documentFor(`${RICH_TEXT_PERSISTENCE_MARKER}
			<h2>Heading two</h2><h3>Heading three</h3>
			<p>Text<br><strong>bold</strong><em>emphasis</em><u>underline</u><s>strike</s><code>inline()</code></p>
			<ul><li>unordered</li></ul><ol><li>ordered</li></ol>
			<blockquote>quoted</blockquote><hr><pre><code>const safe = true</code></pre>
			<table><colgroup><col></colgroup><thead><tr><th colspan="2" rowspan="1" colwidth="120">Head</th></tr></thead>
			<tbody><tr><td colspan="1" rowspan="2" colwidth="80">Cell</td></tr></tbody></table>
		`)

		for (const selector of [
			"h2", "h3", "p", "br", "strong", "em", "u", "s", "ul", "ol", "li",
			"blockquote", "hr", "pre code", "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td",
		]) {
			expect(document.querySelector(selector), selector).not.toBeNull()
		}
		const header = document.querySelector("th")
		expect(header).toHaveAttribute("colspan", "2")
		expect(header).toHaveAttribute("rowspan", "1")
		expect(header).toHaveAttribute("colwidth", "120")
		const cell = document.querySelector("td")
		expect(cell).toHaveAttribute("colspan", "1")
		expect(cell).toHaveAttribute("rowspan", "2")
		expect(cell).toHaveAttribute("colwidth", "80")
		expect(document.innerHTML).not.toContain("examforge-rich:v1")
	})
})

describe("rich-text XSS policy", () => {
	it("removes unsafe elements and executable attributes nested in allowed markup", () => {
		const document = documentFor(`
			<p onclick="alert(1)" style="background:url(javascript:alert(1))" data-unknown="payload">
				Safe <strong onmouseover="alert(2)">bold<script>alert(3)</script></strong>
				<iframe src="https://evil.example"></iframe><object data="bad"></object><embed src="bad">
				<img src=x onerror="alert(4)">
			</p>
		`)

		expect(document.querySelectorAll("script,iframe,object,embed,img")).toHaveLength(0)
		expect(document.querySelector("[onclick],[onmouseover],[onerror],[style],[data-unknown]")).toBeNull()
		expect(document.textContent).toContain("Safe bold")
		expect(document.textContent).not.toContain("alert(3)")
	})

	it.each([
		["javascript:alert(1)", "javascript"],
		["JaVaScRiPt:alert(1)", "mixed-case javascript"],
		["java\nscript:alert(1)", "whitespace-obfuscated javascript"],
		["data:text/html,<script>alert(1)</script>", "data URL"],
		["http://example.com", "HTTP URL"],
		["//example.com/path", "protocol-relative URL"],
		["/relative/path", "relative URL"],
		["not a url", "malformed URL"],
		["https://[invalid", "invalid HTTPS URL"],
	] as const)("neutralizes a %s link", (...[href]) => {
		const document = documentFor(`<p><a href="${href}" target="evil" rel="opener">unsafe</a></p>`)
		const link = document.querySelector("a")
		expect(link).not.toBeNull()
		expect(link).not.toHaveAttribute("href")
		expect(link).not.toHaveAttribute("target")
		expect(link).not.toHaveAttribute("rel")
	})

	it("preserves a valid HTTPS link and replaces unsafe target and rel", () => {
		const document = documentFor('<p><a href="https://example.com/path?q=1" target="_self" rel="opener">safe</a></p>')
		const link = document.querySelector("a")

		expect(link).toHaveAttribute("href", "https://example.com/path?q=1")
		expect(link).toHaveAttribute("target", "_blank")
		expect(link).toHaveAttribute("rel", "noopener noreferrer")
	})

	it("preserves mailto without external-tab attributes", () => {
		const document = documentFor('<p><a href="mailto:study@example.com" target="_blank" rel="opener">Email</a></p>')
		const link = document.querySelector("a")

		expect(link).toHaveAttribute("href", "mailto:study@example.com")
		expect(link).not.toHaveAttribute("target")
		expect(link).not.toHaveAttribute("rel")
	})

	it("turns an empty href into an inactive anchor", () => {
		const document = documentFor('<p><a href="   ">Empty</a></p>')
		expect(document.querySelector("a")).not.toHaveAttribute("href")
	})

	it("cannot escape executable attributes through malicious data-latex", () => {
		const document = documentFor(
			'<span data-type="inline-math" data-latex="x&amp;quot; onmouseover=&amp;quot;alert(1)"></span>'
		)
		const wrapper = document.querySelector('[data-type="inline-math"]')

		expect(wrapper).not.toBeNull()
		expect(wrapper).not.toHaveAttribute("onmouseover")
		expect(document.querySelector("[onclick],[onerror],[onload]")).toBeNull()
		expect(wrapper?.getAttribute("style")).toBeNull()
	})
})

describe("semantic emptiness", () => {
	it.each([
		null,
		undefined,
		"",
		"   \n\t ",
		"<p></p>",
		"<p><br><br></p>",
		"<p>\u200B\u200C\u200D\uFEFF</p>",
		"<script>alert(1)</script><iframe></iframe><img src=x>",
	])("returns null for semantically empty content %j", (content) => {
		expect(renderRichTextHtml(content)).toBeNull()
	})

	it.each([
		["text", "<p>Meaningful</p>"],
		["table", "<table><tbody><tr><td></td></tr></tbody></table>"],
		["horizontal rule", "<hr>"],
		["code block", "<pre><code></code></pre>"],
		["inline math", '<span data-type="inline-math" data-latex="x"></span>'],
		["block math", '<div data-type="block-math" data-latex="x"></div>'],
	] as const)("retains meaningful %s content", (_label, content) => {
		expect(renderRichTextHtml(content)).not.toBeNull()
	})
})

describe("richTextToPlainText", () => {
	it.each([null, undefined, ""])("returns empty text for %j", (content) => {
		expect(richTextToPlainText(content)).toBe("")
	})

	it("extracts nested formatting, headings, paragraphs, and lists", () => {
		expect(richTextToPlainText(
			"<h2>Heading</h2><p>Nested <strong>bold <em>text</em></strong></p><ul><li>One</li><li>Two</li></ul>"
		)).toBe("Heading Nested bold text One Two")
	})

	it("decodes entities and normalizes repeated and zero-width whitespace", () => {
		expect(richTextToPlainText("<p>A&nbsp;&amp;&nbsp;B\u200B</p>\n<p>  C   D </p>")).toBe("A & B C D")
	})

	it("preserves inline and block LaTeX as readable source", () => {
		expect(richTextToPlainText(
			'<p>Inline <span data-type="inline-math" data-latex="x^2"></span></p><div data-type="block-math" data-latex="\\frac{1}{2}"></div>'
		)).toBe("Inline x^2 \\frac{1}{2}")
	})

	it("excludes scripts and unsafe markup and leaves no raw HTML", () => {
		const text = richTextToPlainText("<p>Safe <script>alert(1)</script><strong>text</strong><img src=x></p>")
		expect(text).toBe("Safe text")
		expect(text).not.toMatch(/[<>]/)
	})

	it("keeps table cells readable", () => {
		expect(richTextToPlainText(
			"<table><thead><tr><th>Name</th><th>Score</th></tr></thead><tbody><tr><td>Lan</td><td>10</td></tr></tbody></table>"
		)).toBe("Name Score Lan 10")
	})
})
