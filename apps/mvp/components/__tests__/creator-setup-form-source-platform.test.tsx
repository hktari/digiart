import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreatorSetupForm } from "../creator-setup-form";

// Mock the server actions
vi.mock("@/lib/actions/creator", () => ({
  checkSlugAvailability: vi.fn(),
  saveCreatorProfile: vi.fn().mockResolvedValue({ success: true }),
}));

describe("CreatorSetupForm - Source Platform & Share Step", () => {
  const renderForm = (
    initialData?: Parameters<typeof CreatorSetupForm>[0]["initialData"],
  ) => {
    return render(<CreatorSetupForm initialData={initialData} />);
  };

  describe("source platforms field", () => {
    it("renders source platform buttons on profile step", () => {
      renderForm();

      expect(
        screen.getByText(/Where do you currently share your art/i),
      ).toBeInTheDocument();
    });

    it("includes expected platform buttons", () => {
      renderForm();

      // Check for platform buttons
      expect(
        screen.getByRole("button", { name: /ArtStation/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /DeviantArt/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Instagram/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Midjourney/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Leonardo.ai/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /SeaArt/i }),
      ).toBeInTheDocument();
    });

    it("allows selecting multiple platforms", async () => {
      renderForm();

      const artstationBtn = screen.getByRole("button", { name: /ArtStation/i });
      const midjourneyBtn = screen.getByRole("button", { name: /Midjourney/i });

      await userEvent.click(artstationBtn);
      await userEvent.click(midjourneyBtn);

      // Buttons should have selected styling (fuchsia background)
      expect(artstationBtn).toHaveClass("bg-fuchsia-600");
      expect(midjourneyBtn).toHaveClass("bg-fuchsia-600");
    });

    it("allows deselecting a platform", async () => {
      renderForm();

      const artstationBtn = screen.getByRole("button", { name: /ArtStation/i });

      await userEvent.click(artstationBtn);
      expect(artstationBtn).toHaveClass("bg-fuchsia-600");

      await userEvent.click(artstationBtn);
      // Should no longer have fuchsia background
      expect(artstationBtn).not.toHaveClass("bg-fuchsia-600");
    });

    it("pre-fills source platforms when provided in initialData", () => {
      renderForm({
        displayName: "Test Artist",
        slug: "test-artist",
        sourcePlatforms: ["instagram", "midjourney"],
      });

      const instagramBtn = screen.getByRole("button", { name: /Instagram/i });
      const midjourneyBtn = screen.getByRole("button", { name: /Midjourney/i });

      expect(instagramBtn).toHaveClass("bg-fuchsia-600");
      expect(midjourneyBtn).toHaveClass("bg-fuchsia-600");
    });
  });

  describe("payout step validation", () => {
    it("validates PayPal email format", async () => {
      renderForm();

      // Fill profile step
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      // Enter invalid email
      await waitFor(() => {
        expect(screen.getByLabelText(/PayPal Email/i)).toBeInTheDocument();
      });

      await userEvent.type(
        screen.getByLabelText(/PayPal Email/i),
        "invalid-email",
      );
      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      expect(
        screen.getByText(/Please enter a valid PayPal email address/i),
      ).toBeInTheDocument();
    });

    it("accepts valid PayPal email", async () => {
      renderForm();

      // Fill profile step
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      // Enter valid email
      await waitFor(() => {
        expect(screen.getByLabelText(/PayPal Email/i)).toBeInTheDocument();
      });

      await userEvent.type(
        screen.getByLabelText(/PayPal Email/i),
        "artist@example.com",
      );
      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      await waitFor(() => {
        expect(
          screen.queryByText(/Please enter a valid email address/i),
        ).not.toBeInTheDocument();
      });
    });

    it("allows empty PayPal email (optional field)", async () => {
      renderForm();

      // Fill profile step
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      // Leave PayPal email empty
      await waitFor(() => {
        expect(screen.getByLabelText(/PayPal Email/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      await waitFor(() => {
        expect(
          screen.queryByText(/Please enter a valid email address/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("share step", () => {
    it("shows share step after review", async () => {
      renderForm();

      // Fill profile step
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      // Skip payout step
      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      // Click Continue to go to artwork step
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^Continue$/i }),
        ).toBeInTheDocument();
      });
      await userEvent.click(
        screen.getByRole("button", { name: /^Continue$/i }),
      );

      // Skip artwork step
      await waitFor(() => {
        expect(screen.getByText(/Uploaded Artworks/i)).toBeInTheDocument();
      });
      await userEvent.click(
        screen.getByRole("button", { name: /Skip for now/i }),
      );

      // Verify share step content
      await waitFor(() => {
        expect(screen.getByText(/You're all set!/i)).toBeInTheDocument();
        expect(screen.getByText(/Your Profile Link/i)).toBeInTheDocument();
      });
    });

    it("displays profile link on share step", async () => {
      renderForm();

      // Fill profile step
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(screen.getByLabelText(/Profile Slug/i), "my-slug");
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      // Skip payout
      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      // Go to artwork step
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^Continue$/i }),
        ).toBeInTheDocument();
      });
      await userEvent.click(
        screen.getByRole("button", { name: /^Continue$/i }),
      );

      // Skip artwork step to go to share
      await waitFor(() => {
        expect(screen.getByText(/Uploaded Artworks/i)).toBeInTheDocument();
      });
      await userEvent.click(
        screen.getByRole("button", { name: /Skip for now/i }),
      );

      // Check profile link
      await waitFor(() => {
        const linkInput = screen.getByDisplayValue(/creators\/my-slug/i);
        expect(linkInput).toBeInTheDocument();
      });
    });

    it("has social sharing buttons on share step", async () => {
      renderForm();

      // Navigate to share step
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^Continue$/i }),
        ).toBeInTheDocument();
      });
      await userEvent.click(
        screen.getByRole("button", { name: /^Continue$/i }),
      );

      // Skip artwork step
      await waitFor(() => {
        expect(screen.getByText(/Uploaded Artworks/i)).toBeInTheDocument();
      });
      await userEvent.click(
        screen.getByRole("button", { name: /Skip for now/i }),
      );

      // Check for social sharing links
      await waitFor(() => {
        expect(screen.getByText(/Share on Twitter\/X/i)).toBeInTheDocument();
        expect(screen.getByText(/Share on Facebook/i)).toBeInTheDocument();
      });
    });

    it("has final submit button on share step", async () => {
      renderForm();

      // Navigate to share step
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^Continue$/i }),
        ).toBeInTheDocument();
      });
      await userEvent.click(
        screen.getByRole("button", { name: /^Continue$/i }),
      );

      // Skip artwork step
      await waitFor(() => {
        expect(screen.getByText(/Uploaded Artworks/i)).toBeInTheDocument();
      });
      await userEvent.click(
        screen.getByRole("button", { name: /Skip for now/i }),
      );

      // Check for final submit button
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Go to Dashboard/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("review step", () => {
    it("displays source platforms in review if selected", async () => {
      renderForm();

      // Fill profile step with source platforms
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(screen.getByRole("button", { name: /Instagram/i }));
      await userEvent.click(
        screen.getByRole("button", { name: /Midjourney/i }),
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      // Skip payout
      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });
      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      // Check review shows platforms
      await waitFor(() => {
        expect(screen.getByText(/Current Platforms/i)).toBeInTheDocument();
        expect(screen.getByText(/Instagram, Midjourney/i)).toBeInTheDocument();
      });
    });
  });
});
