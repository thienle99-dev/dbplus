# DB Plus - Soft Pink Premium Dark Theme
## Complete Design System & Color Tokens

---

## ① COLOR PALETTE (Raw Hex Values)

### Primary Scale (Soft Pink)
```
pink-50:  #FDF2F8
pink-100: #FCE7F3
pink-200: #FBCFE8
pink-300: #F9A8D4
pink-400: #F472B6
pink-500: #EC4899  ← Primary
pink-600: #DB2777
pink-700: #BE185D
pink-800: #9D174D
pink-900: #831843
```

### Neutral/Gray Scale (Cool Gray)
```
gray-50:  #F9FAFB
gray-100: #F3F4F6
gray-200: #E5E7EB
gray-300: #D1D5DB
gray-400: #9CA3AF
gray-500: #6B7280
gray-600: #4B5563
gray-700: #374151
gray-800: #1F2937
gray-900: #111827
gray-950: #0A0E14
```

### Success Scale (Soft Green)
```
success-50:  #F0FDF4
success-100: #DCFCE7
success-200: #BBF7D0
success-300: #86EFAC
success-400: #4ADE80
success-500: #22C55E  ← Success
success-600: #16A34A
success-700: #15803D
success-800: #166534
success-900: #14532D
```

### Warning Scale (Amber)
```
warning-50:  #FFFBEB
warning-100: #FEF3C7
warning-200: #FDE68A
warning-300: #FCD34D
warning-400: #FBBF24
warning-500: #F59E0B  ← Warning
warning-600: #D97706
warning-700: #B45309
warning-800: #92400E
warning-900: #78350F
```

### Error Scale (Red)
```
error-50:  #FEF2F2
error-100: #FEE2E2
error-200: #FECACA
error-300: #FCA5A5
error-400: #F87171
error-500: #EF4444  ← Error
error-600: #DC2626
error-700: #B91C1C
error-800: #991B1B
error-900: #7F1D1D
```

---

## ② SEMANTIC TOKENS

### Background Tokens
```
background.default:     gray-950  (#0A0E14)
background.panel:       gray-900  (#111827)
background.hover:       gray-800  (#1F2937)
background.active:      gray-700  (#374151)
background.elevated:    gray-800  (#1F2937)
background.sunken:      #000000

surface.raised:         gray-800  (#1F2937)
surface.sunken:         gray-950  (#0A0E14)
surface.overlay:        rgba(17, 24, 39, 0.95)
```

### Text Tokens
```
text.primary:           gray-50   (#F9FAFB)
text.secondary:         gray-400  (#9CA3AF)
text.muted:             gray-500  (#6B7280)
text.disabled:          gray-600  (#4B5563)
text.accent:            pink-400  (#F472B6)
text.inverse:           gray-900  (#111827)
```

### Border Tokens
```
border.default:         gray-800  (#1F2937)
border.light:           gray-700  (#374151)
border.strong:          gray-600  (#4B5563)
border.subtle:          rgba(31, 41, 55, 0.5)
border.focus:           pink-500  (#EC4899)
```

### Primary Tokens
```
primary.default:        pink-500  (#EC4899)
primary.hover:          pink-400  (#F472B6)
primary.active:         pink-600  (#DB2777)
primary.subtle:         rgba(236, 72, 153, 0.1)
primary.transparent:    rgba(236, 72, 153, 0.15)
primary.muted:          pink-900  (#831843)
```

### Accent & Special
```
accent.glow:            rgba(236, 72, 153, 0.3)
focus.ring:             rgba(236, 72, 153, 0.5)
selection.bg:           rgba(236, 72, 153, 0.2)
selection.text:         pink-50   (#FDF2F8)
```

### Code Syntax
```
code.keyword:           pink-400  (#F472B6)
code.string:            success-400 (#4ADE80)
code.number:            warning-400 (#FBBF24)
code.comment:           gray-500  (#6B7280)
code.type:              pink-300  (#F9A8D4)
code.function:          pink-500  (#EC4899)
code.variable:          gray-300  (#D1D5DB)
```

---

