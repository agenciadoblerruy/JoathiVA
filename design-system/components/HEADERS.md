# Design System - Header Component

## Main Header (Web)

```
┌──────────────────────────────────────┐
│ [🎨 Logo] [Nav Items] [👤 User] [≡] │
│ JOATHI              Dashboard | Viajes │
└──────────────────────────────────────┘
```

### CSS

```css
.header {
  background: var(--color-primary-600);
  color: white;
  padding: var(--spacing-4) var(--spacing-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header__logo {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  text-decoration: none;
  color: white;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.header__nav {
  display: flex;
  gap: var(--spacing-6);
  margin: 0 auto;
}

.header__nav a {
  color: white;
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  transition: opacity var(--transition-base);
}

.header__nav a:hover {
  opacity: 0.8;
}

.header__actions {
  display: flex;
  gap: var(--spacing-4);
  align-items: center;
}
```

---

## Top Bar (Mobile)

```
┌─────────────────────────┐
│ [≡] [Title] [👤] [⚙️] │
└─────────────────────────┘
```

### CSS

```css
.topbar {
  background: var(--color-primary-600);
  color: white;
  padding: var(--spacing-3) var(--spacing-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.topbar__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  flex: 1;
  text-align: center;
}

.topbar__actions {
  display: flex;
  gap: var(--spacing-3);
}

.topbar__action {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 24px;
}
```

---

## Tab Navigation

```html
<div class="tabs">
  <button class="tab tab--active">Todos</button>
  <button class="tab">Activos</button>
  <button class="tab">Completados</button>
</div>
```

### CSS

```css
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-neutral-200);
}

.tab {
  background: none;
  border: none;
  padding: var(--spacing-4);
  cursor: pointer;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-400);
  border-bottom: 2px solid transparent;
  transition: all var(--transition-base);
}

.tab:hover {
  color: var(--color-primary-600);
}

.tab--active {
  color: var(--color-primary-600);
  border-bottom-color: var(--color-primary-600);
}
```

---

## Breadcrumb

```html
<nav class="breadcrumb">
  <a href="/">Inicio</a>
  <span>/</span>
  <a href="/viajes">Viajes</a>
  <span>/</span>
  <span>Detalle</span>
</nav>
```

### CSS

```css
.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-md);
  padding: var(--spacing-4) 0;
}

.breadcrumb a {
  color: var(--color-primary-600);
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.breadcrumb span:not(:first-child) {
  color: var(--color-neutral-400);
}
```

---

## Responsive

```css
@media (max-width: 768px) {
  .header__nav {
    display: none;
  }
  
  .header__menu-toggle {
    display: block;
  }
}
```

---

**Última actualización:** 2026-07-05
