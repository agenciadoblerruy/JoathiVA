# 🚛 Joathi Logística — Plataforma Operativa v4.0

![Version](https://img.shields.io/badge/versión-4.0.0-1A3D2B?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Leaflet](https://img.shields.io/badge/Mapa-Leaflet%20%2B%20OSM-199900?style=for-the-badge)
![Claude](https://img.shields.io/badge/IA-Claude%20Sonnet-E8A020?style=for-the-badge)

Aplicación móvil multi-rol para la gestión operativa de Joathi Logística. Conecta choferes, clientes, proveedores y ejecutivos con **JoathiVA** (asistente IA), **GPS en tiempo real** y **notificaciones push**.

---

## 🚀 Instalación

```bash
# 1. Instalá dependencias
npm install

# 2. Configurá variables de entorno
cp .env.example .env
# Editá .env con tus valores

# 3. Iniciá en desarrollo
npm start
# Abre en http://localhost:3000
```

```bash
# Build para producción
npm run build
```

---

## 🔑 Usuarios demo

| Rol        | PIN  | Usuario               | Empresa           |
|------------|------|-----------------------|-------------------|
| 👷 Chofer     | 1234 | Carlos Mendoza        | Joathi Logística  |
| 🏪 Cliente    | 5678 | Supermercados DIA     | DIA S.A.          |
| 🚚 Proveedor  | 9012 | TransAndina SRL       | TransAndina SRL   |
| 👩‍💼 Ejecutivo | 3456 | Valentina Torres      | Joathi Logística  |

---

## 📱 Funcionalidades

### 👷 Chofer
| Feature | Detalle |
|---------|---------|
| **Operativa única** | Solo puede haber UNA operativa activa. Triple capa de protección. |
| **GPS real** | `watchPosition` activo durante toda la operativa. Actualización continua. |
| **Mapa Leaflet** | Pestaña dedicada con posición, destino y ruta trazada en tiempo real. |
| **Notificaciones push** | Al iniciar operativa + alerta "entrega a 8 km" automática. |
| **JoathiVA Chat** | IA Claude Sonnet para rutas, incidentes y consultas operativas. |
| **WhatsApp** | Link directo a JoathiVA por WhatsApp Business. |
| **Documentación** | Licencia, propiedad, seguro y VTV con estado de vencimiento. |
| **Acciones rápidas** | Mi Ruta, Cargas, Documentos, Incidente — debajo del saludo. |

### 🏪 Cliente
| Feature | Detalle |
|---------|---------|
| **Mapa real** | Posición del camión actualizándose cada 3 segundos sobre mapa OSM. |
| **Timeline** | Estado del envío en 5 pasos: confirmado → retirado → en camino → llegada → entregado. |
| **GPS activo** | Indicador verde con coordenadas actualizándose en tiempo real. |
| **Contacto chofer** | Llamada directa y WhatsApp Business desde el panel. |
| **Notificaciones** | Alerta al ingresar con ETA del envío. |
| **Filtro por viaje** | Si tiene múltiples envíos, puede seleccionar cada uno. |

### 🚚 Proveedor
| Feature | Detalle |
|---------|---------|
| **Mapa de flota** | Sub-tab con todos los camiones activos posicionados en mapa. |
| **Gestión documental** | Adjuntar remitos, guías, seguros y VTV. Upload simulado con feedback. |
| **KPIs** | Operativas activas, documentos pendientes, documentos vencidos. |
| **Notificaciones** | Confirmación al aprobar documentos. |
| **Vista completa** | Todas las operativas activas e históricas con chofer asignado. |

### 👩‍💼 Ejecutivo
| Feature | Detalle |
|---------|---------|
| **Mapa flota nacional** | Vista con zoom 5 mostrando todas las unidades en ruta. |
| **Panel de KPIs** | 6 métricas: entregas, pendientes, km totales, choferes, puntualidad. |
| **Alertas con acción** | Cada alerta tiene "Gestionar" y acceso directo a WhatsApp. |
| **Vista global** | Todas las operativas del día con chofer y cliente. |
| **Notificaciones** | Alertas de gestión en tiempo real. |

---

## 🗺️ Mapa — Leaflet + OpenStreetMap

El mapa se carga dinámicamente desde **cdnjs.cloudflare.com** (no requiere dependencia en package.json):

```
Leaflet JS:  https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js
Leaflet CSS: https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css
Tiles:       https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

**Para usar Google Maps en producción**, reemplazá el tile URL:
```js
// Google Maps (requiere API key)
L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}&key=TU_KEY')

// Mapbox (más estético, requiere token)
L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=TU_TOKEN')
```

---

## 🔔 Notificaciones Push

Usa la **Web Notifications API** nativa (sin librerías externas):

```js
// Solicitar permiso
await Notification.requestPermission();

// Enviar notificación
new Notification("Joathi Logística", {
  body: "Tu próxima entrega está a 8 km",
  icon: "/favicon.ico"
});
```

**Para producción con Service Worker** (notificaciones en background):
```bash
# Agregar web-push al proyecto
npm install web-push
```
Ver: https://web.dev/notifications/

---

## 💬 WhatsApp Business

Link configurado: `https://wa.me/message/7GEKEMVKDBSRE1`

Aparece en:
- Panel inicio del chofer
- Chat JoathiVA (acceso rápido)
- Perfil del cliente (contactar chofer)
- Alertas del ejecutivo (gestión)

Para actualizar el link, modificar `WA_LINK` en `src/App.jsx` o en `.env`:
```
REACT_APP_WA_LINK=https://wa.me/message/NUEVO_LINK
```

---

## 🤖 JoathiVA — Claude API

```js
// Llamada a la API (src/App.jsx)
fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: CHAT_SYSTEM,
    messages: conversationHistory
  })
});
```

**En producción**, implementar un backend proxy para no exponer la API key:
```
Cliente → Tu Backend (Node/Express) → Anthropic API
```

---

## 🗂️ Estructura del proyecto

```
joathi-logistica-app/
├── .env.example          ← Variables de entorno (copiá como .env)
├── .gitignore
├── package.json
├── README.md
├── public/
│   ├── index.html        ← HTML con meta tags PWA
│   └── manifest.json     ← Config PWA (instalable en celular)
└── src/
    ├── index.js          ← Entry point React
    └── App.jsx           ← App completa (componentes, lógica, estilos)
                            ├── LeafletMap       (mapa dinámico)
                            ├── useNotifications (push notifications hook)
                            ├── LoginScreen      (selector de rol + PIN)
                            ├── ChoferDashboard  (5 tabs + operativa GPS)
                            ├── ClienteDashboard (mapa real + timeline)
                            ├── ProveedorDashboard (flota + documentos)
                            └── EjecutivoDashboard (KPIs + mapa flota)
```

---

## 🎨 Paleta de colores

| Token | Hex       | Uso                    |
|-------|-----------|------------------------|
| `G`   | `#1A3D2B` | Verde oscuro principal |
| `G2`  | `#245C3F` | Verde medio            |
| `G3`  | `#2E7A52` | Verde claro / acento   |
| `A`   | `#E8A020` | Ámbar / dorado Joathi  |
| `BG`  | `#0D1F16` | Fondo deep             |

---

## 📦 Deploy recomendado

```bash
# Vercel (más simple)
npm i -g vercel
vercel

# Netlify
npm run build
netlify deploy --prod --dir=build

# Docker
docker build -t joathi-app .
docker run -p 3000:80 joathi-app
```

---

## 📄 Licencia

© 2026 **Joathi Logística**. Todos los derechos reservados.  
Desarrollado con ❤️ y Claude AI.
