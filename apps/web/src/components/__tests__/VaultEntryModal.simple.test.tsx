import { render, screen } from "@testing-library/react";
import VaultEntryModal from "../VaultEntryModal";

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

// Don't mock TagManager - test with real component

describe("VaultEntryModal - Simple Test", () => {
  const defaultProps = {
    onClose: jest.fn(),
    onSave: jest.fn(),
    existingTags: ["work", "personal"],
  };

  it("renders without crashing", () => {
    render(<VaultEntryModal {...defaultProps} />);
    expect(screen.getByText("Create New Entry")).toBeInTheDocument();
  });
});
