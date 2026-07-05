# Design System - Badge Component

## Status Badges

### En Tránsito (Teal)

```
[●] En Tránsito
├─ Background: Teal 500 (#00B4D8)
├─ Text: White
├─ Icon: Filled circle (●)
└─ Use: Active operations
```

### Completado (Green)

```
[✓] Completado
├─ Background: Success (#2ECC71)
├─ Text: White
├─ Icon: Checkmark (✓)
└─ Use: Finished trips
```

### Acción Pendiente (Orange)

```
[!] Acción Pendiente
├─ Background: Warning (#F39C12)
├─ Text: Dark
├─ Icon: Exclamation (!)
└─ Use: Needs attention
```

### Rechazado (Red)

```
[✕] Rechazado
├─ Background: Error (#E74C3C)
├─ Text: White
├─ Icon: X (✕)
└─ Use: Failed operations
```

---

## CSS Implementation

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.badge--primary {
  background: var(--color-primary-600);
  color: white;
}

.badge--success {
  background: var(--color-success);
  color: white;
}

.badge--warning {
  background: var(--color-warning);
  color: var(--color-neutral-900);
}

.badge--error {
  background: var(--color-error);
  color: white;
}

.badge--teal {
  background: var(--color-teal-500);
  color: white;
}

.badge--outline {
  background: transparent;
  border: 1px solid currentColor;
}
```

---

## Sizes

```css
.badge--sm {
  padding: 2px 6px;
  font-size: var(--font-size-xs);
}

.badge--md {
  padding: var(--spacing-1) var(--spacing-2);
  font-size: var(--font-size-sm);
}

.badge--lg {
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--font-size-md);
}
```

---

## HTML Examples

```html
<!-- Basic Badge -->
<span class="badge badge--teal">
  En Tránsito
</span>

<!-- Badge with Icon -->
<span class="badge badge--success">
  <svg><!-- checkmark --></svg>
  Completado
</span>

<!-- Badge Outline -->
<span class="badge badge--outline badge--primary">
  Pendiente
</span>
```

---

**Última actualización:** 2026-07-05
