import { NextResponse } from "next/server"

/**
 * Lightweight, dependency-free request helpers shared across API routes.
 * Used to validate request bodies server-side and to return consistent
 * error responses without leaking internal error details to clients.
 */

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

/** 400 - the client sent a malformed or missing body field */
export function badRequest(message = "Invalid request body") {
  return NextResponse.json({ error: message, errorCode: "BAD_REQUEST" }, { status: 400 })
}

/** 403 - authenticated but not allowed to act on this resource */
export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message, errorCode: "FORBIDDEN" }, { status: 403 })
}

/** 500 - unexpected server error. Logs details server-side, returns a generic message */
export function serverError(error: unknown) {
  console.error(error)
  return NextResponse.json(
    { error: "Internal server error", errorCode: "INTERNAL_ERROR" },
    { status: 500 }
  )
}
