import type {
	BuilderDocument,
	BuilderEntityId,
	BuilderEntityKind,
	PersistedEntityId,
	TemporaryEntityId,
} from "./builder.types"

const SERVER_PREFIX = "server:"
const TEMPORARY_PREFIX = "tmp:"

export function toPersistedEntityId(serverId: string): PersistedEntityId {
	return `${SERVER_PREFIX}${serverId}`
}

export function getServerId(id: BuilderEntityId): string | null {
	return isPersistedEntityId(id) ? id.slice(SERVER_PREFIX.length) : null
}

export function isPersistedEntityId(
	id: BuilderEntityId | string
): id is PersistedEntityId {
	return id.startsWith(SERVER_PREFIX)
}

export function isTemporaryEntityId(
	id: BuilderEntityId | string
): id is TemporaryEntityId {
	return id.startsWith(TEMPORARY_PREFIX)
}

export function createTemporaryEntityId(
	kind: BuilderEntityKind,
	uuid = crypto.randomUUID()
): TemporaryEntityId {
	return `tmp:${kind}:${uuid}`
}

export function getBuilderEntity(
	document: BuilderDocument,
	id: BuilderEntityId
) {
	return (
		document.sectionsById[id] ??
		document.questionsById[id] ??
		document.optionsById[id] ??
		document.answerKeysById[id] ??
		null
	)
}
