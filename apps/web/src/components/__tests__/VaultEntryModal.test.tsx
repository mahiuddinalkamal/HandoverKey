import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VaultEntryModal from "../VaultEntryModal";
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

// Mock TagManager component
jest.mock("../TagManager", () => {
  const MockTagManager = ({ tags, onChange, placeholder }: any) => (
    <div data-testid="tag-manager">
      <input
        data-testid="tag-input"
        placeholder={placeholder}
        onChange={(e) => {
          // Simulate adding a tag when Enter is pressed
          if (e.target.value) {
            onChange([...tags, e.target.value]);
          }
        }}
      />
      <div data-testid="tags-display">
        {tags.map((tag: string, index: number) => (
          <span key={index} data-testid={`tag-${tag}`}>
            {tag}
            <button
              onClick={() => onChange(tags.filter((t: string) => t !== tag))}
              data-testid={`remove-tag-${tag}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
  return MockTagManager;
});

const mockVaultApi = vaultApi as jest.Mocked<typeof vaultApi>;
const mockEncryptData = encryptionService.encryptData as jest.MockedFunction<
  typeof encryptionService.encryptData
>;

describe("VaultEntryModal", () => {
  const defaultProps = {
    onClose: jest.fn(),
    onSave: jest.fn(),
    existingTags: ["work", "personal", "important"],
  };

  // Mock console.error to suppress error logs during tests
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockEncryptData.mockResolvedValue({
      encryptedData: "encrypted-test-data",
      iv: "test-iv",
      salt: "test-salt",
      algorithm: "AES-256-GCM",
    });
  });

  describe("Rendering", () => {
    it("renders create modal correctly", () => {
      render(<VaultEntryModal {...defaultProps} />);

      expect(screen.getByText("Create New Entry")).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/data/i)).toBeInTheDocument();
      expect(screen.getByTestId("tag-manager")).toBeInTheDocument();
      expect(screen.getByLabelText(/encryption password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create entry/i }),
      ).toBeInTheDocument();
    });

    it("renders edit modal correctly", () => {
      const entry = {
        id: "test-id",
        category: "documents",
        tags: ["work", "important"],
        encryptedData: "encrypted",
        iv: "iv",
        algorithm: "AES-256-GCM",
        version: 1,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };

      render(<VaultEntryModal {...defaultProps} entry={entry} />);

      expect(screen.getByText("Edit Entry")).toBeInTheDocument();
      const categorySelect = screen.getByLabelText(/category/i);
      expect(categorySelect).toHaveValue("documents");
      expect(
        screen.getByRole("button", { name: /update entry/i }),
      ).toBeInTheDocument();
    });

    it("shows password toggle button", () => {
      render(<VaultEntryModal {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/encryption password/i);
      const toggleButton = screen.getByLabelText(/show password/i);

      expect(passwordInput).toHaveAttribute("type", "password");
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("shows validation errors for empty required fields", async () => {
      const user = userEvent.setup();
      render(<VaultEntryModal {...defaultProps} />);

      const submitButton = screen.getByRole("button", {
        name: /create entry/i,
      });
      await user.click(submitButton);

      expect(screen.getByText("Data is required")).toBeInTheDocument();
      expect(
        screen.getByText("Password is required for encryption"),
      ).toBeInTheDocument();
    });

    it("shows validation error for short password", async () => {
      const user = userEvent.setup();
      render(<VaultEntryModal {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/encryption password/i);
      const submitButton = screen.getByRole("button", {
        name: /create entry/i,
      });

      await user.type(passwordInput, "short");
      await user.click(submitButton);

      expect(
        screen.getByText("Password must be at least 8 characters long"),
      ).toBeInTheDocument();
    });

    it("clears validation errors when user starts typing", async () => {
      const user = userEvent.setup();
      render(<VaultEntryModal {...defaultProps} />);

      const dataTextarea = screen.getByLabelText(/data/i);
      const passwordInput = screen.getByLabelText(/encryption password/i);
      const submitButton = screen.getByRole("button", {
        name: /create entry/i,
      });

      // Trigger validation errors
      await user.click(submitButton);
      expect(screen.getByText("Data is required")).toBeInTheDocument();
      expect(
        screen.getByText("Password is required for encryption"),
      ).toBeInTheDocument();

      // Start typing to clear errors
      await user.type(dataTextarea, "test data");
      await user.type(passwordInput, "password123");

      expect(screen.queryByText("Data is required")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Password is required for encryption"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Password Visibility Toggle", () => {
    it("toggles password visibility", async () => {
      const user = userEvent.setup();
      render(<VaultEntryModal {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/encryption password/i);
      const toggleButton = screen.getByLabelText(/show password/i);

      expect(passwordInput).toHaveAttribute("type", "password");

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");
      expect(screen.getByLabelText(/hide password/i)).toBeInTheDocument();

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(screen.getByLabelText(/show password/i)).toBeInTheDocument();
    });
  });

  describe("Tag Management Integration", () => {
    it("integrates with TagManager component", () => {
      render(<VaultEntryModal {...defaultProps} />);

      const tagManager = screen.getByTestId("tag-manager");
      const tagInput = screen.getByTestId("tag-input");

      expect(tagManager).toBeInTheDocument();
      expect(tagInput).toHaveAttribute("placeholder", "Add a tag...");
    });

    it("passes existing tags as suggestions to TagManager", () => {
      render(
        <VaultEntryModal
          {...defaultProps}
          existingTags={["work", "personal"]}
        />,
      );

      // TagManager should receive suggestions prop
      expect(screen.getByTestId("tag-manager")).toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("creates new entry successfully", async () => {
      const user = userEvent.setup();
      mockVaultApi.createEntry.mockResolvedValue({
        id: "new-id",
        encryptedData: "encrypted",
        iv: "iv",
        algorithm: "AES-256-GCM",
        category: "passwords",
        tags: [],
        version: 1,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      });

      render(<VaultEntryModal {...defaultProps} />);

      const dataTextarea = screen.getByLabelText(/data/i);
      const passwordInput = screen.getByLabelText(/encryption password/i);
      const categorySelect = screen.getByLabelText(/category/i);
      const submitButton = screen.getByRole("button", {
        name: /create entry/i,
      });

      await user.type(dataTextarea, "test sensitive data");
      await user.type(passwordInput, "password123");
      await user.selectOptions(categorySelect, "passwords");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockEncryptData).toHaveBeenCalledWith(
          "test sensitive data",
          "password123",
        );
      });

      expect(mockVaultApi.createEntry).toHaveBeenCalledWith({
        encryptedData: "encrypted-test-data",
        iv: "test-iv",
        algorithm: "AES-256-GCM",
        category: "passwords",
        tags: [],
      });

      expect(
        screen.getByText("Entry created successfully!"),
      ).toBeInTheDocument();
    });

    it("updates existing entry successfully", async () => {
      const user = userEvent.setup();
      const entry = {
        id: "test-id",
        category: "documents",
        tags: ["work"],
        encryptedData: "encrypted",
        iv: "iv",
        algorithm: "AES-256-GCM",
        version: 1,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };

      mockVaultApi.updateEntry.mockResolvedValue({
        ...entry,
        version: 2,
        updatedAt: "2024-01-02",
      });

      render(<VaultEntryModal {...defaultProps} entry={entry} />);

      const dataTextarea = screen.getByLabelText(/data/i);
      const passwordInput = screen.getByLabelText(/encryption password/i);
      const submitButton = screen.getByRole("button", {
        name: /update entry/i,
      });

      await user.type(dataTextarea, "test sensitive data");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockEncryptData).toHaveBeenCalledWith(
          "test sensitive data",
          "password123",
        );
      });

      expect(mockVaultApi.updateEntry).toHaveBeenCalledWith("test-id", {
        encryptedData: "encrypted-test-data",
        iv: "test-iv",
        algorithm: "AES-256-GCM",
        category: "documents",
        tags: ["work"],
      });

      expect(
        screen.getByText("Entry updated successfully!"),
      ).toBeInTheDocument();
    });

    it("handles encryption errors", async () => {
      const user = userEvent.setup();
      mockEncryptData.mockRejectedValue(new Error("Encryption failed"));

      render(<VaultEntryModal {...defaultProps} />);

      const dataTextarea = screen.getByLabelText(/data/i);
      const passwordInput = screen.getByLabelText(/encryption password/i);
      const submitButton = screen.getByRole("button", {
        name: /create entry/i,
      });

      await user.type(dataTextarea, "test sensitive data");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Encryption failed")).toBeInTheDocument();
      });

      expect(mockVaultApi.createEntry).not.toHaveBeenCalled();
    });

    it("handles API errors", async () => {
      const user = userEvent.setup();
      mockVaultApi.createEntry.mockRejectedValue(new Error("API Error"));

      render(<VaultEntryModal {...defaultProps} />);

      const dataTextarea = screen.getByLabelText(/data/i);
      const passwordInput = screen.getByLabelText(/encryption password/i);
      const submitButton = screen.getByRole("button", {
        name: /create entry/i,
      });

      await user.type(dataTextarea, "test sensitive data");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("API Error")).toBeInTheDocument();
      });
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockVaultApi.createEntry.mockReturnValue(promise);

      render(<VaultEntryModal {...defaultProps} />);

      const dataTextarea = screen.getByLabelText(/data/i);
      const passwordInput = screen.getByLabelText(/encryption password/i);
      const submitButton = screen.getByRole("button", {
        name: /create entry/i,
      });

      await user.type(dataTextarea, "test sensitive data");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      expect(screen.getByText("Saving...")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      resolvePromise!({
        id: "new-id",
        encryptedData: "encrypted",
        iv: "iv",
        algorithm: "AES-256-GCM",
        category: "passwords",
        tags: [],
        version: 1,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      });

      await waitFor(() => {
        expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
      });
    });
  });

  describe("Modal Interactions", () => {
    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<VaultEntryModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<VaultEntryModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it("calls onSave after successful submission", async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      mockVaultApi.createEntry.mockResolvedValue({
        id: "new-id",
        encryptedData: "encrypted",
        iv: "iv",
        algorithm: "AES-256-GCM",
        category: "passwords",
        tags: [],
        version: 1,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      });

      render(<VaultEntryModal {...defaultProps} onSave={onSave} />);

      const dataTextarea = screen.getByLabelText(/data/i);
      const passwordInput = screen.getByLabelText(/encryption password/i);
      const submitButton = screen.getByRole("button", {
        name: /create entry/i,
      });

      await user.type(dataTextarea, "test sensitive data");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      // Wait for success message and then onSave call
      await waitFor(() => {
        expect(
          screen.getByText("Entry created successfully!"),
        ).toBeInTheDocument();
      });

      // Wait for the timeout that calls onSave
      await waitFor(
        () => {
          expect(onSave).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels and descriptions", () => {
      render(<VaultEntryModal {...defaultProps} />);

      const dataTextarea = screen.getByLabelText(/data/i);
      const passwordInput = screen.getByLabelText(/encryption password/i);

      expect(dataTextarea).toHaveAttribute("aria-describedby", "data-help");
      expect(passwordInput).toHaveAttribute(
        "aria-describedby",
        "password-help",
      );
    });

    it("shows ARIA error descriptions when validation fails", async () => {
      const user = userEvent.setup();
      render(<VaultEntryModal {...defaultProps} />);

      const submitButton = screen.getByRole("button", {
        name: /create entry/i,
      });
      await user.click(submitButton);

      const dataTextarea = screen.getByLabelText(/data/i);
      const passwordInput = screen.getByLabelText(/encryption password/i);

      expect(dataTextarea).toHaveAttribute("aria-describedby", "data-error");
      expect(passwordInput).toHaveAttribute(
        "aria-describedby",
        "password-error",
      );
    });

    it("has proper form structure with labels", () => {
      render(<VaultEntryModal {...defaultProps} />);

      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/data/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/encryption password/i)).toBeInTheDocument();
    });
  });

  describe("Security Features", () => {
    it("clears sensitive data after successful submission", async () => {
      const user = userEvent.setup();
      mockVaultApi.createEntry.mockResolvedValue({
        id: "new-id",
        encryptedData: "encrypted",
        iv: "iv",
        algorithm: "AES-256-GCM",
        category: "passwords",
        tags: [],
        version: 1,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      });

      render(<VaultEntryModal {...defaultProps} />);

      const dataTextarea = screen.getByLabelText(/data/i);
      const passwordInput = screen.getByLabelText(/encryption password/i);
      const submitButton = screen.getByRole("button", {
        name: /create entry/i,
      });

      await user.type(dataTextarea, "test sensitive data");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Entry created successfully!"),
        ).toBeInTheDocument();
      });

      // Check that sensitive fields are cleared
      expect(dataTextarea).toHaveValue("");
      expect(passwordInput).toHaveValue("");
    });

    it("does not display encrypted data in edit mode", () => {
      const entry = {
        id: "test-id",
        category: "documents",
        tags: ["work"],
        encryptedData: "encrypted-sensitive-data",
        iv: "iv",
        algorithm: "AES-256-GCM",
        version: 1,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };

      render(<VaultEntryModal {...defaultProps} entry={entry} />);

      const dataTextarea = screen.getByLabelText(/data/i);
      expect(dataTextarea).toHaveValue("");
      expect(dataTextarea).toHaveAttribute(
        "placeholder",
        "Enter new data to replace the existing encrypted data...",
      );
    });
  });
});
