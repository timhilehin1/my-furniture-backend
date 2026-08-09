import { email, z } from "zod";
export const profileSchema = z.object({
    id: z.string()
})

export type ProfileInput = z.infer<typeof profileSchema>;