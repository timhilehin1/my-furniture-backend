import { NotFoundError } from "../../errors/not-found-error.js";
import { prisma } from "../../lib/prisma.js";
import type { ProfileInput } from "./profile.schema.js";

export async function getUserProfile(data: ProfileInput) {
    const existingUser = await prisma.user.findUnique({
        where:{
            id:data.id
        }
    })
    return {...existingUser, password: undefined};
}