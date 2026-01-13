/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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

        success: {
          DEFAULT: 'var(--color-success)',
          bg: 'var(--color-success-bg)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          bg: 'var(--color-warning-bg)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          bg: 'var(--color-error-bg)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
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

        // Legacy support for existing components
        bg: {
          0: "var(--bg-0)",
          1: "var(--bg-1)",
          2: "var(--bg-2)",
          3: "var(--bg-3)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          muted: "var(--accent-muted)",
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
        'float': 'var(--shadow-float)',
        'glow': 'var(--shadow-glow)',
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },

      ringColor: {
        DEFAULT: 'var(--color-focus-ring)',
      },

      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        '2xs': ['0.5625rem', { lineHeight: '1.25' }], // 9px
        'xs': ['0.6875rem', { lineHeight: '1.5' }],   // 11px
        'sm': ['0.8125rem', { lineHeight: '1.5' }],   // 13px
        'base': ['0.875rem', { lineHeight: '1.5' }],  // 14px
        'lg': ['1rem', { lineHeight: '1.5' }],        // 16px
        'xl': ['1.125rem', { lineHeight: '1.5' }],    // 18px
        '2xl': ['1.25rem', { lineHeight: '1.5' }],    // 20px
        '3xl': ['1.375rem', { lineHeight: '1.4' }],   // 22px
        '4xl': ['1.5rem', { lineHeight: '1.3' }],     // 24px
        '5xl': ['1.75rem', { lineHeight: '1.2' }],    // 28px
        '6xl': ['2rem', { lineHeight: '1.1' }],       // 32px
      },
    },
  },
  plugins: [],
};
