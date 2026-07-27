```markdown
# The Design System: Operational Elegance

## 1. Overview & Creative North Star
**The Creative North Star: "The Architectural Curator"**

Facility management is often perceived as a chaotic, high-stakes environment. This design system seeks to counteract that chaos with a sense of "Architectural Curator"—a philosophy where the UI acts as a calm, authoritative structure that organizes complex data into a serene, editorial experience. 

We move beyond the "generic SaaS dashboard" by embracing **intentional asymmetry** and **tonal depth**. Instead of rigid, boxed-in grids, we use breathing room and sophisticated layering to guide the user’s eye. The system feels less like a software tool and more like a high-end digital concierge—precise, premium, and inherently trustworthy.

---

## 2. Colors & Surface Philosophy
The palette utilizes deep professional blues (`primary`) to ground the experience, with `secondary` (success) and `tertiary` (alert) accents serving as high-precision signals.

### The "No-Line" Rule
**Explicit Instruction:** Prohibit the use of 1px solid borders for sectioning or containment. 
Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background provides all the separation a user needs. This "borderless" approach removes visual noise and makes the interface feel expansive and modern.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of fine paper or frosted glass.
- **Base:** `surface` (#fdf8fd)
- **Primary Workspaces:** `surface-container-low` (#f7f2f8)
- **Nested Content/Cards:** `surface-container-lowest` (#ffffff) to create a subtle "lift."
- **Actionable Overlays:** `surface-container-highest` (#e5e1e7)

### The "Glass & Gradient" Rule
To avoid a flat, "standard" feel, use **Glassmorphism** for floating elements (like sidebars or pop-overs). Utilize semi-transparent surface colors with a `backdrop-blur` of 12px-20px. 
**Signature CTA Texture:** For primary buttons or high-level hero cards, apply a subtle linear gradient transitioning from `primary` (#00346f) to `primary_container` (#004a99) at a 135-degree angle. This adds "soul" and depth that flat color cannot achieve.

---

## 3. Typography: Editorial Precision
The system pairs **Manrope** (Display/Headlines) with **Inter** (Body/Labels) to balance character with readability.

- **Display & Headlines (Manrope):** High-end, geometric, and authoritative. Use `display-lg` for high-level analytics and `headline-sm` for section titles to create an editorial rhythm.
- **Body & Labels (Inter):** Highly legible and neutral. Inter handles the "heavy lifting" of data tables and facility logs, ensuring zero fatigue during long sessions.
- **Hierarchy through Contrast:** Always pair a `headline-md` (Manrope, Bold) with `body-md` (Inter, Regular) to establish a clear "Source of Truth" for every view.

---

## 4. Elevation & Depth
We define hierarchy through **Tonal Layering** rather than traditional structural lines.

### The Layering Principle
Depth is achieved by "stacking" surface-container tiers. 
*Example:* Place a `surface-container-lowest` card on a `surface-container-low` section. The contrast between these two tokens creates a soft, natural lift without needing a single drop shadow.

### Ambient Shadows
When a "floating" effect is mandatory (e.g., a modal or a floating action button):
- **Blur:** 24px–40px.
- **Opacity:** 4%–8%.
- **Color:** Use a tinted version of `on-surface` (#1c1b1f) rather than pure black. This mimics natural light reflecting off a surface.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in high-contrast dark mode), use a **Ghost Border**: the `outline_variant` token at 15% opacity. **Never use 100% opaque borders.**

---

## 5. Components

### Sidebar Navigation
- **Structure:** Use `surface-container` as the base.
- **Grouping:** Use `title-sm` for group headers with a `6` (1.3rem) spacing scale above the group.
- **Active State:** Avoid a simple color change. Use a subtle `primary_fixed` background with a vertical "pill" indicator (4px wide, `primary` color) on the leading edge.

### Data Tables & Analytics Cards
- **The "No-Divider" Rule:** Forbid the use of divider lines between rows. Use `2` (0.4rem) vertical white space to separate data points and a `surface-container-lowest` background for the entire table container.
- **Status Badges:** Use `secondary_container` for "Live" and `tertiary_fixed` for "Alerts." Keep corners at `full` (pill) for high-contrast visibility against the rectangular grid.

### Input Fields
- **Styling:** Use `surface-container-highest` for the input background. 
- **Focus:** No heavy borders. On focus, transition the background to `surface-container-lowest` and apply a 2px "Ghost Border" using `primary`.

### Buttons
- **Primary:** `primary` background with `on_primary` text. Use a `md` (0.75rem) corner radius. 
- **Secondary:** Transparent background with a `primary` Ghost Border (20% opacity).
- **Sizing:** Use Spacing Scale `4` (0.9rem) for vertical padding and `8` (1.75rem) for horizontal.

---

## 6. Do’s and Don’ts

### Do
- **Do** prioritize white space over lines. If a section feels cluttered, increase the spacing from `5` (1.1rem) to `8` (1.75rem) before considering a divider.
- **Do** use `primary_fixed` for subtle highlights in dark mode to maintain readability without overwhelming the eye.
- **Do** use the `lg` (1rem) corner radius for large analytics cards and the `DEFAULT` (0.5rem) for smaller buttons and inputs to create a "nested" visual language.

### Don't
- **Don't** use pure black (#000000) for shadows or text. Use `on_surface` or `on_surface_variant` to keep the palette sophisticated.
- **Don't** use standard 1px borders. If you feel the need to "box" something, your background color contrast isn't strong enough.
- **Don't** use the `secondary` (green) or `tertiary` (red) colors for anything other than status and intent. They are precision tools, not decorative elements.

---

## 7. Motion & Interaction (Director’s Note)
Interactions should feel **viscous**—neither instant nor sluggish. When a user hovers over a facility card, transition the background color from `surface-container-low` to `surface-container-lowest` over 250ms with a `cubic-bezier(0.4, 0, 0.2, 1)` curve. This subtle "glow" provides premium feedback that reinforces the Architectural Curator identity.```