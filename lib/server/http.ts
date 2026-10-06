import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url)
    .origin;
  if (
    !origin ||
    origin !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new HttpError(403, "invalid", "This request could not be accepted.");
  }
}

export async function input<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 16_384,
): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "invalid", "Send a JSON request.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new HttpError(400, "invalid", "Check the information and try again.");
  const decoder = new TextDecoder();
  let body = "";
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "invalid", "This request is too large.");
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  let decoded: unknown;
  try {
    decoded = JSON.parse(body);
  } catch {
    throw new HttpError(400, "invalid", "Check the information and try again.");
  }
  const result = schema.safeParse(decoded);
  if (!result.success)
    throw new HttpError(400, "invalid", "Check the information and try again.");
  return result.data;
}

export function failure(error: unknown) {
  if (error instanceof HttpError) {
    const response = json(
      { error: error.message, code: error.code },
      error.status,
    );
    if (error.status === 429) response.headers.set("Retry-After", "900");
    return response;
  }
  // Never send SQL errors, guest details, credentials, or authentication internals to clients.
  return json(
    {
      error: "This service is temporarily unavailable. Please try again later.",
      code: "unavailable",
    },
    503,
  );
}

export function deadline() {
  const value = process.env.RSVP_DEADLINE;
  if (!value) return null;
  if (
    !/(Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error("INVALID_DEADLINE");
  return new Date(value).toISOString();
}