## ③ CSS VARIABLES

```css
:root {
  /* === DARK MODE (Default) === */
  
  /* Background */
  --color-bg-default: #0A0E14;
  --color-bg-panel: #111827;
  --color-bg-hover: #1F2937;
  --color-bg-active: #374151;
  --color-bg-elevated: #1F2937;
  --color-bg-sunken: #000000;
  
  /* Surface */
  --color-surface-raised: #1F2937;
  --color-surface-sunken: #0A0E14;
  --color-surface-overlay: rgba(17, 24, 39, 0.95);
  
  /* Text */
  --color-text-primary: #F9FAFB;
  --color-text-secondary: #9CA3AF;
  --color-text-muted: #6B7280;
  --color-text-disabled: #4B5563;
  --color-text-accent: #F472B6;
  --color-text-inverse: #111827;
  
  /* Border */
  --color-border-default: #1F2937;
  --color-border-light: #374151;
  --color-border-strong: #4B5563;
  --color-border-subtle: rgba(31, 41, 55, 0.5);
  --color-border-focus: #EC4899;
  
  /* Primary */
  --color-primary-default: #EC4899;
  --color-primary-hover: #F472B6;
  --color-primary-active: #DB2777;
  --color-primary-subtle: rgba(236, 72, 153, 0.1);
  --color-primary-transparent: rgba(236, 72, 153, 0.15);
  --color-primary-muted: #831843;
  
  /* Semantic */
  --color-success: #22C55E;
  --color-success-bg: rgba(34, 197, 94, 0.1);
  --color-warning: #F59E0B;
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-error: #EF4444;
  --color-error-bg: rgba(239, 68, 68, 0.1);
  
  /* Special */
  --color-accent-glow: rgba(236, 72, 153, 0.3);
  --color-focus-ring: rgba(236, 72, 153, 0.5);
  --color-selection-bg: rgba(236, 72, 153, 0.2);
  --color-selection-text: #FDF2F8;
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #EC4899 0%, #DB2777 100%);
  --gradient-subtle: linear-gradient(180deg, rgba(236, 72, 153, 0.05) 0%, transparent 100%);
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
  --shadow-glow: 0 0 20px rgba(236, 72, 153, 0.3);
  
  /* Code Syntax */
  --code-keyword: #F472B6;
  --code-string: #4ADE80;
  --code-number: #FBBF24;
  --code-comment: #6B7280;
  --code-type: #F9A8D4;
  --code-function: #EC4899;
  --code-variable: #D1D5DB;
}

.light {
  /* === LIGHT MODE === */
  
  /* Background */
  --color-bg-default: #FFFFFF;
  --color-bg-panel: #F9FAFB;
  --color-bg-hover: #F3F4F6;
  --color-bg-active: #E5E7EB;
  --color-bg-elevated: #FFFFFF;
  --color-bg-sunken: #F3F4F6;
  
  /* Surface */
  --color-surface-raised: #FFFFFF;
  --color-surface-sunken: #F3F4F6;
  --color-surface-overlay: rgba(255, 255, 255, 0.95);
  
  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #4B5563;
  --color-text-muted: #6B7280;
  --color-text-disabled: #9CA3AF;
  --color-text-accent: #DB2777;
  --color-text-inverse: #F9FAFB;
  
  /* Border */
  --color-border-default: #E5E7EB;
  --color-border-light: #F3F4F6;
  --color-border-strong: #D1D5DB;
  --color-border-subtle: rgba(229, 231, 235, 0.5);
  --color-border-focus: #EC4899;
  
  /* Primary */
  --color-primary-default: #EC4899;
  --color-primary-hover: #DB2777;
  --color-primary-active: #BE185D;
  --color-primary-subtle: rgba(236, 72, 153, 0.08);
  --color-primary-transparent: rgba(236, 72, 153, 0.12);
  --color-primary-muted: #FCE7F3;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-glow: 0 0 20px rgba(236, 72, 153, 0.2);
}
```

---

