# Phase 1 design decisions

This Phase 1 design was independently approved. Phase 2 preserves its visual identity; see [Phase 2 visual review](phase2-visual-review.md) for the necessary functional changes.

## Concept

“Still” is a provisional identity for a quiet daily workspace. A warm neutral canvas, restrained indigo controls, self-hosted DM Sans, and understated sage accents give the interface a coherent voice. The identity is original to this prototype and remains subject to owner review.

The primary hierarchy is date → current view → workload → task groups. A compact sidebar supports navigation. The desktop reminder provides breathing room without competing with task actions. That decorative panel is removed below 1190px to preserve useful task space.

## Tokens and components

`src/styles.css` defines semantic canvas, sidebar, surface, subtle surface, text, muted text, border, accent, success, warning, focus, and scrim tokens. Light and dark themes share markup and use different token values. Dark mode uses a light indigo primary control with dark text; it is not a literal inversion of the light theme.

Tailwind is integrated through its official Vite plugin. The `@theme` block records the font, 4px spacing unit, and 6/10/16/24px radius scale. Purpose-named CSS classes keep the prototype's component styling in one inspectable place. Radii distinguish controls from larger surfaces. Shadows are restrained and semantic. Most layout spacing follows 8/12/16/20/24/32px steps, with optical adjustments where necessary.

Task titles are 14px with 11px metadata and generous line height. Display headings are larger with modest negative tracking. Priority has a text label and icon, overdue dates have readable text, and completion has a checkmark plus a text status for assistive technology. Color is never the only status indicator. Minor editorial captions use a smaller scale; reviewing comfortable readability remains part of owner visual review.

Fonts ship with the build and fall back to system sans-serif. Icons are inline local SVG. The reminder illustration is CSS geometry, marked decorative; it requires no generated image or remote asset.

## Responsive behavior

- Wide desktop: 232px sidebar, flexible task area, secondary reminder panel.
- Intermediate desktop/tablet: narrower sidebar, single task column, reduced decorative content.
- At 620px and below: the sidebar becomes an intentional three-item navigation row; themes sit beside the brand; the workload summary stacks vertically; task labels wrap naturally.
- At narrow phone widths: essential task information remains visible, while redundant navigation counts may disappear. Normal priority labels are hidden only at the narrowest breakpoint; the editor still exposes the full fixture detail.
- Mobile editor: full-height modal with native scrolling and controls sized to avoid iOS input zoom. Desktop editor: centered, bounded-height panel.

The documented browser suite checks 1440, 768, 390, 360, and 320 CSS-pixel widths in both themes, including open dialogs and state screens.

## Interaction and accessibility

- Native buttons/selects/inputs and a named native modal dialog.
- Skip link, visible 3px focus outlines, current-navigation annotation, and pressed-state theme buttons.
- Task titles open an editor preview. Completion markers are static status illustrations, not fake toggle buttons.
- Save is disabled and accompanied by explicit preview-only copy. No task mutation is performed.
- Editor opening focuses the title. Tab and Shift+Tab wrap between modal controls; Escape and both close controls dismiss it. Focus returns to the opener.
- Background colors change immediately when themes/scenes change, avoiding intermediate low-contrast combinations. Border/shadow transitions use 150ms; reduced-motion disables transitions and animations.
- System theme reacts to system changes while selected; explicit theme choices last only until refresh.

## Prototype boundaries

The visible design-preview notice and scenario selector intentionally expose the review status. All tasks, counts, contexts, and dates are synthetic. Empty and error states are selectable fixtures. The error state explicitly says no data was read, changed, or removed. The “Return to sample tasks” action changes the fixture rather than pretending to repair storage.

Search, sorting, filters, persistence, task mutations, project navigation, and backup/restore are absent. Future implementation must receive separate approval.
