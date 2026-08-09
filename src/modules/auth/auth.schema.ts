import { email, z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterUserInput = z.infer<typeof registerSchema>;
// basically telling typescript to put together the types from what has been defined above in zod

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginUserInput = z.infer<typeof loginSchema>;