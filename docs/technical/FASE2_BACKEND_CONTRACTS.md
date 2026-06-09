# Fase 2 - Contratos backend para frontend

Documento tecnico de referencia para que el agente web conecte rapido con los endpoints ya disponibles en backend, sin asumir contratos viejos ni depender solo de `localStorage`.

## 1. Endpoints utiles para frontend

### Provider
- `GET /api/v1/providers`
- `POST /api/v1/providers`
- `GET /api/v1/providers/{id}`
- `PATCH /api/v1/providers/{id}`
- `PUT /api/v1/providers/{id}`
- `GET /api/v1/providers/{id}/routes`
- `POST /api/v1/providers/{id}/routes`
- `PATCH /api/v1/providers/{id}/routes`
- `PUT /api/v1/providers/{id}/routes`
- `GET /api/v1/providers/{id}/trips`
- `POST /api/v1/providers/{id}/trips`
- `PATCH /api/v1/providers/{id}/trips`
- `PUT /api/v1/providers/{id}/trips`
- `GET /api/v1/providers/{id}/documents`
- `POST /api/v1/providers/{id}/documents`
- `PATCH /api/v1/providers/{id}/documents`
- `PUT /api/v1/providers/{id}/documents`
- `GET /api/v1/providers/{id}/operational`
- `POST /api/v1/providers/{id}/operational`
- `PATCH /api/v1/providers/{id}/operational`
- `PUT /api/v1/providers/{id}/operational`
- `GET /api/v1/providers/{id}/quotes`

### Quote / provider workflow
- `GET /api/v1/quotes/{id}/provider`
- `POST /api/v1/quotes/{id}/provider`
- `PATCH /api/v1/quotes/{id}/provider`
- `PUT /api/v1/quotes/{id}/provider`

### Documento comercial
- `GET /api/v1/documents`
- `POST /api/v1/documents`
- `GET /api/v1/documents/{id}`
- `PATCH /api/v1/documents/{id}`
- `PUT /api/v1/documents/{id}`
- `POST /api/v1/documents/{id}/export`

### Mailoutbox
- `GET /api/v1/mailoutbox`
- `POST /api/v1/mailoutbox`
- `GET /api/v1/mailoutbox/{id}`
- `PATCH /api/v1/mailoutbox/{id}`
- `PUT /api/v1/mailoutbox/{id}`
- `POST /api/v1/mailoutbox/{id}/send`

## 2. Payloads minimos de request

### `POST /api/v1/documents`
```json
{
  "title": "Cotizacion comercial",
  "documentType": "quote",
  "format": "editable",
  "status": "draft",
  "quoteId": "quo-123",
  "customerId": "cus-123",
  "providerId": "prov-123",
  "operationId": "op-123"
}
```

### `POST /api/v1/documents/{id}/export`
```json
{
  "exportFormat": "bundle"
}
```

### `POST /api/v1/mailoutbox/{id}/send`
```json
{
  "mailboxProfileId": "rodrigo",
  "recipient": "cliente@empresa.com",
  "subject": "Cotizacion JoathiVA",
  "body": "Adjunto documento comercial.",
  "documentId": "doc-123"
}
```

### `POST /api/v1/quotes/{id}/provider`
#### Solicitar tarifa
```json
{
  "action": "request",
  "providerId": "prov-123",
  "providerName": "Proveedor SA",
  "requestedBy": "commercial_ops",
  "requestMessage": "Por favor enviar tarifa."
}
```

#### Recibir tarifa
```json
{
  "action": "receive",
  "providerId": "prov-123",
  "rate": "1500",
  "currency": "USD",
  "notes": "Tarifa recibida"
}
```

#### Comparar opciones
```json
{
  "action": "compare",
  "providerOptions": [
    {
      "providerId": "prov-123",
      "providerName": "Proveedor SA",
      "rate": "1500",
      "currency": "USD"
    }
  ]
}
```

