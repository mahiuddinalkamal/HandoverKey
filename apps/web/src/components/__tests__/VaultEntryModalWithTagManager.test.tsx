import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VaultEntryModalWithTagManager from "../VaultEntryModalWithTagManager";
import { vaultApi } from "../../services/vault";

// Mock the vault API
jest.mock("../../services/vault", () => ({
  vaultApi: {
    createEntry: jest.fn(),
    updateEntry: jest.fn(),
  },
}));

// Mock crypto.getRandomValues
Object.defineProperty(globalThis, "crypto", {
  value: {
    getRandomValues: jest.fn(() => new Uint8Array(16)),
  },
});

describe("VaultEntryModalWithTagManager", () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockExistingTags = ["work", "personal", "urgent"];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with TagManager component", () => {
    render(
      <VaultEntryModalWithTagManager
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingTags={mockExistingTags}
      />,
    );

    expect(screen.getByText("Create New Entry")).toBeInTheDocument();
    expect(screen.getByLabelText("Tag input")).toBeInTheDocument();
    expect(screen.getByText(/Press Enter to add/)).toBeInTheDocument();
  });

  it("allows adding tags using TagManager", async () => {
    const user = userEvent.setup();
    render(
      <VaultEntryModalWithTagManager
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingTags={mockExistingTags}
      />,
    );

    const tagInput = screen.getByLabelText("Tag input");
    await user.type(tagInput, "newtag");
    await user.keyboard("{Enter}");

    expect(screen.getByText("newtag")).toBeInTheDocument();
  });

  it("shows autocomplete suggestions from existing tags", async () => {
    const user = userEvent.setup();
    render(
      <VaultEntryModalWithTagManager
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingTags={mockExistingTags}
      />,
    );

    const tagInput = screen.getByLabelText("Tag input");
    await user.type(tagInput, "w");

    expect(screen.getByRole("option", { name: "work" })).toBeInTheDocument();
  });

  it("includes tags when creating entry", async () => {
    const user = userEvent.setup();
    (vaultApi.createEntry as jest.Mock).mockResolvedValue({});

    render(
      <VaultEntryModalWithTagManager
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingTags={mockExistingTags}
      />,
    );

    // Add some data
    const dataTextarea = screen.getByPlaceholderText(
      /Enter your sensitive data/,
    );
    await user.type(dataTextarea, "test data");

    // Add tags
    const tagInput = screen.getByLabelText("Tag input");
    await user.type(tagInput, "tag1");
    await user.keyboard("{Enter}");
    await user.type(tagInput, "tag2");
    await user.keyboard("{Enter}");

    // Submit form
    const submitButton = screen.getByText("Create Entry");
    await user.click(submitButton);

    await waitFor(() => {
      expect(vaultApi.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["tag1", "tag2"],
        }),
      );
    });
  });

  it("respects max tags limit", async () => {
    const user = userEvent.setup();
    render(
      <VaultEntryModalWithTagManager
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingTags={mockExistingTags}
      />,
    );

    const tagInput = screen.getByLabelText("Tag input");

    // Add 10 tags (the max limit)
    for (let i = 1; i <= 10; i++) {
      await user.type(tagInput, `tag${i}`);
      await user.keyboard("{Enter}");
    }

    // Input should be disabled after reaching max
    expect(tagInput).toBeDisabled();
    expect(screen.getByText(/10\/10 tags used\./)).toBeInTheDocument();
  });

  it("loads existing tags when editing entry", () => {
    const mockEntry = {
      id: "test-id",
      encryptedData: "encrypted",
      iv: "iv",
      algorithm: "AES-256-GCM",
      category: "passwords",
      tags: ["existing1", "existing2"],
      version: 1,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    render(
      <VaultEntryModalWithTagManager
        entry={mockEntry}
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingTags={mockExistingTags}
      />,
    );

    expect(screen.getByText("Edit Entry")).toBeInTheDocument();
    expect(screen.getByText("existing1")).toBeInTheDocument();
    expect(screen.getByText("existing2")).toBeInTheDocument();
  });
});
