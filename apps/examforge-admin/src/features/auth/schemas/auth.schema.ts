import { z } from "zod"

export const signinSchema = z.object({
	email: z.email("Enter a valid email address."),
	password: z.string().min(1, "Password is required."),
})

export const authUserSchema = z.object({
	id: z.uuid(),
	email: z.email(),
	displayName: z.string().nullable(),
	role: z.number().int(),
})

export type SigninFormValues = z.infer<typeof signinSchema>
