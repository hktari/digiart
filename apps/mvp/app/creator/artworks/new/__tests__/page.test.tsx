import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CreatorArtworkNewPage from "../page";

describe("CreatorArtworkNewPage", () => {
  it("renders file drop zone in idle state", () => {
    render(<CreatorArtworkNewPage />);

    expect(screen.getByText(/drag & drop or/i)).toBeInTheDocument();
    expect(screen.getByText(/browse/i)).toBeInTheDocument();
  });

  it("renders title input as controlled component", async () => {
    const user = userEvent.setup();
    render(<CreatorArtworkNewPage />);

    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toHaveValue("");

    await user.type(titleInput, "My Artwork");
    expect(titleInput).toHaveValue("My Artwork");
  });

  it("submit button is disabled without file and title", () => {
    render(<CreatorArtworkNewPage />);

    const submitButton = screen.getByRole("button", {
      name: /upload artwork/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it("submit button is disabled with only title", async () => {
    const user = userEvent.setup();
    render(<CreatorArtworkNewPage />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "My Artwork");

    const submitButton = screen.getByRole("button", {
      name: /upload artwork/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it("renders error banner when status is error", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({
            error: "INVALID_FORMAT",
            message: "Only JPEG and PNG files are accepted.",
          }),
      }),
    ) as unknown as typeof fetch;

    render(<CreatorArtworkNewPage />);

    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const input = screen.getByRole("button", {
      name: /drag & drop or browse/i,
    });

    await user.click(input);

    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      await user.upload(fileInput as HTMLInputElement, file);
    }

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Test");

    const submitButton = screen.getByRole("button", {
      name: /upload artwork/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/INVALID FORMAT/i)).toBeInTheDocument();
    });
  });

  it("file input accepts jpeg and png only", () => {
    render(<CreatorArtworkNewPage />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute("accept", "image/jpeg,image/png");
  });
});
