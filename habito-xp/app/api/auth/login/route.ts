import { prisma } from "../../../../src/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Removi o ": Request" para o JavaScript não reclamar
export async function POST(request) { 
  try {
    const { email, password } = await request.json();

    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (user && password === "123456") {
      cookies().set("auth_token", user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });

  } catch (error) {
    return NextResponse.json({ error: "Erro de conexão com o servidor" }, { status: 500 });
  }
}