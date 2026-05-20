import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignInPage from "../page";

vi.mock("@/lib/actions/auth", () => ({
  sendMagicLink: vi.fn(),
}));

describe("SignInPage", () => {
  it("renders email input and submit button", async () => {
    const Component = await SignInPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send magic link/i }),
    ).toBeInTheDocument();
  });

  it("shows error banner when error param is present", async () => {
    const Component = await SignInPage({
      searchParams: Promise.resolve({ error: "invalid_email" }),
    });
    render(Component);

    expect(
      screen.getByText(/please enter a valid email address/i),
    ).toBeInTheDocument();
  });

  it("does not show error banner when no error param", async () => {
    const Component = await SignInPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(
      screen.queryByText(/please enter a valid email address/i),
    ).not.toBeInTheDocument();
  });
});
