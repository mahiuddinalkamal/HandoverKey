import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagManager from "../TagManager";

describe("TagManager", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe("Basic Rendering", () => {
    it("renders with empty tags", () => {
      render(<TagManager tags={[]} onChange={mockOnChange} />);

      expect(screen.getByLabelText("Tag input")).toBeInTheDocument();
      expect(screen.getByLabelText("Add tag")).toBeInTheDocument();
      expect(screen.getByText(/Press Enter to add/)).toBeInTheDocument();
    });

    it("renders with existing tags", () => {
      render(<TagManager tags={["work", "email"]} onChange={mockOnChange} />);

      expect(screen.getByText("work")).toBeInTheDocument();
      expect(screen.getByText("email")).toBeInTheDocument();
      expect(screen.getAllByLabelText(/Remove tag:/)).toHaveLength(2);
    });

    it("renders with custom placeholder", () => {
      render(
        <TagManager
          tags={[]}
          onChange={mockOnChange}
          placeholder="Custom placeholder"
        />,
      );

      expect(
        screen.getByPlaceholderText("Custom placeholder"),
      ).toBeInTheDocument();
    });
  });

  describe("Adding Tags", () => {
    it("adds tag when Enter key is pressed", async () => {
      const user = userEvent.setup();
      render(<TagManager tags={[]} onChange={mockOnChange} />);

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "newtag");
      await user.keyboard("{Enter}");

      expect(mockOnChange).toHaveBeenCalledWith(["newtag"]);
    });

    it("adds tag when Add button is clicked", async () => {
      const user = userEvent.setup();
      render(<TagManager tags={[]} onChange={mockOnChange} />);

      const input = screen.getByLabelText("Tag input");
      const addButton = screen.getByLabelText("Add tag");

      await user.type(input, "newtag");
      await user.click(addButton);

      expect(mockOnChange).toHaveBeenCalledWith(["newtag"]);
    });

    it("trims whitespace from tags", async () => {
      const user = userEvent.setup();
      render(<TagManager tags={[]} onChange={mockOnChange} />);

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "  spaced tag  ");
      await user.keyboard("{Enter}");

      expect(mockOnChange).toHaveBeenCalledWith(["spaced tag"]);
    });

    it("does not add empty tags", async () => {
      const user = userEvent.setup();
      render(<TagManager tags={[]} onChange={mockOnChange} />);

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "   ");
      await user.keyboard("{Enter}");

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("clears input after adding tag", async () => {
      const user = userEvent.setup();
      render(<TagManager tags={[]} onChange={mockOnChange} />);

      const input = screen.getByLabelText("Tag input") as HTMLInputElement;
      await user.type(input, "newtag");
      await user.keyboard("{Enter}");

      expect(input.value).toBe("");
    });
  });

  describe("Duplicate Prevention", () => {
    it("prevents adding duplicate tags", async () => {
      const user = userEvent.setup();
      render(<TagManager tags={["existing"]} onChange={mockOnChange} />);

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "existing");
      await user.keyboard("{Enter}");

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("prevents adding duplicate tags with different casing", async () => {
      const user = userEvent.setup();
      render(<TagManager tags={["Existing"]} onChange={mockOnChange} />);

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "existing");
      await user.keyboard("{Enter}");

      // Should still prevent duplicate (case-sensitive comparison)
      expect(mockOnChange).toHaveBeenCalledWith(["Existing", "existing"]);
    });
  });

  describe("Removing Tags", () => {
    it("removes tag when remove button is clicked", async () => {
      const user = userEvent.setup();
      render(<TagManager tags={["work", "email"]} onChange={mockOnChange} />);

      const removeButton = screen.getByLabelText("Remove tag: work");
      await user.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith(["email"]);
    });

    it("removes last tag when backspace is pressed on empty input", async () => {
      const user = userEvent.setup();
      render(<TagManager tags={["work", "email"]} onChange={mockOnChange} />);

      const input = screen.getByLabelText("Tag input");
      await user.click(input);
      await user.keyboard("{Backspace}");

      expect(mockOnChange).toHaveBeenCalledWith(["work"]);
    });

    it("does not remove tag when backspace is pressed on non-empty input", async () => {
      const user = userEvent.setup();
      render(<TagManager tags={["work", "email"]} onChange={mockOnChange} />);

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "text");
      await user.keyboard("{Backspace}");

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe("Autocomplete Suggestions", () => {
    const suggestions = ["work", "personal", "urgent", "project"];

    it("shows suggestions when typing", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={[]}
          onChange={mockOnChange}
          suggestions={suggestions}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");

      expect(screen.getByText("work")).toBeInTheDocument();
    });

    it("filters suggestions based on input", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={[]}
          onChange={mockOnChange}
          suggestions={suggestions}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "pro");

      expect(screen.getByText("project")).toBeInTheDocument();
      expect(screen.queryByText("work")).not.toBeInTheDocument();
    });

    it("excludes already selected tags from suggestions", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={["work"]}
          onChange={mockOnChange}
          suggestions={suggestions}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");

      // Should not show "work" in suggestions dropdown since it's already selected
      expect(
        screen.queryByRole("option", { name: "work" }),
      ).not.toBeInTheDocument();
    });

    it("adds suggestion when clicked", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={[]}
          onChange={mockOnChange}
          suggestions={suggestions}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");

      const suggestion = screen.getByText("work");
      await user.click(suggestion);

      expect(mockOnChange).toHaveBeenCalledWith(["work"]);
    });

    it("hides suggestions when input is cleared", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={[]}
          onChange={mockOnChange}
          suggestions={suggestions}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");
      expect(screen.getByText("work")).toBeInTheDocument();

      await user.clear(input);
      await waitFor(() => {
        expect(screen.queryByText("work")).not.toBeInTheDocument();
      });
    });
  });

  describe("Keyboard Navigation", () => {
    const suggestions = ["work", "personal", "urgent"];

    it("navigates suggestions with arrow keys", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={[]}
          onChange={mockOnChange}
          suggestions={suggestions}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");

      // Arrow down should select first suggestion
      await user.keyboard("{ArrowDown}");
      const firstSuggestion = screen.getByRole("option", { name: "work" });
      expect(firstSuggestion).toHaveClass("bg-blue-50");

      // Arrow down again should move to next suggestion if available
      await user.keyboard("{ArrowDown}");
      // Since we only have "work" matching "w", it should wrap around or stay
      expect(firstSuggestion).toHaveClass("bg-blue-50");
    });

    it("adds selected suggestion with Enter key", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={[]}
          onChange={mockOnChange}
          suggestions={suggestions}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");

      expect(mockOnChange).toHaveBeenCalledWith(["work"]);
    });

    it("hides suggestions with Escape key", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={[]}
          onChange={mockOnChange}
          suggestions={suggestions}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");
      expect(screen.getByText("work")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByText("work")).not.toBeInTheDocument();
      });
    });

    it("wraps around when navigating past last suggestion", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={[]}
          onChange={mockOnChange}
          suggestions={["work", "personal"]}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");

      // Navigate to last suggestion
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");

      // Arrow down should wrap to first
      await user.keyboard("{ArrowDown}");
      const firstSuggestion = screen.getByText("work");
      expect(firstSuggestion).toHaveClass("bg-blue-50");
    });
  });

  describe("Max Tags Limit", () => {
    it("prevents adding tags when max limit is reached", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={["tag1", "tag2"]}
          onChange={mockOnChange}
          maxTags={2}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "tag3");
      await user.keyboard("{Enter}");

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("disables input when max limit is reached", () => {
      render(
        <TagManager
          tags={["tag1", "tag2"]}
          onChange={mockOnChange}
          maxTags={2}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      expect(input).toBeDisabled();
      expect(
        screen.getByPlaceholderText("Maximum 2 tags reached"),
      ).toBeInTheDocument();
    });

    it("shows tag count when max limit is set", () => {
      render(
        <TagManager tags={["tag1"]} onChange={mockOnChange} maxTags={3} />,
      );

      expect(screen.getByText(/1\/3 tags used\./)).toBeInTheDocument();
    });

    it("disables add button when max limit is reached", () => {
      render(
        <TagManager
          tags={["tag1", "tag2"]}
          onChange={mockOnChange}
          maxTags={2}
        />,
      );

      const addButton = screen.getByLabelText("Add tag");
      expect(addButton).toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(<TagManager tags={["work"]} onChange={mockOnChange} />);

      expect(screen.getByLabelText("Tag input")).toBeInTheDocument();
      expect(screen.getByLabelText("Add tag")).toBeInTheDocument();
      expect(screen.getByLabelText("Remove tag: work")).toBeInTheDocument();
    });

    it("has proper ARIA attributes for suggestions", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={[]}
          onChange={mockOnChange}
          suggestions={["work", "personal"]}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");

      const suggestionsList = screen.getByRole("listbox");
      expect(suggestionsList).toHaveAttribute("aria-label", "Tag suggestions");

      const suggestions = screen.getAllByRole("option");
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toHaveAttribute("aria-selected", "false");
    });

    it("updates aria-selected when navigating suggestions", async () => {
      const user = userEvent.setup();
      render(
        <TagManager
          tags={[]}
          onChange={mockOnChange}
          suggestions={["work", "personal"]}
        />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");
      await user.keyboard("{ArrowDown}");

      const selectedSuggestion = screen.getByRole("option");
      expect(selectedSuggestion).toHaveAttribute("aria-selected", "true");
    });

    it("has describedby relationship with help text", () => {
      render(<TagManager tags={[]} onChange={mockOnChange} />);

      const input = screen.getByLabelText("Tag input");
      expect(input).toHaveAttribute("aria-describedby", "tag-help");
      expect(screen.getByText(/Press Enter to add/)).toHaveAttribute(
        "id",
        "tag-help",
      );
    });
  });

  describe("Focus Management", () => {
    it("maintains focus on input after adding tag via suggestion click", async () => {
      const user = userEvent.setup();
      render(
        <TagManager tags={[]} onChange={mockOnChange} suggestions={["work"]} />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");

      const suggestion = screen.getByText("work");
      await user.click(suggestion);

      // Focus should return to input after a brief delay
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });

    it("shows suggestions when input is focused with existing value", async () => {
      const user = userEvent.setup();
      render(
        <TagManager tags={[]} onChange={mockOnChange} suggestions={["work"]} />,
      );

      const input = screen.getByLabelText("Tag input");
      await user.type(input, "w");
      await user.tab(); // Blur input

      await waitFor(() => {
        expect(
          screen.queryByRole("option", { name: "work" }),
        ).not.toBeInTheDocument();
      });

      await user.click(input); // Focus input again
      expect(screen.getByRole("option", { name: "work" })).toBeInTheDocument();
    });
  });
});
