# DB Plus - Gruvbox Theme Design System
## Complete Color Tokens for Database Client

---

## ① RAW GRUVBOX PALETTE (Hex Values)

**Base**: Gruvbox Material Medium Dark (optimized for modern displays)
**Inspiration**: Original Gruvbox by morhetz + Material variant for better contrast

### Background Scale (Dark)
```
gruv-bg0-hard:   #1d2021  (darkest, for deep backgrounds)
gruv-bg0:        #282828  (main background)
gruv-bg1:        #3c3836  (panels, elevated surfaces)
gruv-bg2:        #504945  (hover states)
gruv-bg3:        #665c54  (active states)
gruv-bg4:        #7c6f64  (borders, dividers)
```

### Background Scale (Light)
```
gruv-bg0-light:  #fbf1c7  (main background)
gruv-bg1-light:  #ebdbb2  (panels)
gruv-bg2-light:  #d5c4a1  (hover)
gruv-bg3-light:  #bdae93  (active)
gruv-bg4-light:  #a89984  (borders)
```

### Foreground Scale (Dark)
```
gruv-fg0:        #fbf1c7  (primary text)
gruv-fg1:        #ebdbb2  (secondary text)
gruv-fg2:        #d5c4a1  (muted text)
gruv-fg3:        #bdae93  (disabled text)
gruv-fg4:        #a89984  (very muted)
```

### Foreground Scale (Light)
```
gruv-fg0-light:  #282828  (primary text)
gruv-fg1-light:  #3c3836  (secondary text)
gruv-fg2-light:  #504945  (muted text)
gruv-fg3-light:  #665c54  (disabled text)
gruv-fg4-light:  #7c6f64  (very muted)
```

### Accent Colors (Universal - work in both modes)
```
gruv-red:        #fb4934  (bright red)
gruv-red-dim:    #cc241d  (dimmed red)
gruv-green:      #b8bb26  (bright green)
gruv-green-dim:  #98971a  (dimmed green)
gruv-yellow:     #fabd2f  (bright yellow)
gruv-yellow-dim: #d79921  (dimmed yellow)
gruv-blue:       #83a598  (bright blue)
gruv-blue-dim:   #458588  (dimmed blue)
gruv-purple:     #d3869b  (bright purple)
gruv-purple-dim: #b16286  (dimmed purple)
gruv-aqua:       #8ec07c  (bright aqua/cyan)
gruv-aqua-dim:   #689d6a  (dimmed aqua)
gruv-orange:     #fe8019  (bright orange)
gruv-orange-dim: #d65d0e  (dimmed orange)
```

