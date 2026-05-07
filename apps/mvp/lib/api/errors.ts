import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Standardized API error response structure
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  requestId: string;
  code?: string;
  details?: unknown;
}

/**
 * Custom API error class with structured metadata
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON(requestId: string): ApiErrorResponse {
    return {
      error: this.code,
      message: this.message,
      requestId,
      details: this.details,
    };
  }
}

// Predefined error types for common scenarios
export const Errors = {
  UNAUTHORIZED: (message = "Unauthorized") =>
    new ApiError("UNAUTHORIZED", message, 401),
  FORBIDDEN: (message = "Forbidden") => new ApiError("FORBIDDEN", message, 403),
  NOT_FOUND: (resource = "Resource") =>
    new ApiError("NOT_FOUND", `${resource} not found`, 404),
  BAD_REQUEST: (message: string, details?: unknown) =>
    new ApiError("BAD_REQUEST", message, 400, details),
  VALIDATION_ERROR: (message: string, details?: unknown) =>
    new ApiError("VALIDATION_ERROR", message, 422, details),
  INTERNAL_ERROR: (message = "Internal server error") =>
    new ApiError("INTERNAL_ERROR", message, 500),
  EXTERNAL_API_ERROR: (service: string, message: string) =>
    new ApiError("EXTERNAL_API_ERROR", `${service} API error: ${message}`, 502),
  DATABASE_ERROR: (message = "Database operation failed") =>
    new ApiError("DATABASE_ERROR", message, 500),
};

/**
 * Generate unique request ID for tracing errors across logs
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Standardized error response handler
 */
export function handleApiError(
  error: unknown,
  requestId: string,
  context?: Record<string, unknown>,
): NextResponse<ApiErrorResponse> {
  // Log all errors with request ID for correlation
  if (error instanceof ApiError) {
    logger.error(`[${requestId}] API Error: ${error.code}`, error, {
      ...context,
      statusCode: error.statusCode,
    });
    return NextResponse.json(error.toJSON(requestId), {
      status: error.statusCode,
    });
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    logger.error(`[${requestId}] Unexpected error`, error, context);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: error.message,
        requestId,
      },
      { status: 500 },
    );
  }

  // Handle unknown errors
  logger.error(`[${requestId}] Unknown error`, { error, ...context });
  return NextResponse.json(
    {
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      requestId,
    },
    { status: 500 },
  );
}

/**
 * Type for async route handler functions
 */
export type RouteHandler<T = unknown> = (
  request: Request,
  context?: { params: Promise<Record<string, string>> },
) => Promise<NextResponse<T>>;

/**
 * Wraps a route handler with standardized error handling and request ID tracing
 *
 * Usage:
 * ```typescript
 * export const POST = withErrorHandler(async (request) => {
 *   const data = await request.json();
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withErrorHandler<T>(
  handler: RouteHandler<T>,
  options?: {
    requireAuth?: boolean;
    context?: Record<string, unknown>;
  },
): RouteHandler<T | ApiErrorResponse> {
  return async (request, context) => {
    const requestId = generateRequestId();

    // Add request ID to headers for tracing
    const headers = new Headers();
    headers.set("X-Request-Id", requestId);

    try {
      // Log request start
      logger.info(`[${requestId}] ${request.method} ${request.url}`, {
        requestId,
        method: request.method,
        url: request.url,
        ...options?.context,
      });

      const result = await handler(request, context);

      // Add request ID to response headers
      result.headers.set("X-Request-Id", requestId);

      return result;
    } catch (error) {
      return handleApiError(error, requestId, options?.context) as NextResponse<
        T | ApiErrorResponse
      >;
    }
  };
}
