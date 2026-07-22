---
name: playful-doc-console-ui
description: Build playful, polished documentation-console style UI surfaces and components. Use when creating or reworking doc pages, option pickers, admin content hubs, component galleries, archive browsers, route explorers, or any internal tool surface that should feel expressive, tactile, and premium while staying consistent with an existing Tailwind/React design system.
---

# Playful Doc Console UI

## Direction

Use a playful documentation-console style: a refined admin surface with document-card artwork, abstract geometric shapes, tactile hover motion, small status badges, and clear information architecture.

The result should feel like a premium internal archive console, not a marketing landing page and not a plain settings screen.

## Structure

Build the screen in this order:

1. Outer content frame: one strong `backgroundPrimary` surface with rounded corners, border, shadow, and clipped abstract shapes.
2. Header area: compact badge/icon cluster, clear title, short supporting copy.
3. Optional metric/status tiles: 2-3 compact `backgroundSecondary` tiles with icons and short labels.
4. Main option/content panel: `backgroundSecondary` panel that holds the interactive cards or content blocks.
5. Interactive options: large tactile cards with icon artwork, concise copy, path/status metadata, and an action affordance.

Keep card nesting intentional. A framed landing surface may contain a panel of option cards, but avoid putting small repeated cards inside more decorative cards unless the nesting expresses a real hierarchy.

## Visual Rules

- Use the project's existing typography components, controls, icons, and utilities.
- Use `clsx` for conditional or multi-branch class composition.
- Use one accent system: lime for primary action/energy, amber for document tags and secondary highlights, slate for structure.
- Use visible light-mode tint and borders; avoid flat white blocks.
- Use abstract shapes sparingly: rotated rounded squares, circles, slim capsules, document sheets, folded corners, and small grid marks.
- Do not create gradients unless the local design already relies on them.
- Do not use decorative blobs/orbs/bokeh.
- Keep radii in the existing product range, commonly `rounded-[18px]`, `rounded-[20px]`, `rounded-[22px]`, or `rounded-[24px]`.
- Keep shadows functional and tactile: default shadows on main surfaces, stronger hover shadows on interactive cards.

## Motion

Use motion to make the cards feel physical:

- Stagger initial card reveal with a short delay.
- On hover, lift cards with `y: -6` to `y: -8`, slight `scale: 1.01` to `1.02`, and a very small rotate of about `1deg`.
- On tap, compress to about `scale: 0.98`.
- Add CSS transform transitions to internal artwork so sheets, badges, or shapes move independently on hover.
- Keep animation fast and crisp; prefer `0.25s` to `0.5s`.

Use `framer-motion` when the project already depends on it. Otherwise use CSS transitions.

## Option Card Pattern

Each option card should include:

- A document-artwork area: layered sheets, folded corner, icon chip, and one small mode-specific mark.
- A small pill badge with an icon and short status/category text.
- A clear label and one to two lines of copy.
- A footer row with a path, status, or scope marker and a circular arrow/action icon.

Keep the card clickable as one target using the project's existing button/ripple component when available.

## Copy

Use short operational copy:

- Labels: `Route Documentation`, `Shared Components`, `Documentation Console`
- Badges: `Pages`, `Reusable`, `Ready to browse`
- Supporting copy should describe what opens or what the user can inspect, not explain the UI.

Avoid instructional paragraphs, feature tours, and visible keyboard shortcut explanations inside the app.

## Implementation Notes

- Keep page-specific content in the page folder.
- Only create shared components when there is clear reuse across multiple content areas.
- Preserve existing route behavior, filters, selection state, API contracts, and error handling.
- For admin/detail pages, keep the layout dense but designed: hero/header, sections, field cards, action row.
- Run formatter and targeted lint checks on touched files.

## React/Tailwind Sketch

Use this as a shape reference, not a full template:

```tsx
<section className="backgroundPrimary shadow-default relative overflow-hidden rounded-[24px] border border-slate-300 p-[14px] dark:border-slate-700 md:p-[20px]">
  <div className="pointer-events-none absolute top-[22px] right-[22px] h-[132px] w-[132px] rotate-12 rounded-[32px] border border-amber-300/60 bg-amber-100/40 dark:border-amber-300/30 dark:bg-amber-300/10" />

  <div className="relative grid gap-[22px] lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
    <header>
      <div className="mb-[18px] flex items-center gap-[12px]">
        <div className="bg-limegreen shadow-limegreen/30 flex h-[46px] w-[46px] items-center justify-center rounded-[16px] text-white shadow-md">
          <Icon className="h-[20px] w-[20px]" />
        </div>
        <div>
          <SubText className="text-limegreen text-[10px]! font-semibold! tracking-[0.16em] uppercase">
            Infinity archive
          </SubText>
          <Label className="mt-[3px] text-[18px]! leading-[24px]!">
            Documentation Console
          </Label>
        </div>
      </div>
      <Label className="text-[32px]! leading-[38px]! md:text-[40px]! md:leading-[48px]!">
        Choose the documentation map you want to open.
      </Label>
    </header>
  </div>
</section>
```
