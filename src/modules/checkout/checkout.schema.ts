import { z } from "zod";

export const checkoutSchema = z.object({
  shippingAddress: z.string().min(1, "Shipping address is required"),
  shippingCity: z.string().min(1, "Shipping city is required"),
  shippingState: z.string().min(1, "Shipping state is required"),
  shippingCountry: z.string().min(1, "Shipping country is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;