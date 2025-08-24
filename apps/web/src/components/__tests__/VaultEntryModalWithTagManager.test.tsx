import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VaultEntryModalWithTagManager from "../VaultEntryModalWithTagManager";
import { vaultApi } from "../../services/vault";
import * as encryptionService from "../../services/encryption";

// Mock the vault API
jest.mock("../../services/vault", () => ({
  vaultApi: {
    createEntry: jest.fn(),
    updateEntry: jest.fn(),
  },
}));

// Mock the encryption service
jest.mock("../../services/encryption", () => ({
  encryptData: jest.fn(),
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
  const mockEncryptData = encryptionService.encryptData as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock for encryption
    mockEncryptData.mockResolvedValue({
      encryptedData: "mock-encrypted-data",
      iv: "mock-iv",
      salt: "mock-salt",
      algorithm: "AES-256-GCM",
    });
  });

  it("renders with TagManager component and password field", () => {
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
    expect(
      screen.getByPlaceholderText("Enter password for encryption"),
    ).toBeInTheDocument();
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

  it("includes tags when creating entry with proper encryption", async () => {
    const user = userEvent.setup();
    (vaultApi.createEntry as any).mockResolvedValue({});

    render(
      <VaultEntryModalWithTagManager
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingTags={mockExistingTags}
      />,
    );

    // Add password for encryption
    const passwordInput = screen.getByPlaceholderText(
      "Enter password for encryption",
    );
    await user.type(passwordInput, "testpassword123");

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
      expect(mockEncryptData).toHaveBeenCalledWith(
        "test data",
        "testpassword123",
      );
      expect(vaultApi.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptedData: "mock-encrypted-data",
          iv: "mock-iv",
          salt: "mock-salt",
          algorithm: "AES-256-GCM",
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

  it("prevents submission when password is missing", async () => {
    const user = userEvent.setup();
    render(
      <VaultEntryModalWithTagManager
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingTags={mockExistingTags}
      />,
    );

    // Add data but no password
    const dataTextarea = screen.getByPlaceholderText(
      /Enter your sensitive data/,
    );
    await user.type(dataTextarea, "test data");

    // Submit form
    const submitButton = screen.getByText("Create Entry");
    await user.click(submitButton);

    // Wait a bit and verify that the API was not called
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockEncryptData).not.toHaveBeenCalled();
    expect(vaultApi.createEntry).not.toHaveBeenCalled();
  });

  it("loads existing tags when editing entry", () => {
    const mockEntry = {
      id: "test-id",
      encryptedData: "encrypted",
      iv: "iv",
      salt: "mock-salt",
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

  it("handles encryption errors gracefully", async () => {
    const user = userEvent.setup();
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockEncryptData.mockRejectedValue(new Error("Encryption failed"));

    render(
      <VaultEntryModalWithTagManager
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingTags={mockExistingTags}
      />,
    );

    // Add password and data
    const passwordInput = screen.getByPlaceholderText(
      "Enter password for encryption",
    );
    await user.type(passwordInput, "testpassword123");

    const dataTextarea = screen.getByPlaceholderText(
      /Enter your sensitive data/,
    );
    await user.type(dataTextarea, "test data");

    // Submit form
    const submitButton = screen.getByText("Create Entry");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Encryption failed")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
