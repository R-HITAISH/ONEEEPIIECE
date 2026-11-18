# ONEPIECE redesign plan

## Direction

Quiet, photo-led premium streetwear. The piece and its written story are the focus. The single decorative motif is a physical swing tag: squared rectangle, hairline border, small punched hole, useful garment facts, and a short story excerpt. Product photography remains square-cornered and unframed.

## Palette

Keep the approved CSS/Tailwind token values already in the repository. Use white as the principal canvas; paper is a soft supporting surface rather than a cream-colored page wash.

| Role | Token | Value | Use |
|---|---|---|---|
| Porcelain | `--surface` | `#FFFFFF` | Main page canvas, forms |
| Paper | `--paper` | `#F6F4EF` | Quiet supporting surfaces and button text |
| Stone | `--sunken` | `#ECE9E1` | Image fallback and subdued controls |
| Carbon | `--ink` | `#141414` | Main type and primary buttons |
| Graphite | `--ink-2` | `#5C5A55` | Body-secondary text and labels |
| Brass | `--brass` / `--brass-text` | `#A67C34` / `#7A5A22` | Mark/focus/story rule / readable small text |

The existing `--night`, `--night-ink`, `--error`, `--success`, and hairline values also stay unchanged. Hairlines are dividers only. Brass is never used for small text; `--brass-text` is used for readable brass-colored text. Main text is carbon on white/paper/stone; supporting text is graphite. Error text uses the error token; success text uses the success token. White or paper text sits on carbon/night surfaces. The fixed token pairs exceed WCAG AA for text: graphite is at least 5.26:1 on the light surfaces; brass-text is at least 5.12:1; carbon exceeds 15:1; error exceeds 5.5:1; night-ink on night exceeds 17:1. Brass for focus outlines has 3.46:1 against paper and is not used as text.

## Type roles

- Anton, uppercase, for display headings only: hero `clamp(3.5rem, 9vw, 9rem)`, 0.92 line-height; H2 `clamp(2rem, 4.5vw, 3.75rem)`, 1 line-height.
- Work Sans for body, labels, tags, navigation, prices, forms. Body is 1rem/1.6 with a 65ch measure. Stories are 1.1875rem/1.7 at 62ch; their lead sentence is 1.375rem/1.5, weight 500.
- Small labels are 0.875rem, sentence case, graphite. Tag names are Work Sans 1.25rem, weight 500. Prices use tabular numerals.
- Self-host both families with `@fontsource`; remove the remote Google font import and every Fraunces/Impact reference.

## Layout concept

Home:

```text
┌──────────────────────────────────────────────────────────────┐
│ [mark] [wordmark]       Shop  Sell to us       Account  Bag  │
├──────────────────────────────────────────────────────────────┤
│  Every piece has       │                         4:5 piece   │
│  a story.              │                                     │
│  Subline, ink-2        │       ┌────────────┐                │
│  [Shop pieces]         │       │ punched tag│                │
│                        │       └────────────┘                │
├──────────────────────────────────────────────────────────────┤
│ Stories: newest three with a written story                  │
│ Shop: newest four pieces                                    │
├──────────────────────────────────────────────────────────────┤
│ Found. / Checked. / Yours to wear. — quiet night band       │
├──────────────────────────────────────────────────────────────┤
│ Have something to sell?                                     │
└──────────────────────────────────────────────────────────────┘
```

Product:

```text
┌──────────────────────────────────────────────────────────────┐
│ [photo] [vertical thumbnails] │ ┌──────────────────────────┐ │
│                               │ │ punched hang tag         │ │
│                               │ │ name / size / condition  │ │
│                               │ │ price / Add to bag       │ │
│                               │ └──────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│             centered story, max 62ch, no heading             │
├──────────────────────────────────────────────────────────────┤
│       measurements and brand, two columns with hairlines     │
└──────────────────────────────────────────────────────────────┘
```

On mobile the hero photo comes first, then its tag and copy; the product gallery becomes a horizontal snap strip before the tag. Shop uses two columns at mobile, three at tablet, four at desktop. Page width is 1360px, with 16px mobile and 28px desktop grid gaps. Images have no radius; buttons have no radius and are 52px tall; inputs use a 4px radius. There are no card shadows, gradients, or rounded card shells.

## One memorable element

The hang tag is the only decorative object. It carries the name, size, condition, price, and up to 90 characters of the stored story, cut at a word boundary. A photo-less piece uses a simple stone block. The tag swings once on the home hero; reduced-motion users see it still. No scroll reveals, parallax, or looping animation.

## Generic-default review and revisions

- **Warm cream + serif display:** the inspected site used a Fraunces serif and warm tinted page background. Replaced the serif with self-hosted Anton headings and made white the principal canvas; token values remain unchanged as required.
- **Terracotta accent:** rejected. The established brass tokens remain for mark, focus and story rule; brass-text is reserved for readable text.
- **Rounded SaaS cards and shadows:** rejected. The tag alone has a 2px corner; page sections stay flat with 1px dividers. Remove card shadows and decorative rounded panels.
- **All-caps eyebrow labels:** rejected. Labels use sentence case, Work Sans and graphite.
- **Arrows on buttons:** rejected. Primary calls to action use plain text; remove arrow icons and arrow glyphs from UI copy.
- **Unsequenced numbered steps:** rejected. Remove decorative number prefixes. Keep numbering only where it represents a real order or chronology.

## Quality checks before implementation

Commerce, auth, cart locks, checkout, payment calculations, coupons, RLS, route names, and mail/order logic stay untouched. Stories render as ordinary React text. No story is synthesized for products that lack one. The `?data=worst` fixtures are available only in development and are omitted from production builds.
