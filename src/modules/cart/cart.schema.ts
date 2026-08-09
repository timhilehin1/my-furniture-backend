import { z } from "zod";
export const addcartSchema = z.object({
    productId:z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive().optional(),

})

export const updateCartSchema = z.object({
      quantity: z.number({ message: "Quantity is required" }).int().positive(),
})

export const cartParamsSchema = z.object({
  productId:z.string().min(1, "Product ID is required"),
})

//types generated from schema
export type CartInput = z.infer<typeof addcartSchema>
export type CartParams = z.infer<typeof cartParamsSchema>