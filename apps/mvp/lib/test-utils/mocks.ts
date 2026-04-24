/**
 * Mock utilities for testing
 */

/**
 * Mock Peecho API responses
 */
export const mockPeechoOfferings = [
  {
    id: "peecho-offering-1",
    name: "Softcover Booklet A5",
    min_pages: 20,
    max_pages: 100,
    width_mm: 148,
    height_mm: 210,
  },
  {
    id: "peecho-offering-2",
    name: "Softcover Booklet A4",
    min_pages: 20,
    max_pages: 100,
    width_mm: 210,
    height_mm: 297,
  },
];

export const mockPeechoQuote = {
  offering_id: "peecho-offering-1",
  page_count: 30,
  country: "US",
  product_amount: 12.5,
  shipping_amount: 5.0,
  tax_amount: 1.75,
  total_amount: 19.25,
  currency: "USD",
};

/**
 * Mock Peecho client for unit tests
 */
export function createMockPeechoClient() {
  return {
    getOfferings: vi.fn().mockResolvedValue(mockPeechoOfferings),
    getQuote: vi.fn().mockResolvedValue(mockPeechoQuote),
  };
}

/**
 * Mock auth session
 */
export function createMockSession(overrides?: {
  userId?: string;
  email?: string;
  roles?: string[];
}) {
  return {
    user: {
      id: overrides?.userId || "test-user-1",
      email: overrides?.email || "test@example.com",
      roles: overrides?.roles || ["CREATOR"],
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Mock admin session
 */
export function createMockAdminSession() {
  return createMockSession({
    userId: "admin-user-1",
    email: "admin@example.com",
    roles: ["ADMIN"],
  });
}

/**
 * Mock database responses
 */
export function createMockDbResponse<T>(data: T) {
  return Promise.resolve(data);
}

/**
 * Mock fetch response
 */
export function createMockFetchResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

/**
 * Mock Next.js redirect
 */
export function createMockRedirect() {
  return vi.fn((path: string) => {
    throw new Error(`REDIRECT: ${path}`);
  });
}

/**
 * Mock Next.js revalidatePath
 */
export function createMockRevalidatePath() {
  return vi.fn();
}
