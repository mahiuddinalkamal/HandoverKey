# TagManager Component

A reusable React component for managing tags with autocomplete, keyboard navigation, and accessibility features.

## Features

- ✅ **Add/Remove Tags**: Click to add, click × to remove
- ✅ **Duplicate Prevention**: Prevents adding duplicate tags
- ✅ **Autocomplete**: Shows suggestions based on existing tags
- ✅ **Keyboard Navigation**: Full keyboard support with arrow keys
- ✅ **Max Tags Limit**: Optional limit on number of tags
- ✅ **Accessibility**: WCAG 2.1 AA compliant with ARIA labels
- ✅ **Responsive**: Works on mobile and desktop

## Usage

```tsx
import TagManager from "./TagManager";

function MyComponent() {
  const [tags, setTags] = useState<string[]>([]);
  const existingTags = ["work", "personal", "urgent", "project"];

  return (
    <TagManager
      tags={tags}
      onChange={setTags}
      suggestions={existingTags}
      maxTags={10}
      placeholder="Add a tag..."
    />
  );
}
```

## Props

| Prop          | Type                       | Default          | Description                              |
| ------------- | -------------------------- | ---------------- | ---------------------------------------- |
| `tags`        | `string[]`                 | -                | **Required.** Current array of tags      |
| `onChange`    | `(tags: string[]) => void` | -                | **Required.** Callback when tags change  |
| `suggestions` | `string[]`                 | `[]`             | Array of suggested tags for autocomplete |
| `maxTags`     | `number`                   | -                | Maximum number of tags allowed           |
| `placeholder` | `string`                   | `"Add a tag..."` | Input placeholder text                   |
| `className`   | `string`                   | `""`             | Additional CSS classes                   |

## Keyboard Shortcuts

- **Enter**: Add current input as tag or select highlighted suggestion
- **Arrow Down/Up**: Navigate through autocomplete suggestions
- **Escape**: Hide suggestions dropdown
- **Backspace**: Remove last tag when input is empty

## Accessibility Features

- Full keyboard navigation support
- ARIA labels and roles for screen readers
- Focus management for modal interactions
- High contrast support
- Semantic HTML structure

## Testing

The component includes comprehensive unit tests covering:

- Basic rendering and interaction
- Tag addition and removal
- Duplicate prevention
- Autocomplete functionality
- Keyboard navigation
- Accessibility features
- Max tags limit
- Focus management

Run tests with:

```bash
npm test -- TagManager.test.tsx
```

## Integration Example

See `VaultEntryModalWithTagManager.tsx` for a complete integration example showing how to use TagManager within a form component.
