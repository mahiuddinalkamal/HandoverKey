import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import VaultEntryCard from "../VaultEntryCard";
import { VaultEntry } from "../../services/vault";

const mockEntry: VaultEntry = {
  id: "test-entry-123",
  encryptedData: "encrypted-data",
  iv: "initialization-vector",
  algorithm: "AES-256-GCM",
  category: "passwords",
  tags: ["work", "email", "important"],
  version: 1,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
};

const mockProps = {
  entry: mockEntry,
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onTagClick: jest.fn(),
};

describe("VaultEntryCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders entry information correctly", () => {
      render(<VaultEntryCard {...mockProps} />);

      expect(screen.getByText("Passwords")).toBeInTheDocument();
      expect(screen.getByText("ID: test-ent...")).toBeInTheDocument();
      expect(screen.getByText("Version 1")).toBeInTheDocument();
      expect(screen.getByText("1/2/2024")).toBeInTheDocument();
      expect(screen.getByText("Created 1/1/2024")).toBeInTheDocument();
      expect(screen.getByText("AES-256-GCM")).toBeInTheDocument();
    });

    it("renders category icon correctly for passwords", () => {
      render(<VaultEntryCard {...mockProps} />);

      const categoryContainer = screen
        .getByText("Passwords")
        .closest("div")?.previousSibling;
      expect(categoryContainer).toHaveClass(
        "bg-red-50",
        "text-red-700",
        "border-red-200",
      );
    });

    it("renders category icon correctly for documents", () => {
      const documentEntry = { ...mockEntry, category: "documents" };
      render(<VaultEntryCard {...mockProps} entry={documentEntry} />);

      expect(screen.getByText("Documents")).toBeInTheDocument();
      const categoryContainer = screen
        .getByText("Documents")
        .closest("div")?.previousSibling;
      expect(categoryContainer).toHaveClass(
        "bg-blue-50",
        "text-blue-700",
        "border-blue-200",
      );
    });

    it("renders category icon correctly for notes", () => {
      const notesEntry = { ...mockEntry, category: "notes" };
      render(<VaultEntryCard {...mockProps} entry={notesEntry} />);

      expect(screen.getByText("Notes")).toBeInTheDocument();
      const categoryContainer = screen
        .getByText("Notes")
        .closest("div")?.previousSibling;
      expect(categoryContainer).toHaveClass(
        "bg-green-50",
        "text-green-700",
        "border-green-200",
      );
    });

    it("renders category icon correctly for keys", () => {
      const keysEntry = { ...mockEntry, category: "keys" };
      render(<VaultEntryCard {...mockProps} entry={keysEntry} />);

      expect(screen.getByText("Keys")).toBeInTheDocument();
      const categoryContainer = screen
        .getByText("Keys")
        .closest("div")?.previousSibling;
      expect(categoryContainer).toHaveClass(
        "bg-purple-50",
        "text-purple-700",
        "border-purple-200",
      );
    });

    it("renders category icon correctly for other", () => {
      const otherEntry = { ...mockEntry, category: "other" };
      render(<VaultEntryCard {...mockProps} entry={otherEntry} />);

      expect(screen.getByText("Other")).toBeInTheDocument();
      const categoryContainer = screen
        .getByText("Other")
        .closest("div")?.previousSibling;
      expect(categoryContainer).toHaveClass(
        "bg-orange-50",
        "text-orange-700",
        "border-orange-200",
      );
    });

    it("renders default category for unknown category", () => {
      const unknownEntry = { ...mockEntry, category: "unknown" };
      render(<VaultEntryCard {...mockProps} entry={unknownEntry} />);

      expect(screen.getByText("Unknown")).toBeInTheDocument();
      const categoryContainer = screen
        .getByText("Unknown")
        .closest("div")?.previousSibling;
      expect(categoryContainer).toHaveClass(
        "bg-gray-50",
        "text-gray-700",
        "border-gray-200",
      );
    });

    it('renders "Untitled" when no category is provided', () => {
      const noCategory = { ...mockEntry, category: undefined };
      render(<VaultEntryCard {...mockProps} entry={noCategory} />);

      expect(screen.getByText("Untitled")).toBeInTheDocument();
    });

    it("renders tags correctly", () => {
      render(<VaultEntryCard {...mockProps} />);

      expect(screen.getByText("work")).toBeInTheDocument();
      expect(screen.getByText("email")).toBeInTheDocument();
      expect(screen.getByText("important")).toBeInTheDocument();
    });

    it("shows tag overflow indicator when more than 3 tags", () => {
      const manyTagsEntry = {
        ...mockEntry,
        tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
      };
      render(<VaultEntryCard {...mockProps} entry={manyTagsEntry} />);

      expect(screen.getByText("tag1")).toBeInTheDocument();
      expect(screen.getByText("tag2")).toBeInTheDocument();
      expect(screen.getByText("tag3")).toBeInTheDocument();
      expect(screen.getByText("+2")).toBeInTheDocument();
      expect(screen.queryByText("tag4")).not.toBeInTheDocument();
    });

    it("does not render tags section when no tags", () => {
      const noTagsEntry = { ...mockEntry, tags: [] };
      render(<VaultEntryCard {...mockProps} entry={noTagsEntry} />);

      expect(screen.queryByTestId("tags-section")).not.toBeInTheDocument();
    });

    it("renders action buttons with proper accessibility labels", () => {
      render(<VaultEntryCard {...mockProps} />);

      expect(screen.getByLabelText("Edit entry")).toBeInTheDocument();
      expect(screen.getByLabelText("Delete entry")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("calls onEdit when edit button is clicked", () => {
      render(<VaultEntryCard {...mockProps} />);

      const editButton = screen.getByLabelText("Edit entry");
      fireEvent.click(editButton);

      expect(mockProps.onEdit).toHaveBeenCalledWith(mockEntry);
      expect(mockProps.onEdit).toHaveBeenCalledTimes(1);
    });

    it("calls onDelete when delete button is clicked", () => {
      render(<VaultEntryCard {...mockProps} />);

      const deleteButton = screen.getByLabelText("Delete entry");
      fireEvent.click(deleteButton);

      expect(mockProps.onDelete).toHaveBeenCalledWith(mockEntry.id);
      expect(mockProps.onDelete).toHaveBeenCalledTimes(1);
    });

    it("calls onTagClick when a tag is clicked", () => {
      render(<VaultEntryCard {...mockProps} />);

      const workTag = screen.getByText("work");
      fireEvent.click(workTag);

      expect(mockProps.onTagClick).toHaveBeenCalledWith("work");
      expect(mockProps.onTagClick).toHaveBeenCalledTimes(1);
    });

    it("calls onTagClick for different tags", () => {
      render(<VaultEntryCard {...mockProps} />);

      const emailTag = screen.getByText("email");
      fireEvent.click(emailTag);

      expect(mockProps.onTagClick).toHaveBeenCalledWith("email");
    });

    it("does not call onTagClick when onTagClick prop is not provided", () => {
      const propsWithoutTagClick = {
        entry: mockEntry,
        onEdit: jest.fn(),
        onDelete: jest.fn(),
      };
      render(<VaultEntryCard {...propsWithoutTagClick} />);

      const workTag = screen.getByText("work");
      fireEvent.click(workTag);

      // Should not throw error and should not call any function
      expect(propsWithoutTagClick.onEdit).not.toHaveBeenCalled();
      expect(propsWithoutTagClick.onDelete).not.toHaveBeenCalled();
    });

    it("stops event propagation when edit button is clicked", () => {
      const cardClickHandler = jest.fn();
      render(
        <div onClick={cardClickHandler}>
          <VaultEntryCard {...mockProps} />
        </div>,
      );

      const editButton = screen.getByLabelText("Edit entry");
      fireEvent.click(editButton);

      expect(mockProps.onEdit).toHaveBeenCalled();
      expect(cardClickHandler).not.toHaveBeenCalled();
    });

    it("stops event propagation when delete button is clicked", () => {
      const cardClickHandler = jest.fn();
      render(
        <div onClick={cardClickHandler}>
          <VaultEntryCard {...mockProps} />
        </div>,
      );

      const deleteButton = screen.getByLabelText("Delete entry");
      fireEvent.click(deleteButton);

      expect(mockProps.onDelete).toHaveBeenCalled();
      expect(cardClickHandler).not.toHaveBeenCalled();
    });

    it("stops event propagation when tag is clicked", () => {
      const cardClickHandler = jest.fn();
      render(
        <div onClick={cardClickHandler}>
          <VaultEntryCard {...mockProps} />
        </div>,
      );

      const workTag = screen.getByText("work");
      fireEvent.click(workTag);

      expect(mockProps.onTagClick).toHaveBeenCalled();
      expect(cardClickHandler).not.toHaveBeenCalled();
    });
  });

  describe("Hover States and Transitions", () => {
    it("applies hover classes to the card", () => {
      render(<VaultEntryCard {...mockProps} />);

      const card = screen.getByText("Passwords").closest(".group");
      expect(card).toHaveClass(
        "hover:shadow-lg",
        "hover:border-gray-300",
        "transition-all",
        "duration-200",
        "hover:-translate-y-1",
      );
    });

    it("applies group hover classes for action buttons", () => {
      render(<VaultEntryCard {...mockProps} />);

      const card = screen.getByText("Passwords").closest(".group");
      expect(card).toHaveClass("group");

      const actionsContainer = screen
        .getByLabelText("Edit entry")
        .closest("div");
      expect(actionsContainer).toHaveClass(
        "opacity-0",
        "group-hover:opacity-100",
        "transition-opacity",
      );
    });

    it("applies hover states to action buttons", () => {
      render(<VaultEntryCard {...mockProps} />);

      const editButton = screen.getByLabelText("Edit entry");
      expect(editButton).toHaveClass(
        "hover:text-blue-600",
        "hover:bg-blue-50",
        "transition-all",
      );

      const deleteButton = screen.getByLabelText("Delete entry");
      expect(deleteButton).toHaveClass(
        "hover:text-red-600",
        "hover:bg-red-50",
        "transition-all",
      );
    });

    it("applies hover states to tags", () => {
      render(<VaultEntryCard {...mockProps} />);

      const workTag = screen.getByText("work");
      expect(workTag).toHaveClass(
        "hover:bg-gray-200",
        "hover:text-gray-900",
        "transition-colors",
      );
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for buttons", () => {
      render(<VaultEntryCard {...mockProps} />);

      expect(screen.getByLabelText("Edit entry")).toBeInTheDocument();
      expect(screen.getByLabelText("Delete entry")).toBeInTheDocument();
    });

    it("has proper titles for interactive elements", () => {
      render(<VaultEntryCard {...mockProps} />);

      expect(screen.getByTitle("Edit entry")).toBeInTheDocument();
      expect(screen.getByTitle("Delete entry")).toBeInTheDocument();
      expect(screen.getByTitle("Filter by tag: work")).toBeInTheDocument();
    });

    it("shows additional tags in title when overflow", () => {
      const manyTagsEntry = {
        ...mockEntry,
        tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
      };
      render(<VaultEntryCard {...mockProps} entry={manyTagsEntry} />);

      expect(
        screen.getByTitle("Additional tags: tag4, tag5"),
      ).toBeInTheDocument();
    });

    it("has proper semantic structure", () => {
      render(<VaultEntryCard {...mockProps} />);

      // Check that buttons are actually button elements
      const editButton = screen.getByLabelText("Edit entry");
      const deleteButton = screen.getByLabelText("Delete entry");

      expect(editButton.tagName).toBe("BUTTON");
      expect(deleteButton.tagName).toBe("BUTTON");
    });
  });

  describe("Edge Cases", () => {
    it("handles entry with minimal data", () => {
      const minimalEntry: VaultEntry = {
        id: "minimal-123",
        encryptedData: "data",
        iv: "iv",
        algorithm: "AES-256-GCM",
        version: 1,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      render(<VaultEntryCard {...mockProps} entry={minimalEntry} />);

      expect(screen.getByText("Untitled")).toBeInTheDocument();
      expect(screen.getByText("ID: minimal-...")).toBeInTheDocument();
      expect(screen.queryByText("work")).not.toBeInTheDocument();
    });

    it("handles very long entry ID", () => {
      const longIdEntry = {
        ...mockEntry,
        id: "very-long-entry-id-that-should-be-truncated-properly",
      };

      render(<VaultEntryCard {...mockProps} entry={longIdEntry} />);

      expect(screen.getByText("ID: very-lon...")).toBeInTheDocument();
    });

    it("handles empty tags array", () => {
      const emptyTagsEntry = { ...mockEntry, tags: [] };
      render(<VaultEntryCard {...mockProps} entry={emptyTagsEntry} />);

      expect(screen.queryByText("work")).not.toBeInTheDocument();
    });

    it("handles undefined tags", () => {
      const undefinedTagsEntry = { ...mockEntry, tags: undefined };
      render(<VaultEntryCard {...mockProps} entry={undefinedTagsEntry} />);

      expect(screen.queryByText("work")).not.toBeInTheDocument();
    });
  });
});
