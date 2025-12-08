# TablePlus-Inspired Design System

A clean, minimal, macOS-native design system for the Database Client app.

## 🎨 Design Principles

### Visual Style
- **Minimal & Clean**: Flat design, no gradients
- **Bright UI**: White and light grey backgrounds
- **Soft Shadows**: Subtle depth only where needed
- **macOS Native**: Feels like a native macOS application
- **Bright Accents**: Sparingly used saturated colors

### Color Philosophy
Accent colors are used **sparingly** for:
- Selected states
- Active states
- Focus rings
- Important icons
- Call-to-action buttons

## 🎨 Color Tokens

### Base Colors
```css
--color-bg: #FFFFFF              /* Main background */
--color-panel: #F7F7F7           /* Panel background */
--color-panel-elevated: #FFFFFF  /* Elevated panels */
--color-border: #ECECEC          /* Default borders */
--color-divider: #DADADA         /* Divider lines */
--color-text: #2C2C2C            /* Primary text */
--color-text-muted: #8E8E93      /* Secondary text */
--color-hover: #F5F5F5           /* Hover background */
--color-active: #EBEBEB          /* Active background */
```

### Accent Colors (TablePlus Palette)
```css
--accent-yellow: #FFB300   /* Warnings, highlights */
--accent-orange: #F57C00   /* MySQL, alerts */
--accent-blue: #039BE5     /* Primary actions, PostgreSQL */
--accent-green: #43A047    /* Success, SQLite */
--accent-red: #E53935      /* Danger, errors */
```

### Semantic Colors
```css
--primary: var(--accent-blue)
--danger: var(--accent-red)
--success: var(--accent-green)
--warning: var(--accent-orange)
--info: var(--accent-blue)
```

## 📏 Spacing Scale

Use consistent spacing tokens:
```css
--space-1: 4px    /* Tight spacing */
--space-2: 8px    /* Small gaps */
--space-3: 12px   /* Medium gaps */
--space-4: 16px   /* Standard spacing */
--space-5: 20px   /* Large spacing */
--space-6: 24px   /* Section spacing */
--space-8: 32px   /* Major sections */
```

## 🔲 Border Radius

```css
--radius-sm: 4px   /* Table rows, small elements */
--radius-md: 6px   /* Buttons, inputs, panels */
--radius-lg: 8px   /* Cards */
--radius-xl: 12px  /* Modals */
```

## 🌑 Shadows

Subtle, macOS-like shadows:
```css
--shadow-sm: Minimal depth
--shadow-md: Standard elevation
--shadow-lg: Elevated panels
--shadow-xl: Modals, popovers
```

## 📐 Layout Tokens

```css
--sidebar-width: 260px
--toolbar-height: 48px
--inspector-width: 280px
--table-row-height: 32px
```

## 🔤 Typography

### Font Families
```css
--font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI'
--font-family-mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Consolas'
```

### Font Sizes
```css
--font-size-xs: 11px   /* Metadata */
--font-size-sm: 12px   /* Table rows */
--font-size-base: 13px /* Sidebar */
--font-size-md: 14px   /* Body text */
--font-size-lg: 16px   /* Section titles */
--font-size-xl: 18px   /* Page titles */
```

### Font Weights
- **400**: Normal text
- **500**: Medium (buttons, labels)
- **600**: Semibold (headings) - use sparingly

## 🧩 Components

### Button

```tsx
import { Button } from '@/components/ui';

// Primary button
<Button variant="primary">Save</Button>

// Secondary button
<Button variant="secondary">Cancel</Button>

// Ghost button
<Button variant="ghost">Edit</Button>

// Danger button
<Button variant="danger">Delete</Button>

// With icon
<Button variant="primary" icon={<Plus size={16} />}>
  Add Connection
</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Loading state
<Button loading>Connecting...</Button>
```

### Input

