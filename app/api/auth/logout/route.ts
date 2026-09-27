import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  jar.delete(COOKIE);
  return NextResponse.redirect(new URL("/login", process.env.APP_URL), { status: 303 });
}