## ④ TAILWIND CONFIG EXTENSION

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary Pink Scale
        pink: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899',
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
        },
        
        // Neutral Gray Scale
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#0A0E14',
        },
        
        // Success Green Scale
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        
        // Warning Amber Scale
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        
        // Error Red Scale
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        
        // Semantic Tokens
        background: {
          DEFAULT: 'var(--color-bg-default)',
          panel: 'var(--color-bg-panel)',
          hover: 'var(--color-bg-hover)',
          active: 'var(--color-bg-active)',
          elevated: 'var(--color-bg-elevated)',
          sunken: 'var(--color-bg-sunken)',
        },
        
        surface: {
          raised: 'var(--color-surface-raised)',
          sunken: 'var(--color-surface-sunken)',
          overlay: 'var(--color-surface-overlay)',
        },
        
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          disabled: 'var(--color-text-disabled)',
          accent: 'var(--color-text-accent)',
          inverse: 'var(--color-text-inverse)',
        },
        
        border: {
          DEFAULT: 'var(--color-border-default)',
          light: 'var(--color-border-light)',
          strong: 'var(--color-border-strong)',
          subtle: 'var(--color-border-subtle)',
          focus: 'var(--color-border-focus)',
        },
        
        primary: {
          DEFAULT: 'var(--color-primary-default)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          subtle: 'var(--color-primary-subtle)',
          transparent: 'var(--color-primary-transparent)',
          muted: 'var(--color-primary-muted)',
        },
      },
      
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-subtle': 'var(--gradient-subtle)',
      },
      
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        'glow': 'var(--shadow-glow)',
      },
      
      ringColor: {
        DEFAULT: 'var(--color-focus-ring)',
      },
    },
  },
  plugins: [],
};
```

---

## ⑤ COMPONENT COLOR GUIDELINES

### Layout Components
```
Sidebar
  background → bg-background-panel
  border → border-r border-border
  selected item → bg-primary-transparent text-text-accent
  hover item → bg-background-hover

Toolbar
  background → bg-background-elevated
  border → border-b border-border
  button hover → bg-background-hover

Main Content
  background → bg-background
  panels → bg-background-panel border border-border
```

### Navigation
```
Tabs
  background → bg-background-panel
  active tab → bg-primary-subtle text-text-accent border-b-2 border-primary
  inactive tab → text-text-secondary hover:text-text-primary
  hover → bg-background-hover

Breadcrumbs
  text → text-text-secondary
  separator → text-text-muted
  active → text-text-primary
```

### Buttons
```
Primary Button
  background → bg-primary hover:bg-primary-hover active:bg-primary-active
  text → text-white
  shadow → shadow-md hover:shadow-glow

Secondary Button
  background → bg-background-elevated hover:bg-background-hover
  text → text-text-primary
  border → border border-border

Subtle/Ghost Button
  background → transparent hover:bg-background-hover
  text → text-text-secondary hover:text-text-primary

Danger Button
  background → bg-error-500 hover:bg-error-600
  text → text-white
```

### Data Display
```
Table/Data Grid
  background → bg-background-panel
  header → bg-background-elevated text-text-secondary
  row hover → bg-background-hover
  row selected → bg-primary-subtle
  border → border-border
  cell focus → ring-2 ring-primary

Cards/Panels
  background → bg-surface-raised
  border → border border-border
  shadow → shadow-md
  hover → shadow-lg
```

### Form Elements
```
Input
  background → bg-background-elevated
  border → border border-border
  focus → border-primary ring-2 ring-focus-ring
  disabled → bg-background-hover text-text-disabled
  error → border-error-500 ring-error-500

Select/Dropdown
  background → bg-background-elevated
  option hover → bg-background-hover
  selected → bg-primary-subtle text-text-accent

Checkbox/Radio
  unchecked → border-border
  checked → bg-primary border-primary
  focus → ring-2 ring-focus-ring
```

### Feedback
```
Alert Success
  background → bg-success-bg
  border → border-l-4 border-success-500
  text → text-success-600 (light) / text-success-400 (dark)

Alert Warning
  background → bg-warning-bg
  border → border-l-4 border-warning-500
  text → text-warning-600 (light) / text-warning-400 (dark)

