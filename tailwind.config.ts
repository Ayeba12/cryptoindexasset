import type { Config } from "tailwindcss";

/**
 * Colour tokens as functions so Tailwind 3.4 opacity modifiers work on the
 * semantic palette (`bg-primary/80`, `ring-foreground/10`, `border-border/60`).
 *
 * Tailwind 3.4 calls a colour function in three ways:
 *   - plain utility (`bg-primary`): `{ opacityVariable, opacityValue: "var(--tw-bg-opacity, 1)" }`
 *   - opacity modifier (`bg-primary/80`, `bg-primary/[0.35]`): `{ opacityValue: "0.8" }`
 *   - non-alpha plugins (`fill-`, `stroke-`, `outline-`): `{}`
 *
 * Plain usage must stay `var(--token)` (the tokens are oklch strings that Tailwind
 * cannot parse), so anything that is not a bare number falls through to the plain
 * variable. A bare number becomes a `color-mix()` against transparent, which keeps
 * the oklch token intact and works for the `oklch(1 0 0 / 10%)` border tokens too.
 */
type TokenArgs = { opacityValue?: string; opacityVariable?: string };
type TokenFn = (args: TokenArgs) => string;

const token = (name: string): TokenFn => {
  return ({ opacityValue }: TokenArgs) => {
    if (opacityValue === undefined || opacityValue === "1" || opacityValue.startsWith("var(")) {
      return `var(--${name})`;
    }
    const amount = opacityValue.endsWith("%") ? opacityValue : `calc(${opacityValue} * 100%)`;
    return `color-mix(in oklab, var(--${name}) ${amount}, transparent)`;
  };
};

const semanticColors = {
  background: token("background"),
  foreground: token("foreground"),
  card: {
    DEFAULT: token("card"),
    foreground: token("card-foreground"),
  },
  popover: {
    DEFAULT: token("popover"),
    foreground: token("popover-foreground"),
  },
  primary: {
    DEFAULT: token("primary"),
    foreground: token("primary-foreground"),
  },
  secondary: {
    DEFAULT: token("secondary"),
    foreground: token("secondary-foreground"),
  },
  muted: {
    DEFAULT: token("muted"),
    foreground: token("muted-foreground"),
  },
  accent: {
    DEFAULT: token("accent"),
    foreground: token("accent-foreground"),
  },
  destructive: {
    DEFAULT: token("destructive"),
    foreground: token("destructive-foreground"),
  },
  border: token("border"),
  input: token("input"),
  ring: token("ring"),
  chart: {
    1: token("chart-1"),
    2: token("chart-2"),
    3: token("chart-3"),
    4: token("chart-4"),
    5: token("chart-5"),
  },
  sidebar: {
    DEFAULT: token("sidebar"),
    foreground: token("sidebar-foreground"),
    primary: token("sidebar-primary"),
    "primary-foreground": token("sidebar-primary-foreground"),
    accent: token("sidebar-accent"),
    "accent-foreground": token("sidebar-accent-foreground"),
    border: token("sidebar-border"),
    ring: token("sidebar-ring"),
  },
};

// Tailwind's published types only describe string colour values, but the runtime
// has supported `({ opacityValue }) => string` colour functions since v3.0.
type ThemeColors = NonNullable<NonNullable<Config["theme"]>["extend"]>["colors"];

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: semanticColors as unknown as ThemeColors,
      fontFamily: {
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        heading: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.45rem",
        sm: "0.35rem",
        md: "0.45rem",
        lg: "0.55rem",
      },
    },
  },
  plugins: [],
};

export default config;
