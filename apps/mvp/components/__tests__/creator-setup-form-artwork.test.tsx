import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreatorSetupForm } from "../creator-setup-form";

// Mock the server actions
vi.mock("@/lib/actions/creator", () => ({
  checkSlugAvailability: vi.fn(),
  saveCreatorProfile: vi.fn().mockResolvedValue({ success: true }),
}));

describe("CreatorSetupForm - Artwork Upload Step", () => {
  const renderForm = (
    initialData?: Parameters<typeof CreatorSetupForm>[0]["initialData"],
  ) => {
    return render(<CreatorSetupForm initialData={initialData} />);
  };

  const navigateToArtworkStep = async () => {
    // Fill profile step
    await userEvent.type(screen.getByLabelText(/Display Name/i), "Test Artist");
    await userEvent.type(screen.getByLabelText(/Profile Slug/i), "test-artist");
    await userEvent.click(
      screen.getByRole("button", { name: /Continue to Payout Settings/i }),
    );

    // Skip payout step
    await waitFor(() => {
      expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /Review/i }));

    // Go to artwork step from review
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^Continue$/i }),
      ).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /^Continue$/i }));
  };

  describe("artwork step rendering", () => {
    it("shows artwork step after review", async () => {
      renderForm();
      await navigateToArtworkStep();

      await waitFor(() => {
        expect(screen.getByText(/Uploaded Artworks/i)).toBeInTheDocument();
        expect(
          screen.getByText(/Upload at least 5 artworks/i),
        ).toBeInTheDocument();
      });
    });

    it("displays inline upload artwork button", async () => {
      renderForm();
      await navigateToArtworkStep();

      await waitFor(() => {
        const uploadButton = screen.getByRole("button", {
          name: /Upload Artwork/i,
        });
        expect(uploadButton).toBeInTheDocument();
      });
    });

    it("shows artwork count as 0 initially", async () => {
      renderForm();
      await navigateToArtworkStep();

      await waitFor(() => {
        expect(screen.getByText(/0 uploaded/i)).toBeInTheDocument();
        expect(screen.getByText(/5 recommended/i)).toBeInTheDocument();
      });
    });

    it("shows tip when less than 5 artworks uploaded", async () => {
      renderForm();
      await navigateToArtworkStep();

      await waitFor(() => {
        expect(
          screen.getByText(/Collectors are more likely to subscribe/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("artwork step navigation", () => {
    it("has back button that goes to review step", async () => {
      renderForm();
      await navigateToArtworkStep();

      await waitFor(() => {
        expect(screen.getByText(/Uploaded Artworks/i)).toBeInTheDocument();
      });

      const backButtons = screen.getAllByRole("button", { name: /Back/i });
      const artworkStepBackButton = backButtons[backButtons.length - 1];
      await userEvent.click(artworkStepBackButton);

      await waitFor(() => {
        // Should be back on review step
        expect(screen.getByText(/Display Name/i)).toBeInTheDocument();
        expect(screen.getByText(/Profile URL/i)).toBeInTheDocument();
      });
    });

    it("shows 'Skip for now' button when less than 5 artworks", async () => {
      renderForm();
      await navigateToArtworkStep();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Skip for now/i }),
        ).toBeInTheDocument();
      });
    });

    it("navigates to share step when clicking skip", async () => {
      renderForm();
      await navigateToArtworkStep();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Skip for now/i }),
        ).toBeInTheDocument();
      });

      await userEvent.click(
        screen.getByRole("button", { name: /Skip for now/i }),
      );

      await waitFor(() => {
        expect(screen.getByText(/You're all set!/i)).toBeInTheDocument();
        expect(screen.getByText(/Your Profile Link/i)).toBeInTheDocument();
      });
    });
  });

  describe("progress indicator", () => {
    it("shows all 5 steps including artwork", () => {
      renderForm();

      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Payout")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
      expect(screen.getByText("Artwork")).toBeInTheDocument();
      expect(screen.getByText("Share")).toBeInTheDocument();
    });
  });
});
