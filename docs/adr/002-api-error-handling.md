# ADR-002: Standardized API Error Handling

## Status

Proposed

## Context

Our Next.js App Router API endpoints have inconsistent error handling patterns:

1. **Missing try-catch blocks**: Many routes lack error handling around external API calls (Stripe, S3, Peecho, BullMQ)
2. **Generic error swallowing**: Admin routes catch all errors as "Unauthorized", masking actual issues
3. **Empty error responses**: Unhandled exceptions return empty 500 responses, causing JSON.parse errors in clients
4. **No request tracing**: Impossible to correlate client errors with server logs

### Examples of Current Issues

```typescript
// BAD: No error handling - unhandled exceptions return empty 500
export async function POST(request: Request) {
  const session = await auth();
  const customer = await stripe.customers.create({...}); // Can throw
  return NextResponse.json({ customerId: customer.id });
}

// BAD: Generic error swallowing - loses debugging info
try {
  await requireAdmin();
  const data = await db.query();
  return NextResponse.json(data);
} catch (_error) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

## Decision

We will implement a standardized error handling approach using:

1. **`withErrorHandler` wrapper**: Wraps route handlers to catch all errors
2. **`ApiError` class**: Structured errors with codes, messages, and HTTP status
3. **Request ID tracing**: Every request gets a unique ID for log correlation
4. **Consistent response format**: All errors return `{ error, message, requestId }`

## Solution

### 1. Error Handler Utility (`lib/api/errors.ts`)

```typescript
import { withErrorHandler, ApiError, Errors } from "@/lib/api/errors";

// Usage: Wrap your route handler
export const POST = withErrorHandler(async (request) => {
  const data = await request.json();
  // All errors are automatically caught and formatted
  return NextResponse.json({ success: true });
});
```

### 2. Structured Error Responses

All errors return a consistent JSON structure:

```json
{
  "error": "EXTERNAL_API_ERROR",
  "message": "Stripe API error: Invalid customer ID",
  "requestId": "lh8x2j3k-9a2b4c",
  "details": { "customerId": "cus_123" }
}
```

### 3. Request ID Tracing

- Every request gets a unique ID in the `X-Request-Id` header
- All logs include `[requestId]` for easy filtering
- Client errors show the request ID for support tickets

### 4. Predefined Error Types

```typescript
// Use predefined errors for consistency
throw Errors.UNAUTHORIZED();
throw Errors.NOT_FOUND("Collector profile");
throw Errors.VALIDATION_ERROR("Invalid page count", { pageCount: 0 });
throw Errors.EXTERNAL_API_ERROR("Peecho", "Order creation failed");
```

## Migration Strategy

### Phase 1: Critical Endpoints (Immediate)

Apply `withErrorHandler` to all endpoints with external API calls:

- [ ] `api/collector/setup-intent/route.ts` (Stripe)
- [ ] `api/collector/confirm-payment-method/route.ts` (Stripe)
- [ ] `api/collector/create-order/route.ts` (Peecho - already fixed)
- [ ] `api/artworks/presign/route.ts` (S3)
- [ ] `api/fulfillment/generate-booklet/route.ts` (BullMQ)

### Phase 2: Admin Endpoints

Fix generic error swallowing in admin routes:

- [ ] `api/admin/cycles/route.ts`
- [ ] `api/admin/booklet-constraints/route.ts`
- [ ] `api/admin/booklet-constraints/[id]/route.ts`
- [ ] `api/admin/cycles/[id]/route.ts`

### Phase 3: Remaining Endpoints

Apply to all remaining routes for consistency.

## Examples

### Basic Usage

```typescript
import { NextResponse } from "next/server";
import { withErrorHandler, Errors } from "@/lib/api/errors";
import { auth } from "@/lib/auth";

export const GET = withErrorHandler(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    throw Errors.UNAUTHORIZED();
  }

  const data = await fetchExternalData(); // If this throws, it's handled
  return NextResponse.json(data);
});
```

### With Validation

```typescript
import { z } from "zod";
import { withErrorHandler, Errors } from "@/lib/api/errors";

const schema = z.object({ email: z.string().email() });

export const POST = withErrorHandler(async (request) => {
  const body = await request.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    throw Errors.VALIDATION_ERROR("Invalid input", result.error.errors);
  }

  return NextResponse.json({ success: true });
});
```

### With External API Calls

```typescript
import { withErrorHandler, Errors } from "@/lib/api/errors";
import { stripe } from "@/lib/billing/stripe-client";

export const POST = withErrorHandler(async (request) => {
  try {
    const customer = await stripe.customers.create({ email });
    return NextResponse.json({ customerId: customer.id });
  } catch (stripeError) {
    // Convert Stripe errors to our format
    throw Errors.EXTERNAL_API_ERROR(
      "Stripe",
      stripeError instanceof Error ? stripeError.message : "Unknown error"
    );
  }
});
```

### Admin Routes (No Generic Swallowing)

```typescript
import { withErrorHandler, Errors } from "@/lib/api/errors";
import { requireAdmin } from "@/lib/roles";

export const GET = withErrorHandler(async (request) => {
  // requireAdmin throws specific errors, not caught as generic 401
  await requireAdmin();

  try {
    const cycles = await db.subscriptionCycle.findMany();
    return NextResponse.json(cycles);
  } catch (dbError) {
    throw Errors.DATABASE_ERROR("Failed to fetch cycles");
  }
});
```

## Benefits

1. **Client Experience**: Consistent error format, request IDs for support
2. **Debugging**: Full error details in server logs with request correlation
3. **Developer Experience**: Less boilerplate, clear patterns
4. **Monitoring**: Structured error codes for alerting (e.g., alert on `EXTERNAL_API_ERROR`)
5. **No Empty Responses**: All errors return valid JSON

## Consequences

- **Positive**: Consistent, debuggable, monitorable error handling
- **Positive**: Reduced boilerplate with wrapper function
- **Negative**: One-time migration effort for existing routes
- **Negative**: Slightly more complex type signatures for handlers

## References

- Implementation: `lib/api/errors.ts`
- Related: ADR-001 (Storage Backend Selection)
