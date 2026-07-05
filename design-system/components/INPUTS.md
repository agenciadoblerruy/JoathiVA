# Design System - Input Component

## Base Input

```
├─ Background: Neutral 0 (White)
├─ Border: 1px Neutral 200
├─ Padding: spacing-3 (12px) vertical, spacing-4 (16px) horizontal
├─ Border Radius: radius-md (8px)
├─ Font Size: font-size-lg (16px)
└─ Min Height: 40px
```

---

## States

### Default

```css
.input {
  background: var(--color-neutral-0);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-3) var(--spacing-4);
  font-size: var(--font-size-lg);
  font-family: var(--font-family-secondary);
  transition: all var(--transition-base);
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.input::placeholder {
  color: var(--color-neutral-400);
}
```

### Focus

```css
.input:focus {
  border-color: var(--color-teal-500);
  outline-color: var(--color-teal-500);
  box-shadow: 0 0 0 3px rgba(0, 180, 216, 0.1);
}
```

### Error

```css
.input--error {
  border-color: var(--color-error);
}

.input--error:focus {
  outline-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
}
```

### Disabled

```css
.input:disabled {
  background: var(--color-neutral-50);
  color: var(--color-neutral-400);
  cursor: not-allowed;
  opacity: 0.6;
}
```

---

## Variants

### Text Input

```html
<input type="text" class="input" placeholder="Ingresar texto...">
```

### Email Input

```html
<input type="email" class="input" placeholder="correo@ejemplo.com">
```

### Number Input

```html
<input type="number" class="input" placeholder="0">
```

### Search Input

```html
<div class="input-group">
  <svg class="input-icon"><!-- search icon --></svg>
  <input type="search" class="input" placeholder="Buscar viajes...">
</div>
```

---

## With Label

```html
<div class="form-group">
  <label class="label">Origen</label>
  <input type="text" class="input" placeholder="Santiago">
  <span class="helper-text">Selecciona el punto de origen</span>
</div>
```

### CSS

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-4);
}

.label {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-900);
}

.helper-text {
  font-size: var(--font-size-sm);
  color: var(--color-neutral-400);
}

.error-text {
  font-size: var(--font-size-sm);
  color: var(--color-error);
}
```

---

## Textarea

```html
<textarea class="input" placeholder="Descripción del viaje..." rows="4"></textarea>
```

```css
.textarea {
  font-family: var(--font-family-secondary);
  resize: vertical;
  min-height: 100px;
}
```

---

## Accessibility

- ✅ Min height: 40px (touch target)
- ✅ Focus visible with outline
- ✅ Label associated with input
- ✅ Error messages linked to input
- ✅ Sufficient color contrast

---

**Última actualización:** 2026-07-05
