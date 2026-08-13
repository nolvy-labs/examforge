import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
	RichTextRenderer,
	renderRichTextHtml,
} from "@/components/common/rich-text-renderer"
import { RICH_TEXT_PERSISTENCE_MARKER } from "@/components/common/rich-text.contract"

function parsed(content: string) {
	const html = renderRichTextHtml(content)
	expect(html).not.toBeNull()
	const container = document.createElement("div")
	container.innerHTML = html ?? ""
	return container
}

describe("mathematical rich text", () => {
	it("renders canonical inline and block math with stable wrappers and MathML", () => {
		const document = parsed(
			'<p>Inline <span data-type="inline-math" data-latex="x^2"></span></p><div data-type="block-math" data-latex="\\frac{1}{2}"></div>'
		)
		const inline = document.querySelector('[data-type="inline-math"]')
		const block = document.querySelector('[data-type="block-math"]')

		expect(inline?.tagName).toBe("SPAN")
		expect(inline).toHaveClass("tiptap-mathematics-render", "rich-text-inline-math")
		expect(inline).toHaveAttribute("data-latex", "x^2")
		expect(inline?.querySelector("math")).not.toBeNull()
		expect(inline?.querySelector("math")?.getAttribute("display")).not.toBe("block")

		expect(block?.tagName).toBe("DIV")
		expect(block).toHaveClass("tiptap-mathematics-render", "rich-text-block-math")
		expect(block).toHaveAttribute("data-latex", "\\frac{1}{2}")
		expect(block?.querySelector('math[display="block"]')).not.toBeNull()
	})

	it("removes the persistence marker and decodes HTML entities before KaTeX", () => {
		const document = parsed(
			`${RICH_TEXT_PERSISTENCE_MARKER}<span data-type="inline-math" data-latex="x &lt; y"></span>`
		)
		const wrapper = document.querySelector('[data-type="inline-math"]')

		expect(wrapper).toHaveAttribute("data-latex", "x < y")
		expect(wrapper?.querySelector("math")).not.toBeNull()
		expect(document.innerHTML).not.toContain("examforge-rich:v1")
	})

	it("does not throw for invalid or unusual LaTeX", () => {
		expect(() => renderRichTextHtml(
			'<span data-type="inline-math" data-latex="\\notARealCommand{"></span>'
		)).not.toThrow()
		expect(renderRichTextHtml(
			'<span data-type="inline-math" data-latex="\\notARealCommand{"></span>'
		)).not.toBeNull()
	})

	it("keeps KaTeX trust disabled and strips noncanonical executable attributes", () => {
		const document = parsed(`
			<span data-type="inline-math" data-latex="\\href{javascript:alert(1)}{click}" onclick="alert(2)" style="color:red"></span>
			<span data-type="wrong-math" data-latex="x" onmouseover="alert(3)"></span>
			<div data-type="inline-math" data-latex="x" onload="alert(4)"></div>
		`)

		expect(document.querySelector('[href^="javascript:"], [onclick], [onmouseover], [onload]')).toBeNull()
		expect(document.querySelector('[data-type="wrong-math"]')).toBeNull()
		expect(document.querySelector('div[data-type="inline-math"]')).toBeNull()
	})
})

describe("RichTextRenderer", () => {
	it("renders no DOM for semantically empty input", () => {
		const { container } = render(<RichTextRenderer content="<p><br></p>" />)
		expect(container).toBeEmptyDOMElement()
	})

	it("renders a public root class, merges a supplied class, and emits sanitized HTML", () => {
		const { container } = render(
			<RichTextRenderer
				content='<p onclick="alert(1)">Safe <strong>content</strong></p>'
				className="consumer-class"
			/>
		)
		const root = container.firstElementChild

		expect(root).toHaveClass("rich-text-renderer", "consumer-class")
		expect(screen.getByText("content")).toHaveProperty("tagName", "STRONG")
		expect(root?.querySelector("[onclick]")).toBeNull()
	})

	it("renders meaningful math through KaTeX", () => {
		const { container } = render(
			<RichTextRenderer content='<span data-type="inline-math" data-latex="x+1"></span>' />
		)

		expect(container.querySelector('.rich-text-inline-math[data-type="inline-math"] math')).not.toBeNull()
	})

	it("updates sanitized DOM when rerendered with different content", () => {
		const view = render(<RichTextRenderer content="<p>First unique content</p>" />)
		expect(screen.getByText("First unique content")).toBeInTheDocument()

		view.rerender(<RichTextRenderer content="<h2>Second unique content</h2>" />)

		expect(screen.queryByText("First unique content")).not.toBeInTheDocument()
		expect(screen.getByRole("heading", { level: 2, name: "Second unique content" })).toBeInTheDocument()
	})
})
