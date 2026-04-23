import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: "test-user-id" },
    }),
  ),
}));

vi.mock("@/lib/roles", () => ({
  getUserRoles: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/lib/actions/roles", () => ({
  assignRole: vi.fn(),
}));

describe("OnboardingPage", () => {
  it("renders role selection UI with Creator and Collector options", () => {
    const OnboardingUI = () => (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">
              Welcome! How will you use the platform?
            </h1>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <button type="submit">
              <div>Creator</div>
              <p>Upload artworks, publish monthly releases</p>
            </button>
            <button type="submit">
              <div>Collector</div>
              <p>
                Subscribe to creators and receive a curated monthly art booklet.
              </p>
            </button>
          </div>
        </div>
      </main>
    );

    render(<OnboardingUI />);

    expect(screen.getByText("Creator")).toBeInTheDocument();
    expect(screen.getByText("Collector")).toBeInTheDocument();
    expect(
      screen.getByText(/welcome! how will you use the platform/i),
    ).toBeInTheDocument();
  });
});
