Modern UI design has moved away from hardcoded, pixel-perfect layouts toward systematic, math-driven design systems. This approach ensures interfaces remain scalable, accessible, and consistent across thousands of screens and multiple themes (like light and dark mode).

Here are the governing principles for colors, theming, and typography.

## 1. Color: Semantic, Not Literal

Instead of naming colors by what they look like (`blue-500` or `red-dark`), modern systems name colors by what they *do*.

* **Semantic Tokens:** A button's background isn't `#0052CC`; it is `color-action-primary`. If the brand rebrands to green, you only update the token value once.
* **The 60-30-10 Rule:** To avoid visual clutter, UIs distribute color proportionally. 60% of the screen is the dominant background (usually white, light gray, or dark gray), 30% is a secondary surface color (like cards or sidebars), and 10% is reserved for high-visibility accent colors (buttons, toggles, active states).
* **Accessibility (WCAG AA):** Contrast is non-negotiable. Text must maintain at least a 4.5:1 contrast ratio against its background. Modern palettes are often generated specifically to guarantee these ratios at every step of the scale.

---

## 2. Theming: Dark Mode as a First-Class Citizen

Dark mode is not simply an inverted light theme; it requires its own structural rules, particularly regarding depth and contrast.

* **Elevation via Lightness, Not Shadows:** In light mode, you create a sense of depth (elevation) by adding drop shadows under cards or modals. In dark mode, shadows are invisible against dark backgrounds. Instead, modern UIs elevate elements by making their background color *lighter* (closer to white) the closer they get to the user.
* **Avoid Pure Black and Pure White:** Pure black (`#000000`) causes extreme eye strain when white text is placed on top of it (a halation effect). Dark themes use dark grays (e.g., `#121212`) for backgrounds. Similarly, pure white text is often softened to a very light gray (e.g., `rgba(255,255,255,0.87)`) to reduce glare.
* **Desaturating Accents:** Bright, saturated primary colors that look great on white will vibrate and cause visual fatigue on dark backgrounds. Accent colors in dark mode are typically desaturated (moved closer to pastel) to maintain readability.

## 3. Typography: The Modular Scale

Typography in modern UI is about establishing an undeniable visual hierarchy so users know exactly what to read first, second, and third.

---

* **Mathematical Scaling:** Font sizes are no longer picked arbitrarily. They follow a "modular scale"—a mathematical ratio (like 1.250 or 1.125) where each font size is multiplied by the ratio to get the next size up. This creates a rhythm that feels naturally balanced.
* **Weight and Color over Size:** You don't always need to make text bigger to make it important. A modern UI often creates hierarchy by keeping text the same size but dropping the font weight (from Bold to Regular) or dropping the color contrast (from `text-primary` black to `text-secondary` gray).
* **Fluid Typography:** Rather than using rigid breakpoints (e.g., changing from 16px to 18px at exactly 768px screen width), modern typography uses fluid equations (`clamp()` in CSS) so the font size scales smoothly alongside the viewport width.

You can experiment with these math-driven principles below to see how a base font size and a modular ratio cascade through an entire interface, and how semantic colors map differently between light and dark themes.
