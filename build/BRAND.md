# Lazify icon

A continuous ribbon forms an open run symbol. The triangular silhouette
suggests execution; the diagonal opening gives the shape a workflow entrance.
It represents bringing projects, commands, and agents into one action.
The design uses a single silhouette with rounded outer turns and precise
inner cuts, without a letter monogram or a collection of tool pictograms.

The desktop source is `app-icon.svg`: emerald `#10B981`, a mint `#5EEAD4`
highlight and deep emerald `#059669` on navy `#0B1220`.
`lazify-mark.svg` is a transparent, monochrome SVG using
`currentColor`. Inline it and set CSS `color`, or use it as a CSS mask with
`background-color: currentColor`. An SVG loaded through `<img>` does not inherit
its parent's color.

The renderer's `Logo` uses `--color-accent` for the entire mark. Changing the
app's accent or light/dark theme updates it automatically. Pass `color` to
override the whole mark.
Packaged desktop icons and the website favicon retain the original emerald;
they do not change with the in-app accent setting.

Run `node src/scripts/generate-icons.mjs` with the project's installed `sharp`
package to regenerate PNG sizes, ICO, ICNS, the macOS Icon Composer artwork,
and the website icon. Keep the path in `lazify-mark.svg` and
`src/renderer/assets/logo.tsx` in sync when changing the source geometry.
