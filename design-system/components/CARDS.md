# Design System - Card Component

## Base Card

```
├─ Background: Neutral 0 (White #FFFFFF)
├─ Border: 1px Neutral 200 (#E8EBEF)
├─ Padding: spacing-6 (24px)
├─ Border Radius: radius-lg (12px)
├─ Shadow: shadow-md (0px 2px 8px rgba(0, 0, 0, 0.08))
└─ Hover Shadow: shadow-lg (on interactive cards)
```

---

## Trip Card

Layout para listar viajes en dashboard:

```
┌─────────────────────────────────────┐
│ VIAJE #OP-2026-001234               │ ← Heading H4
│ ──────────────────────────────────  │
│ 🚚 Santiago → Valparaíso            │
│ [●●●●●●●○○○] 60% En Tránsito      │
│                                     │
│ Proveedor: Transportes del Sur      │
│ Chofer: Juan Rodríguez              │
│ ETA: 15:45 | Demora: 5 min          │
│ ──────────────────────────────────  │
│ [📍 Rastrear] [📄 Documentos] [...] │
└─────────────────────────────────────┘
```

### CSS

```css
.card-trip {
  background: var(--color-neutral-0);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
  cursor: pointer;
}

.card-trip:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-600);
}

.card-trip__header {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-3);
  color: var(--color-neutral-900);
}

.card-trip__divider {
  border-top: 1px solid var(--color-neutral-200);
  margin: var(--spacing-4) 0;
}

.card-trip__actions {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
}
```

---

## Metric Card

Para KPIs en dashboard:

```
┌──────────────────────┐
│ Viajes Hoy           │ ← Label
│ 24                   │ ← Valor grande
│ ↑ 8% desde ayer      │ ← Comparativa
└──────────────────────┘
```

### CSS

```css
.card-metric {
  background: var(--color-neutral-0);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
  text-align: center;
}

.card-metric__label {
  font-size: var(--font-size-md);
  color: var(--color-neutral-400);
  margin-bottom: var(--spacing-2);
  font-weight: var(--font-weight-medium);
}

.card-metric__value {
  font-size: var(--font-size-6xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-600);
  margin-bottom: var(--spacing-2);
}

.card-metric__change {
  font-size: var(--font-size-sm);
  color: var(--color-success);
}
```

---

## Alert Card

Para alertas operativas:

```
┌──────────────────────────────┐
│ ⚠️  DEMORA DETECTADA         │
│ El viaje #OP-001234 tiene    │
│ 30 min de retraso.           │
│ [Ver] [Contactar] [✕]        │
└──────────────────────────────┘
```

### CSS

```css
.card-alert {
  background: var(--color-warning);
  background-color: rgba(243, 156, 18, 0.1);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.card-alert--error {
  border-color: var(--color-error);
  background-color: rgba(231, 76, 60, 0.1);
}

.card-alert--success {
  border-color: var(--color-success);
  background-color: rgba(46, 204, 113, 0.1);
}

.card-alert__title {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-2);
}

.card-alert__actions {
  display: flex;
  gap: var(--spacing-2);
  margin-top: var(--spacing-3);
}
```

---

## States

### Loading

```css
.card--loading {
  opacity: 0.6;
  pointer-events: none;
}

.card--loading::after {
  content: '';
  display: block;
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-primary-600);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
```

### Empty State

```css
.card--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-12);
  min-height: 200px;
  color: var(--color-neutral-400);
}

.card--empty svg {
  width: 64px;
  height: 64px;
  margin-bottom: var(--spacing-4);
  opacity: 0.5;
}
```

---

## Responsive

```css
@media (max-width: 768px) {
  .card {
    padding: var(--spacing-4);
  }
  
  .card-trip__actions {
    flex-wrap: wrap;
  }
}
```

---

**Última actualización:** 2026-07-05