#### Confirmar proveedor
```json
{
  "action": "confirm",
  "providerId": "prov-123",
  "providerName": "Proveedor SA",
  "selectedProviderId": "prov-123"
}
```

## 3. Forma esperada de response

El backend responde con un sobre estable:

```json
{
  "statusCode": 200,
  "reasonPhrase": "OK",
  "body": {
    "ok": true,
    "apiVersion": "v1",
    "domainVersion": 3,
    "entityKind": "document",
    "action": "export",
    "data": {},
    "meta": {}
  }
}
```

### Response de error
```json
{
  "statusCode": 400,
  "reasonPhrase": "Bad Request",
  "body": {
    "ok": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validacion fallida.",
      "fieldErrors": {},
      "entityKind": "document",
      "action": "export",
      "details": {}
    }
  }
}
```

## 4. Campos nuevos que frontend debe leer

### `document`
Campos a leer si existen:
- `exportFormat`
- `exportStatus`
- `exportReady`
- `exportFileCount`
- `exportBasePath`
- `exportWarnings`
- `exportRelations`
- `exportCapabilities`
- `exportSummary`
- `exportFiles`
- `fileName`
- `mimeType`
- `renderedAt`
- `exportedAt`

Estructura esperada de `exportFiles[]`:
```json
[
  {
    "kind": "pdf",
    "path": "E:/Joathi/JOATHIVA/server/data/generated-documents/doc-1/cotizacion.pdf",
    "name": "cotizacion.pdf",
    "mimeType": "application/pdf",
    "exists": true
  }
]
```

### `mailoutbox`
Campos a leer si existen:
- `status`
- `deliveryStatus`
- `channel`
- `mailboxProfileId`
- `folder`
- `messageId`
- `mailboxUid`
- `verificationUid`
- `exportError`
- `providerKind`
- `providerMetadata`
- `attachmentCount`
- `attachmentWarnings`
- `attachments`
- `queuedAt`
- `lastAttemptAt`
- `sentAt`
- `recipient`
- `subject`

Estructura esperada de `attachments[]`:
```json
[
  {
    "path": "E:/Joathi/JOATHIVA/server/data/generated-documents/doc-1/cotizacion.pdf",
    "fileName": "cotizacion.pdf",
    "name": "cotizacion.pdf",
    "mimeType": "application/pdf",
    "contentType": "application/pdf",
    "kind": "pdf",
    "source": "document-export"
  }
]
```

### `quote / provider workflow`
Campos a leer si existen:
- `providerId`
- `providerName`
- `providerStatus`
- `providerRequestedAt`
- `providerReceivedAt`
- `providerConfirmedAt`
- `providerRequestCount`
- `providerResponseCount`
- `providerOptionCount`
- `providerSelectedProviderId`
- `providerSelectedProviderName`
- `providerComparisonSummary`
- `providerWorkflowSummary`
- `providerWorkflow`

Dentro de `providerWorkflow`:
- `requests[]`
- `responses[]`
- `options[]`
- `comparison`
- `confirmation`
- `summary`

## 5. Riesgos y compatibilidades

- `mailoutbox/send` hoy puede terminar como `draft_exported` por IMAP o como `draft_failed` si no hay perfil de correo; no asumir SMTP real.
- `document/export` genera un bundle utilizable con HTML, DOCX, PDF y manifest, pero sigue siendo una exportacion base.
- `exportFiles` ya no debe tratarse como mapa de paths sueltos; ahora es mejor leer una lista de metadatos.
- `attachments` en `mailoutbox` puede venir desde la request o derivarse del `documentId`; el frontend no necesita repetir archivos si el documento ya fue exportado.
- El backend sigue usando `api-v1-store.json` como persistencia central minima.
- Si el frontend consume contratos viejos, debe tolerar campos nuevos sin romper la lectura.
- Cualquier integracion visual debe leer `ok` en `body` y no inferir exito solo por `statusCode`.
