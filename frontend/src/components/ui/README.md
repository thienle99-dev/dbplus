# Custom Select Component

A modern, customizable dropdown select component with animations, search functionality, and full theme integration.

## Features

- ✨ **Smooth Animations**: Dropdown opens/closes with elegant animations
- 🎨 **Theme Integration**: Fully integrated with the app's theme system
- 🔍 **Searchable**: Optional search functionality for large option lists
- 📱 **Responsive**: Works on all screen sizes
- ⌨️ **Keyboard Accessible**: Full keyboard navigation support
- 🎯 **Icon Support**: Add icons to options for better UX
- 🎛️ **Size Variants**: Small, medium, and large sizes available

## Usage

### Basic Example

```tsx
import Select from './components/ui/Select';

function MyComponent() {
  const [value, setValue] = useState('option1');

  return (
    <Select
      value={value}
      onChange={setValue}
      options={[
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' },
      ]}
    />
  );
}
```

### With Search

```tsx
<Select
  value={value}
  onChange={setValue}
  options={options}
  searchable
  placeholder="Search and select..."
/>
```

### With Icons

```tsx
import { Database, Table, Columns } from 'lucide-react';

<Select
  value={value}
  onChange={setValue}
  options={[
    { value: 'db', label: 'Database', icon: <Database size={16} /> },
    { value: 'table', label: 'Table', icon: <Table size={16} /> },
    { value: 'column', label: 'Column', icon: <Columns size={16} /> },
  ]}
/>
```

### Different Sizes

```tsx
// Small
<Select size="sm" {...props} />

// Medium (default)
<Select size="md" {...props} />

// Large
<Select size="lg" {...props} />
```

### Disabled State

```tsx
<Select
  value={value}
  onChange={setValue}
  options={options}
  disabled
/>
```

### Disabled Options

```tsx
<Select
  value={value}
  onChange={setValue}
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2 (Disabled)', disabled: true },
    { value: 'option3', label: 'Option 3' },
  ]}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Current selected value (required) |
| `onChange` | `(value: string) => void` | - | Callback when value changes (required) |
| `options` | `SelectOption[]` | - | Array of options (required) |
| `placeholder` | `string` | `'Select...'` | Placeholder text when no value selected |
| `className` | `string` | `''` | Additional CSS classes |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |
| `disabled` | `boolean` | `false` | Disable the select |
| `searchable` | `boolean` | `false` | Enable search functionality |

## SelectOption Type

```typescript
interface SelectOption {
  value: string;          // Unique value for the option
  label: string;          // Display label
  icon?: React.ReactNode; // Optional icon
  disabled?: boolean;     // Optional disabled state
}
```

## Styling

The component uses CSS variables from the theme system:

- `--bg-0`, `--bg-1`, `--bg-2`, `--bg-3` - Background colors
- `--border` - Border color
- `--text-primary`, `--text-secondary` - Text colors
- `--accent` - Accent color for selected state and focus

## Animations

The dropdown uses custom CSS animations defined in `index.css`:

- `slideInFromTop` - Smooth entrance animation
- `fadeIn` - Fade in effect
- Rotation animation for chevron icon

## Accessibility

- Click outside to close
- Escape key to close
- Arrow keys for navigation (coming soon)
- Enter to select (coming soon)
- Full screen reader support (coming soon)

## Migration from Native Select

### Before
```tsx
<select
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="..."
>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

### After
```tsx
<Select
  value={value}
  onChange={setValue}
  options={[
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ]}
/>
```
