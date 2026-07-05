# Design System - Spacing & Layout Tokens

## Spacing Scale (8px Base Unit)

```
0:   0px
1:   4px   (quarter unit)
2:   8px   (base unit)
3:   12px  (1.5x)
4:   16px  (2x)
5:   20px  (2.5x)
6:   24px  (3x)
8:   32px  (4x)
10:  40px  (5x)
12:  48px  (6x)
16:  64px  (8x)
20:  80px  (10x)
24:  96px  (12x)
```

---

## Usage Guidelines

### Padding (Interior Spacing)

| Component | Top/Bottom | Left/Right |
|-----------|-----------|-----------|
| Button (md) | spacing-3 | spacing-4 |
| Button (lg) | spacing-4 | spacing-6 |
| Card | spacing-6 | spacing-6 |
| Input | spacing-3 | spacing-4 |
| Badge | spacing-2 | spacing-3 |

### Margin (Exterior Spacing)

| Element | Margin |
|---------|--------|
| Paragraph | spacing-4 bottom |
| Heading (H2) | spacing-8 bottom |
| Heading (H3) | spacing-6 bottom |
| Section | spacing-12 bottom |

### Gaps (Between Items)

| Layout | Gap |
|--------|-----|
| Button group | spacing-2 |
| List items | spacing-3 |
| Grid (desktop) | spacing-6 |
| Grid (mobile) | spacing-4 |

---

## CSS Implementation

```css
:root {
  --spacing-0: 0px;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;
  --spacing-20: 80px;
  --spacing-24: 96px;
}

/* Utility Classes */
.p-2  { padding: var(--spacing-2); }
.p-3  { padding: var(--spacing-3); }
.p-4  { padding: var(--spacing-4); }
.p-6  { padding: var(--spacing-6); }

.px-4 { padding-left: var(--spacing-4); padding-right: var(--spacing-4); }
.py-3 { padding-top: var(--spacing-3); padding-bottom: var(--spacing-3); }

.m-2  { margin: var(--spacing-2); }
.m-4  { margin: var(--spacing-4); }
.mb-6 { margin-bottom: var(--spacing-6); }

.gap-2 { gap: var(--spacing-2); }
.gap-3 { gap: var(--spacing-3); }
.gap-4 { gap: var(--spacing-4); }
.gap-6 { gap: var(--spacing-6); }
```

---

## Breakpoints

```
Mobile:  0px - 480px (base)
Tablet:  481px - 768px
Desktop: 769px - 1200px
Wide:    1201px+
```

---

## Responsive Spacing

On mobile, reduce spacing by one level:

```css
@media (max-width: 768px) {
  .card { padding: var(--spacing-4); }  /* was spacing-6 */
  .section { margin-bottom: var(--spacing-8); } /* was spacing-12 */
}
```

---

**Última actualización:** 2026-07-05
