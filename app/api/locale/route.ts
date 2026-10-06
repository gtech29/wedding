import { NextResponse } from "next/server";
import { sameOrigin, input, failure } from "@/lib/server/http";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await input(
      request,
      z.object({ locale: z.enum(["en", "es-MX"]) }).strict(),
    );
    const response = NextResponse.json({ ok: true });
    response.cookies.set("wedding-locale", body.locale, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 31536000,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