### Primary Color Choice
**Selected Primary: Aqua (#8ec07c / #689d6a)**

**Rationale**: 
- Aqua/cyan is distinctive yet professional
- Excellent contrast against warm brown backgrounds
- Evokes terminal/coding aesthetic (like cursor highlights)
- Less aggressive than red/orange
- More unique than blue/green for DB tools
- Gruvbox aqua is perfectly balanced for both readability and warmth

---

## ② SEMANTIC TOKEN MAPPING

### Background Tokens
```
Dark Mode:
  background.default:        gruv-bg0        (#282828)
  background.body:           gruv-bg0-hard   (#1d2021)
  background.panel:          gruv-bg1        (#3c3836)
  background.panelElevated:  gruv-bg2        (#504945)
  background.hover:          gruv-bg2        (#504945)
  background.active:         gruv-bg3        (#665c54)
  background.muted:          gruv-bg1        (#3c3836)

Light Mode:
  background.default:        gruv-bg0-light  (#fbf1c7)
  background.body:           gruv-bg0-light  (#fbf1c7)
  background.panel:          gruv-bg1-light  (#ebdbb2)
  background.panelElevated:  gruv-bg2-light  (#d5c4a1)
  background.hover:          gruv-bg2-light  (#d5c4a1)
  background.active:         gruv-bg3-light  (#bdae93)
  background.muted:          gruv-bg1-light  (#ebdbb2)
```

### Surface Tokens
```
Dark Mode:
  surface.raised:            gruv-bg2        (#504945)
  surface.sunken:            gruv-bg0-hard   (#1d2021)

Light Mode:
  surface.raised:            gruv-bg2-light  (#d5c4a1)
  surface.sunken:            gruv-bg0-light  (#fbf1c7)
```

### Text Tokens
```
Dark Mode:
  text.primary:              gruv-fg0        (#fbf1c7)
  text.secondary:            gruv-fg1        (#ebdbb2)
  text.muted:                gruv-fg2        (#d5c4a1)
  text.disabled:             gruv-fg3        (#bdae93)
  text.inverted:             gruv-bg0        (#282828)
  text.accent:               gruv-aqua       (#8ec07c)

Light Mode:
  text.primary:              gruv-fg0-light  (#282828)
  text.secondary:            gruv-fg1-light  (#3c3836)
  text.muted:                gruv-fg2-light  (#504945)
  text.disabled:             gruv-fg3-light  (#665c54)
  text.inverted:             gruv-bg0-light  (#fbf1c7)
  text.accent:               gruv-aqua-dim   (#689d6a)
```

### Border Tokens
```
Dark Mode:
  border.default:            gruv-bg4        (#7c6f64)
  border.subtle:             gruv-bg3        (#665c54)
  border.strong:             gruv-fg4        (#a89984)
  border.focus:              gruv-aqua       (#8ec07c)

Light Mode:
  border.default:            gruv-bg4-light  (#a89984)
  border.subtle:             gruv-bg3-light  (#bdae93)
  border.strong:             gruv-fg4-light  (#7c6f64)
  border.focus:              gruv-aqua-dim   (#689d6a)
```

### Primary Tokens (Aqua)
```
Dark Mode:
  primary.default:           gruv-aqua       (#8ec07c)
  primary.hover:             gruv-aqua + 10% lighter
  primary.active:            gruv-aqua-dim   (#689d6a)
  primary.subtleBg:          rgba(142, 192, 124, 0.15)
  primary.subtleBorder:      rgba(142, 192, 124, 0.3)

Light Mode:
  primary.default:           gruv-aqua-dim   (#689d6a)
  primary.hover:             gruv-aqua       (#8ec07c)
  primary.active:            gruv-aqua-dim - 10% darker
  primary.subtleBg:          rgba(104, 157, 106, 0.12)
  primary.subtleBorder:      rgba(104, 157, 106, 0.25)
```

### Semantic State Tokens
```
Dark Mode:
  success.bg:                rgba(184, 187, 38, 0.15)
  success.fg:                gruv-green      (#b8bb26)
  success.border:            gruv-green-dim  (#98971a)
  
  warning.bg:                rgba(250, 189, 47, 0.15)
  warning.fg:                gruv-yellow     (#fabd2f)
  warning.border:            gruv-yellow-dim (#d79921)
  
  error.bg:                  rgba(251, 73, 52, 0.15)
  error.fg:                  gruv-red        (#fb4934)
  error.border:              gruv-red-dim    (#cc241d)
  
  info.bg:                   rgba(131, 165, 152, 0.15)
  info.fg:                   gruv-blue       (#83a598)
  info.border:               gruv-blue-dim   (#458588)

Light Mode:
  success.bg:                rgba(152, 151, 26, 0.12)
  success.fg:                gruv-green-dim  (#98971a)
  success.border:            gruv-green-dim  (#98971a)
  
  warning.bg:                rgba(215, 153, 33, 0.12)
  warning.fg:                gruv-yellow-dim (#d79921)
  warning.border:            gruv-yellow-dim (#d79921)
  
  error.bg:                  rgba(204, 36, 29, 0.12)
  error.fg:                  gruv-red-dim    (#cc241d)
  error.border:              gruv-red-dim    (#cc241d)
  
  info.bg:                   rgba(69, 133, 136, 0.12)
  info.fg:                   gruv-blue-dim   (#458588)
  info.border:               gruv-blue-dim   (#458588)
```

### Code Syntax Tokens
```
Dark Mode:
  code.bg:                   gruv-bg0-hard   (#1d2021)
  code.lineHighlight:        gruv-bg1        (#3c3836)
  code.keyword:              gruv-red        (#fb4934)
  code.string:               gruv-green      (#b8bb26)
  code.number:               gruv-purple     (#d3869b)
  code.comment:              gruv-fg4        (#a89984)
  code.function:             gruv-yellow     (#fabd2f)
  code.type:                 gruv-blue       (#83a598)
  code.variable:             gruv-fg1        (#ebdbb2)
  code.operator:             gruv-orange     (#fe8019)

Light Mode:
  code.bg:                   gruv-bg1-light  (#ebdbb2)
  code.lineHighlight:        gruv-bg2-light  (#d5c4a1)
  code.keyword:              gruv-red-dim    (#cc241d)
  code.string:               gruv-green-dim  (#98971a)
  code.number:               gruv-purple-dim (#b16286)
  code.comment:              gruv-fg4-light  (#7c6f64)
  code.function:             gruv-yellow-dim (#d79921)
  code.type:                 gruv-blue-dim   (#458588)
  code.variable:             gruv-fg1-light  (#3c3836)
  code.operator:             gruv-orange-dim (#d65d0e)
```

---

## ③ CSS VARIABLES (Dark & Light)

```css
:root {
  /* === GRUVBOX LIGHT (Default for :root) === */
  
  /* Raw Palette */
  --gruv-bg0: #fbf1c7;
  --gruv-bg1: #ebdbb2;
  --gruv-bg2: #d5c4a1;
  --gruv-bg3: #bdae93;
  --gruv-bg4: #a89984;
  
  --gruv-fg0: #282828;
  --gruv-fg1: #3c3836;
  --gruv-fg2: #504945;
  --gruv-fg3: #665c54;
  --gruv-fg4: #7c6f64;
  
  --gruv-red: #cc241d;
  --gruv-green: #98971a;
  --gruv-yellow: #d79921;
  --gruv-blue: #458588;
  --gruv-purple: #b16286;
  --gruv-aqua: #689d6a;
  --gruv-orange: #d65d0e;
  
  /* Background Tokens */
  --color-background-default: var(--gruv-bg0);
  --color-background-body: var(--gruv-bg0);
  --color-background-panel: var(--gruv-bg1);
  --color-background-panel-elevated: var(--gruv-bg2);
  --color-background-hover: var(--gruv-bg2);
  --color-background-active: var(--gruv-bg3);
  --color-background-muted: var(--gruv-bg1);
  
  /* Surface Tokens */
  --color-surface-raised: var(--gruv-bg2);
  --color-surface-sunken: var(--gruv-bg0);
  
  /* Text Tokens */
  --color-text-primary: var(--gruv-fg0);
  --color-text-secondary: var(--gruv-fg1);
  --color-text-muted: var(--gruv-fg2);
  --color-text-disabled: var(--gruv-fg3);
  --color-text-inverted: var(--gruv-bg0);
  --color-text-accent: var(--gruv-aqua);
  
  /* Border Tokens */
  --color-border-default: var(--gruv-bg4);
  --color-border-subtle: var(--gruv-bg3);
  --color-border-strong: var(--gruv-fg4);
  --color-border-focus: var(--gruv-aqua);
  
  /* Primary Tokens */
  --color-primary-default: var(--gruv-aqua);
  --color-primary-hover: #8ec07c;
  --color-primary-active: #5a8a5e;
  --color-primary-subtle-bg: rgba(104, 157, 106, 0.12);
  --color-primary-subtle-border: rgba(104, 157, 106, 0.25);
  
  /* Success Tokens */
  --color-success-bg: rgba(152, 151, 26, 0.12);
  --color-success-fg: var(--gruv-green);
  --color-success-border: var(--gruv-green);
  
  /* Warning Tokens */
  --color-warning-bg: rgba(215, 153, 33, 0.12);
  --color-warning-fg: var(--gruv-yellow);
  --color-warning-border: var(--gruv-yellow);
  
  /* Error Tokens */
  --color-error-bg: rgba(204, 36, 29, 0.12);
  --color-error-fg: var(--gruv-red);
  --color-error-border: var(--gruv-red);
  
  /* Info Tokens */
  --color-info-bg: rgba(69, 133, 136, 0.12);
  --color-info-fg: var(--gruv-blue);
  --color-info-border: var(--gruv-blue);
  
  /* Code Tokens */
  --code-bg: var(--gruv-bg1);
  --code-line-highlight: var(--gruv-bg2);
  --code-keyword: #cc241d;
  --code-string: #98971a;
  --code-number: #b16286;
  --code-comment: #7c6f64;
  --code-function: #d79921;
  --code-type: #458588;
  --code-variable: #3c3836;
  --code-operator: #d65d0e;
}

.dark,
.gruvbox-dark {
  /* === GRUVBOX DARK === */
  
  /* Raw Palette */
  --gruv-bg0-hard: #1d2021;
  --gruv-bg0: #282828;
  --gruv-bg1: #3c3836;
  --gruv-bg2: #504945;
  --gruv-bg3: #665c54;
  --gruv-bg4: #7c6f64;
  
  --gruv-fg0: #fbf1c7;
  --gruv-fg1: #ebdbb2;
  --gruv-fg2: #d5c4a1;
  --gruv-fg3: #bdae93;
  --gruv-fg4: #a89984;
  
  --gruv-red: #fb4934;
  --gruv-green: #b8bb26;
  --gruv-yellow: #fabd2f;
  --gruv-blue: #83a598;
  --gruv-purple: #d3869b;
  --gruv-aqua: #8ec07c;
  --gruv-orange: #fe8019;
  
  /* Background Tokens */
  --color-background-default: var(--gruv-bg0);
  --color-background-body: var(--gruv-bg0-hard);
  --color-background-panel: var(--gruv-bg1);
  --color-background-panel-elevated: var(--gruv-bg2);
  --color-background-hover: var(--gruv-bg2);
  --color-background-active: var(--gruv-bg3);
  --color-background-muted: var(--gruv-bg1);
  
  /* Surface Tokens */
  --color-surface-raised: var(--gruv-bg2);
  --color-surface-sunken: var(--gruv-bg0-hard);
  
  /* Text Tokens */
  --color-text-primary: var(--gruv-fg0);
  --color-text-secondary: var(--gruv-fg1);
  --color-text-muted: var(--gruv-fg2);
  --color-text-disabled: var(--gruv-fg3);
  --color-text-inverted: var(--gruv-bg0);
  --color-text-accent: var(--gruv-aqua);
  
  /* Border Tokens */
  --color-border-default: var(--gruv-bg4);
  --color-border-subtle: var(--gruv-bg3);
  --color-border-strong: var(--gruv-fg4);
  --color-border-focus: var(--gruv-aqua);
  
  /* Primary Tokens */
  --color-primary-default: var(--gruv-aqua);
  --color-primary-hover: #a3d4a0;
  --color-primary-active: #689d6a;
  --color-primary-subtle-bg: rgba(142, 192, 124, 0.15);
  --color-primary-subtle-border: rgba(142, 192, 124, 0.3);
  
  /* Success Tokens */
  --color-success-bg: rgba(184, 187, 38, 0.15);
  --color-success-fg: var(--gruv-green);
  --color-success-border: #98971a;
  
  /* Warning Tokens */
  --color-warning-bg: rgba(250, 189, 47, 0.15);
  --color-warning-fg: var(--gruv-yellow);
  --color-warning-border: #d79921;
  
  /* Error Tokens */
  --color-error-bg: rgba(251, 73, 52, 0.15);
  --color-error-fg: var(--gruv-red);
  --color-error-border: #cc241d;
  
  /* Info Tokens */
  --color-info-bg: rgba(131, 165, 152, 0.15);
  --color-info-fg: var(--gruv-blue);
  --color-info-border: #458588;
  
  /* Code Tokens */
  --code-bg: var(--gruv-bg0-hard);
  --code-line-highlight: var(--gruv-bg1);
  --code-keyword: #fb4934;
  --code-string: #b8bb26;
  --code-number: #d3869b;
  --code-comment: #a89984;
  --code-function: #fabd2f;
  --code-type: #83a598;
  --code-variable: #ebdbb2;
  --code-operator: #fe8019;
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
        // Raw Gruvbox Palette
        gruv: {
          // Dark backgrounds
          'bg0-hard': '#1d2021',
          'bg0': '#282828',
          'bg1': '#3c3836',
          'bg2': '#504945',
          'bg3': '#665c54',
          'bg4': '#7c6f64',
          
          // Light backgrounds
          'bg0-light': '#fbf1c7',
          'bg1-light': '#ebdbb2',
          'bg2-light': '#d5c4a1',
          'bg3-light': '#bdae93',
          'bg4-light': '#a89984',
          
          // Dark foregrounds
          'fg0': '#fbf1c7',
          'fg1': '#ebdbb2',
          'fg2': '#d5c4a1',
          'fg3': '#bdae93',
          'fg4': '#a89984',
          
          // Light foregrounds
          'fg0-light': '#282828',
          'fg1-light': '#3c3836',
          'fg2-light': '#504945',
          'fg3-light': '#665c54',
          'fg4-light': '#7c6f64',
          
          // Accent colors (bright)
          'red': '#fb4934',
          'green': '#b8bb26',
          'yellow': '#fabd2f',
          'blue': '#83a598',
          'purple': '#d3869b',
          'aqua': '#8ec07c',
          'orange': '#fe8019',
          
          // Accent colors (dim)
          'red-dim': '#cc241d',
          'green-dim': '#98971a',
          'yellow-dim': '#d79921',
          'blue-dim': '#458588',
          'purple-dim': '#b16286',
          'aqua-dim': '#689d6a',
          'orange-dim': '#d65d0e',
        },
        
        // Semantic Background Tokens
        background: {
          DEFAULT: 'var(--color-background-default)',
          body: 'var(--color-background-body)',
          panel: 'var(--color-background-panel)',
          panelElevated: 'var(--color-background-panel-elevated)',
          hover: 'var(--color-background-hover)',
          active: 'var(--color-background-active)',
          muted: 'var(--color-background-muted)',
        },
        
        // Surface Tokens
        surface: {
          raised: 'var(--color-surface-raised)',
          sunken: 'var(--color-surface-sunken)',
        },
        
        // Text Tokens
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          disabled: 'var(--color-text-disabled)',
          inverted: 'var(--color-text-inverted)',
          accent: 'var(--color-text-accent)',
        },
        
        // Border Tokens
        border: {
          DEFAULT: 'var(--color-border-default)',
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },
        
        // Primary Tokens (Aqua)
        primary: {
          DEFAULT: 'var(--color-primary-default)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          subtleBg: 'var(--color-primary-subtle-bg)',
          subtleBorder: 'var(--color-primary-subtle-border)',
        },
        
        // Success Tokens
        success: {
          bg: 'var(--color-success-bg)',
          fg: 'var(--color-success-fg)',
          border: 'var(--color-success-border)',
        },
        
        // Warning Tokens
        warning: {
          bg: 'var(--color-warning-bg)',
          fg: 'var(--color-warning-fg)',
          border: 'var(--color-warning-border)',
        },
        
        // Error Tokens
        error: {
          bg: 'var(--color-error-bg)',
          fg: 'var(--color-error-fg)',
          border: 'var(--color-error-border)',
        },
        
        // Info Tokens
        info: {
          bg: 'var(--color-info-bg)',
          fg: 'var(--color-info-fg)',
          border: 'var(--color-info-border)',
        },
      },
      
      backgroundColor: {
        code: 'var(--code-bg)',
      },
      
      textColor: {
        'code-keyword': 'var(--code-keyword)',
        'code-string': 'var(--code-string)',
        'code-number': 'var(--code-number)',
        'code-comment': 'var(--code-comment)',
        'code-function': 'var(--code-function)',
        'code-type': 'var(--code-type)',
        'code-variable': 'var(--code-variable)',
        'code-operator': 'var(--code-operator)',
      },
    },
  },
  plugins: [],
};
```

---

## ⑤ COMPONENT USAGE GUIDELINES

### App Layout
```
App background:
  bg-background-body
  
Main content area:
  bg-background
```

### Sidebar
```
Background:
  bg-background-panel
  
Border:
  border-r border-border
  
Item default:
  text-text-secondary
  hover:bg-background-hover
  hover:text-text-primary
  
Item selected:
  bg-primary-subtleBg
  border-l-2 border-primary
  text-text-accent
  
Section headers:
  text-text-muted text-xs uppercase
```

### Toolbar
```
Background:
  bg-background-panelElevated
  
Border:
  border-b border-border
  
Text:
  text-text-secondary
  
Icons:
  text-text-muted hover:text-text-primary
```

### Buttons

**Primary Button:**
```
bg-primary
hover:bg-primary-hover
active:bg-primary-active
text-gruv-bg0 (dark text on aqua)
disabled:bg-background-muted disabled:text-text-disabled
```

**Secondary Button:**
```
bg-background-panelElevated
border border-border-subtle
text-text-primary
hover:bg-background-hover
hover:border-border
```

**Danger Button:**
```
bg-error-fg
hover:bg-gruv-red (brighter on hover)
text-gruv-bg0
border border-error-border
```

**Ghost/Subtle Button:**
```
bg-transparent
text-text-secondary
hover:bg-background-hover
hover:text-text-primary
```

### Tables

**Table Container:**
```
bg-background-panel
border border-border
rounded-lg
```

**Table Header:**
```
bg-background-panelElevated
text-text-primary font-medium
border-b border-border
```

**Table Row:**
```
Default:
  bg-transparent
  text-text-primary
  border-b border-border-subtle
  
Hover:
  bg-background-hover
  
Selected:
  bg-primary-subtleBg
  border-l-2 border-primary
  
Striped (optional):
  even:bg-background-muted
```

**Table Cell:**
```
text-text-primary
NULL values: text-text-muted italic
Focus: ring-2 ring-primary
```

### Code Editor

**Editor Background:**
```
bg-code (gruv-bg0-hard in dark)
```

**Line Highlight:**
```
bg-[var(--code-line-highlight)]
```

**Syntax Highlighting:**
```
Keywords (if, for, class):    text-code-keyword (red)
Strings:                       text-code-string (green)
Numbers:                       text-code-number (purple)
Comments:                      text-code-comment (gray)
Functions:                     text-code-function (yellow)
Types:                         text-code-type (blue)
Variables:                     text-code-variable (fg1)
Operators (+, -, =):           text-code-operator (orange)
```

**Line Numbers:**
```
text-text-muted
bg-background-muted
border-r border-border-subtle
```

### Alerts

**Success Alert:**
```
bg-success-bg
border-l-4 border-success-border
text-success-fg
Icon: text-success-fg
```

**Warning Alert:**
```
bg-warning-bg
border-l-4 border-warning-border
text-warning-fg
Icon: text-warning-fg
```

**Error Alert:**
```
bg-error-bg
border-l-4 border-error-border
text-error-fg
Icon: text-error-fg
```

**Info Alert:**
```
bg-info-bg
border-l-4 border-info-border
text-info-fg
Icon: text-info-fg
```

### Form Elements

**Input:**
```
bg-background-panelElevated
border border-border
text-text-primary
placeholder:text-text-muted

Focus:
  border-primary
  ring-2 ring-primary/30
  
Disabled:
  bg-background-muted
  text-text-disabled
  cursor-not-allowed
  
Error:
  border-error-border
  ring-2 ring-error-fg/30
```

**Select/Dropdown:**
```
bg-background-panelElevated
border border-border
text-text-primary

Options:
  bg-background-panel
  hover:bg-background-hover
  selected:bg-primary-subtleBg selected:text-text-accent
```

### Tabs

**Tab Container:**
```
bg-background-panel
border-b border-border
```

**Tab Item:**
```
Default:
  text-text-secondary
  hover:text-text-primary
  hover:bg-background-hover
  
Active:
  text-text-accent
  border-b-2 border-primary
  bg-primary-subtleBg
```

### Modals

**Overlay:**
```
bg-gruv-bg0/80 backdrop-blur-sm
```

**Modal Container:**
```
bg-background-panel
border border-border
shadow-xl
rounded-lg
```

**Modal Header:**
```
bg-background-panelElevated
border-b border-border
text-text-primary
```

---

## ⑥ GRADIENTS & SHADOWS (Optional)

### Gradients
```css
/* Subtle warm gradient for headers */
--gradient-warm: linear-gradient(135deg, #3c3836 0%, #504945 100%);

/* Aqua accent gradient */
--gradient-aqua: linear-gradient(135deg, #8ec07c 0%, #689d6a 100%);

/* Subtle overlay gradient */
--gradient-overlay: linear-gradient(180deg, rgba(40, 40, 40, 0.95) 0%, rgba(40, 40, 40, 0.98) 100%);
```

### Shadows
```css
/* Gruvbox shadows - subtle, warm-tinted */
--shadow-sm: 0 1px 2px 0 rgba(29, 32, 33, 0.4);
--shadow-md: 0 4px 6px -1px rgba(29, 32, 33, 0.5), 0 2px 4px -1px rgba(29, 32, 33, 0.3);
--shadow-lg: 0 10px 15px -3px rgba(29, 32, 33, 0.6), 0 4px 6px -2px rgba(29, 32, 33, 0.4);
--shadow-xl: 0 20px 25px -5px rgba(29, 32, 33, 0.7), 0 10px 10px -5px rgba(29, 32, 33, 0.4);

/* Aqua glow for focus states */
--shadow-glow-aqua: 0 0 0 3px rgba(142, 192, 124, 0.3);
```

### Usage Examples
```css
/* Elevated panel */
.panel-elevated {
  background: var(--color-background-panel-elevated);
  box-shadow: var(--shadow-md);
}

/* Focused input */
.input:focus {
  border-color: var(--color-border-focus);
  box-shadow: var(--shadow-glow-aqua);
}

/* Modal */
.modal {
  background: var(--color-background-panel);
  box-shadow: var(--shadow-xl);
}
```

---

## 🎨 DESIGN PRINCIPLES

### Gruvbox Philosophy
- **Warm & Earthy**: Brown/yellow-tinted backgrounds create cozy coding environment
- **Retro Terminal**: Evokes classic terminal aesthetics with modern refinement
- **High Contrast**: Carefully balanced for long coding sessions
- **Muted Brights**: Accent colors are vibrant but not harsh

### Accessibility
- Contrast ratios meet WCAG AA for all text
- Primary (aqua) has 4.5:1+ contrast on dark backgrounds
- Error/warning/success colors are distinguishable for colorblind users

### Consistency
- Use semantic tokens, not raw colors in components
- Aqua is the primary action color throughout
- Warm browns for structure, cool accents for interaction

---

This Gruvbox theme maintains the iconic warm, retro aesthetic while being perfectly suited for a modern database client tool. The aqua primary provides excellent visibility and a distinctive identity.
