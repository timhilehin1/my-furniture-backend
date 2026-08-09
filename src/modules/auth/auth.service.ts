import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import type { LoginUserInput, RegisterUserInput } from "./auth.schema.js";
import { generateToken } from "../../services/jwt.service.js";
import { ConflictError } from "../../errors/conflict-error.js";
import { UnauthorizedError } from "../../errors/unauthorized-error.js";

export async function registerUser(data: RegisterUserInput) {
    const existingUser = await prisma.user.findUnique({
        where:{
            email:data.email
        }
    })
    if (existingUser) {
        throw new ConflictError("User with this email already exists");
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
        data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: hashedPassword,
        },
    });
    return  user
}

export async function loginUser(data:LoginUserInput) {
    const user = await prisma.user.findUnique({
        where:{
            email:data.email
        }
    })
    if (!user) {
        throw new UnauthorizedError("Invalid email or password");
    }
    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
        throw new UnauthorizedError("Invalid email or password");
    }
    const token = generateToken(user.id);
    return {
        accessToken:token,
        refreshToken:token,
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
    }
}