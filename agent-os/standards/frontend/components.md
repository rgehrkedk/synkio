## UI component best practices

### Dashboard Components (Next.js + React)
When building the dashboard, follow these React/Next.js conventions:

**Component Structure:**
- **Single Responsibility**: Each component should have one clear purpose and do it well
- **Reusability**: Design components to be reused across different contexts with configurable props
- **Composability**: Build complex UIs by combining smaller, simpler components rather than monolithic structures
- **File Location**: Organize by feature (e.g., `app/(dashboard)/preview/components/`)

**Component Conventions:**
- **Naming**: PascalCase for components (e.g., `TokenPreview.tsx`, `ColorPalette.tsx`)
- **Client vs Server**: Mark client components with `'use client'` directive when needed
- **Props Interface**: Define props with TypeScript interface (e.g., `interface TokenPreviewProps`)
- **Clear Interface**: Define explicit, well-documented props with sensible defaults for ease of use
- **State Management**: Keep state as local as possible; lift it up only when needed by multiple components
- **Minimal Props**: Keep the number of props manageable; if a component needs many props, consider composition or splitting it

**Token Visualization Components:**
- **ColorPalette**: Display color tokens as swatches with hex/rgba values
- **TypographyScale**: Render type tokens with actual font properties
- **SpacingGrid**: Show spacing tokens visually
- **TokenTree**: Display hierarchical token structure

**Styling & UI:**
- **CSS Modules**: Use CSS Modules for component styling (NOT Tailwind)
- **File Convention**: `Component.tsx` + `Component.module.css`
- **Radix UI**: Use Radix UI primitives for complex components (dialogs, dropdowns, etc.)
- **Accessibility**: Follow Radix UI patterns for keyboard navigation and ARIA labels
- **Dark Mode**: Support dark mode from the start using CSS custom properties
- **No Utility Classes**: Avoid utility-first CSS; write semantic, component-scoped styles

### Figma Plugin UI
Plugins use HTML + vanilla JavaScript/TypeScript (no React):

- **File Structure**: `src/ui.html` + `src/code.ts`
- **Styling**: Inline CSS or Figma plugin CSS variables
- **Messaging**: Use `parent.postMessage` for plugin ↔ UI communication
- **Keep Simple**: Minimal UI, focus on functionality
