import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

import matter from "gray-matter"

const registry = [
	"terms-v1.0.vi.md", "terms-v1.0.en.md",
	"privacy-v1.0.vi.md", "privacy-v1.0.en.md",
	"cookies-v1.0.vi.md", "cookies-v1.0.en.md",
]
const placeholderPattern = /\[[^\]\n]*(?:TÊN|ĐỊA CHỈ|EMAIL|XÁC NHẬN|CONFIRM|ADDRESS|OPERATOR|PROVIDER|COOKIE_NAME|COOKIE,|_KEY|_KEYS|TTL|LIFETIME|HOST\/LOAD)[^\]\n]*\]/giu
const contentDirectory = path.join(process.cwd(), "src", "content", "legal")
const unresolved = []

for (const fileName of registry) {
	const source = await readFile(path.join(contentDirectory, fileName), "utf8")
	const placeholders = [...new Set(matter(source).content.match(placeholderPattern) ?? [])]
	if (placeholders.length > 0) unresolved.push(`${fileName}: ${placeholders.join(", ")}`)
}

if (unresolved.length > 0) {
	throw new Error(`Legal content is not publishable. Resolve these placeholders before production build:\n${unresolved.join("\n")}`)
}
