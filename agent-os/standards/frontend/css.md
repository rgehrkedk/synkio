## CSS best practices

### Synkio Dashboard CSS Standards

**CSS Modules Required:**
- **Use CSS Modules**: All component styles MUST use CSS Modules (`.module.css`)
- **File Convention**: `Component.tsx` + `Component.module.css`
- **Import Pattern**: `import styles from './Component.module.css'`
- **Class Names**: Use camelCase in CSS Modules (e.g., `.tokenCard`, `.colorSwatch`)
- **NO Tailwind**: Do NOT use Tailwind CSS or utility-first CSS approaches

**Styling Principles:**
- **Component Scoping**: CSS Modules automatically scope styles to components - use this
- **Semantic Classes**: Use meaningful class names that describe purpose, not appearance
- **Custom Properties**: Use CSS custom properties (`--color-primary`) for theming, colors, spacing
- **Dark Mode**: Support dark mode with CSS custom properties and `data-theme` attribute
- **Mobile-First**: Write styles mobile-first, then enhance for larger screens with `@media (min-width: ...)`
- **Relative Units**: Use `rem` for spacing/typography, `%` for widths, avoid fixed `px` values

**Token Visualization Styles:**
- **Color Swatches**: Display design tokens as visual swatches with proper borders and labels
- **Typography Samples**: Render type tokens with actual font properties applied live
- **Spacing Grid**: Visual representation of spacing scale with boxes
- **Responsive Tables**: Token tables should stack/scroll on mobile

**Accessibility:**
- **Color Contrast**: Maintain WCAG AA contrast ratios (4.5:1 for text, 3:1 for UI)
- **Focus Indicators**: Clear, visible focus styles for keyboard navigation (2px outline minimum)
- **Reduced Motion**: Respect `prefers-reduced-motion` for animations/transitions
- **Theme Support**: Support `prefers-color-scheme` for automatic light/dark theme detection

**Best Practices:**
- **No Inline Styles**: Keep styles in CSS Modules except for truly dynamic values (e.g., `background-color: token.value`)
- **Minimize Specificity**: Prefer single class selectors, avoid nesting beyond 2 levels
- **No Global Styles**: Use CSS Modules to avoid global namespace pollution
- **Consistent Spacing**: Use a spacing scale based on 4px (e.g., 4px, 8px, 16px, 24px, 32px, 48px)
- **Design Tokens**: Store reusable values in CSS custom properties in a global `variables.css`
