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

  it("file input accepts jpeg and png only", () => {
    render(<CreatorArtworkNewPage />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute("accept", "image/jpeg,image/png");
  });

  it("upload button is not visible without queued files", () => {
    render(<CreatorArtworkNewPage />);

    expect(
      screen.queryByRole("button", { name: /upload \d+ file/i }),
    ).not.toBeInTheDocument();
  });

  it("shows queued file and upload button after file selection", async () => {
    const user = userEvent.setup();
    render(<CreatorArtworkNewPage />);

    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(screen.getByText("test.jpg")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /upload 1 file/i }),
    ).toBeInTheDocument();
  });

  it("shows per-file error message when upload fails", async () => {
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
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(fileInput, file);

    const uploadButton = screen.getByRole("button", {
      name: /upload 1 file/i,
    });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText(/only jpeg and png files are accepted/i),
      ).toBeInTheDocument();
    });
  });
});
