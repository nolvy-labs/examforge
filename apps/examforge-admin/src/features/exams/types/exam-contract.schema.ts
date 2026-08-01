import { z } from "zod"

export const apiUuidSchema = z.uuid()
export const apiDateTimeSchema = z.iso.datetime({ offset: true })
export const apiNonnegativeIntegerSchema = z.number().int().nonnegative().safe()
export const apiPositiveIntegerSchema = z.number().int().positive().safe()
export const apiNonnegativeNumberSchema = z.number().finite().nonnegative()

export const paginationMetaSchema = z
	.strictObject({
		page: apiPositiveIntegerSchema,
		pageSize: apiPositiveIntegerSchema,
		totalItems: apiNonnegativeIntegerSchema,
		totalPages: apiNonnegativeIntegerSchema,
		hasPreviousPage: z.boolean(),
		hasNextPage: z.boolean(),
	})
	.superRefine((meta, context) => {
		const expectedPages =
			meta.totalItems === 0 ? 0 : Math.ceil(meta.totalItems / meta.pageSize)

		if (meta.totalPages !== expectedPages) {
			context.addIssue({
				code: "custom",
				message: "totalPages is inconsistent with totalItems and pageSize",
				path: ["totalPages"],
			})
		}

		if (meta.hasPreviousPage !== (meta.page > 1)) {
			context.addIssue({
				code: "custom",
				message: "hasPreviousPage is inconsistent with page",
				path: ["hasPreviousPage"],
			})
		}

		if (meta.hasNextPage !== (meta.page < meta.totalPages)) {
			context.addIssue({
				code: "custom",
				message: "hasNextPage is inconsistent with page and totalPages",
				path: ["hasNextPage"],
			})
		}
	})

export function collectionResponseSchema<T extends z.ZodType>(itemSchema: T) {
	return z.strictObject({
		items: z.array(itemSchema),
		meta: paginationMetaSchema,
	})
}