```tsx
import { Input } from '@/components/ui';
import { Search, Lock } from 'lucide-react';

// Basic input
<Input
  label="Database Name"
  placeholder="Enter name..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// With icons
<Input
  leftIcon={<Search size={16} />}
  placeholder="Search..."
/>

<Input
  rightIcon={<Lock size={16} />}
  type="password"
  label="Password"
/>

// With error
<Input
  label="Host"
  value={host}
  error="Invalid hostname"
/>

// With helper text
<Input
  label="Port"
  helperText="Default: 5432"
/>
```

### Select

```tsx
import { Select } from '@/components/ui';

<Select
  value={value}
  onChange={setValue}
  options={[
    { value: 'postgres', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'sqlite', label: 'SQLite' },
  ]}
  searchable
/>
```

### Modal

```tsx
import { Modal, Button } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Add Connection"
  size="md"
  footer={
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onSave}>
        Save
      </Button>
    </>
  }
>
  {/* Modal content */}
</Modal>
```

### ConnectionCard

```tsx
import { ConnectionCard } from '@/components/ui';

<ConnectionCard
  name="Production DB"
  type="postgres"
  host="localhost:5432"
  database="myapp"
  lastConnected="2 hours ago"
  onClick={() => connect()}
/>
```

### Toolbar

```tsx
import { Toolbar, ToolbarSection, ToolbarDivider, ToolbarSpacer } from '@/components/ui';
import { Play, Square, Search } from 'lucide-react';

<Toolbar>
  <ToolbarSection>
    <Button variant="primary" icon={<Play size={16} />} size="sm">
      Run
    </Button>
    <Button variant="secondary" icon={<Square size={16} />} size="sm">
      Stop
    </Button>
  </ToolbarSection>
  
  <ToolbarDivider />
  
  <ToolbarSection>
    <SearchBar value={search} onChange={setSearch} />
  </ToolbarSection>
  
  <ToolbarSpacer />
  
  <ToolbarSection>
    {/* Right-aligned items */}
  </ToolbarSection>
</Toolbar>
```

### SearchBar

```tsx
import { SearchBar } from '@/components/ui';

<SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Search tables..."
/>
```

## 🎯 Usage Guidelines

### DO ✅
- Use accent colors sparingly (selected, active, focus states)
- Keep spacing consistent with tokens
- Use subtle shadows
- Maintain clean, minimal aesthetic
- Follow macOS design patterns
- Use 6px border radius for most elements
- Keep text weights light (400-500)

### DON'T ❌
- Use gradients
- Over-use accent colors
- Make borders too thick
- Use heavy font weights everywhere
- Add unnecessary decorations
- Ignore spacing tokens
- Mix different design styles

## 🌓 Dark Mode

Dark mode tokens are available via the `.dark` class:
```tsx
<body className="dark">
  {/* App content */}
</body>
```

## 📦 File Structure

```
frontend/src/
├── styles/
│   └── design-tokens.css      # All design tokens
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Modal.tsx
│       ├── ConnectionCard.tsx
│       ├── Toolbar.tsx
│       ├── SearchBar.tsx
│       ├── index.ts           # Exports
│       └── README.md          # This file
└── index.css                  # Imports design-tokens.css
```

## 🚀 Getting Started

1. **Import design tokens** (already done in `index.css`):
```css
@import './styles/design-tokens.css';
```

2. **Import components**:
```tsx
import { Button, Input, Modal } from '@/components/ui';
```

3. **Use design tokens in custom components**:
```tsx
<div className="bg-[var(--color-panel)] border-[var(--color-border)]">
  {/* Content */}
</div>
```

## 🎨 Customization

To customize the design system, edit `styles/design-tokens.css`:

```css
:root {
  /* Override any token */
  --primary: #YOUR_COLOR;
  --sidebar-width: 280px;
}
```

## 📚 References

- TablePlus UI/UX patterns
- macOS Human Interface Guidelines
- SF Pro Font System
- Material Design (subtle influences)

---

**Design System Version**: 1.0.0  
**Last Updated**: December 2025  
**Maintained by**: DB Plus Team