Alert Error
  background → bg-error-bg
  border → border-l-4 border-error-500
  text → text-error-600 (light) / text-error-400 (dark)

Toast Notification
  background → bg-surface-overlay backdrop-blur-sm
  border → border border-border
  shadow → shadow-xl
```

### Interactive States
```
Hover States
  default → bg-background-hover
  subtle → bg-primary-subtle

Active/Pressed States
  default → bg-background-active
  primary → bg-primary-active

Focus States
  ring → ring-2 ring-focus-ring
  border → border-primary

Selection
  background → bg-selection-bg
  text → text-selection-text

Disabled States
  opacity → opacity-50
  cursor → cursor-not-allowed
  text → text-text-disabled
```

### Splitters & Dividers
```
Horizontal Divider
  background → bg-border
  height → h-px

Vertical Divider
  background → bg-border
  width → w-px

Resizable Splitter
  default → bg-border
  hover → bg-primary
  active → bg-primary-active
```

---

## ⑥ GRADIENTS & SHADOWS

### Gradients
```css
/* Primary Gradient */
--gradient-primary: linear-gradient(135deg, #EC4899 0%, #DB2777 100%);

/* Subtle Background Gradient */
--gradient-subtle: linear-gradient(180deg, rgba(236, 72, 153, 0.05) 0%, transparent 100%);

/* Glow Gradient (for active indicators) */
--gradient-glow: radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%);

/* Shimmer Effect (for loading states) */
--gradient-shimmer: linear-gradient(90deg, 
  transparent 0%, 
  rgba(236, 72, 153, 0.1) 50%, 
  transparent 100%
);
```

### Shadows
```css
/* Elevation Shadows */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.3);

/* Glow Effects */
--shadow-glow: 0 0 20px rgba(236, 72, 153, 0.3);
--shadow-glow-strong: 0 0 30px rgba(236, 72, 153, 0.5);

/* Inner Shadows */
--shadow-inset: inset 0 2px 4px 0 rgba(0, 0, 0, 0.3);

/* Focus Ring Shadow */
--shadow-focus: 0 0 0 3px rgba(236, 72, 153, 0.5);
```

### Usage Examples
```css
/* Raised Panel */
.panel {
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-md);
}

/* Active Button with Glow */
.button-primary:active {
  background: var(--color-primary-active);
  box-shadow: var(--shadow-glow);
}

/* Floating Modal */
.modal {
  background: var(--color-surface-overlay);
  backdrop-filter: blur(8px);
  box-shadow: var(--shadow-xl);
}

/* Active Tab Indicator */
.tab-active::after {
  background: var(--gradient-primary);
  box-shadow: var(--shadow-glow);
}
```

---

## 🎨 DESIGN PRINCIPLES

### Contrast Ratios
- Text on dark backgrounds: minimum 7:1 (AAA)
- Interactive elements: minimum 4.5:1 (AA)
- Disabled states: 3:1

### Spacing & Rhythm
- Use 4px base unit
- Component padding: 12px, 16px, 24px
- Section spacing: 32px, 48px

### Typography Pairing
- Headings: text-text-primary
- Body: text-text-secondary
- Captions: text-text-muted
- Disabled: text-text-disabled

### Animation Timing
- Micro-interactions: 150ms
- Component transitions: 200ms
- Page transitions: 300ms
- Easing: cubic-bezier(0.4, 0.0, 0.2, 1)

---

## 📦 IMPLEMENTATION CHECKLIST

- [ ] Add CSS variables to `index.css`
- [ ] Update `tailwind.config.js` with extended colors
- [ ] Create theme toggle component
- [ ] Update all existing components to use semantic tokens
- [ ] Test contrast ratios in both modes
- [ ] Verify focus states meet accessibility standards
- [ ] Document component usage patterns
- [ ] Create Storybook/component library examples

---

This color system is production-ready and follows industry best practices from Linear, Raycast, and Arc. The soft pink primary creates an elegant, premium feel while maintaining excellent readability for a developer tool.
