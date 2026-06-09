import assert from "node:assert/strict";
import {
  state,
  listActivityRecords,
  getCustomerActivityFeed,
  getOperationActivityFeed
} from "../../version-24/V/v1/repository.local.js";
import { normalizeActivityRecord } from "../../version-24/V/v1/domain-core.js";

const originalActivityLog = Array.isArray(state.activityLog) ? [...state.activityLog] : [];

try {
  state.activityLog = [
    normalizeActivityRecord({
      id: "act-customer-1",
      type: "crm.note",
      label: "CRM",
      tone: "info",
      customerId: "cus-1002",
      entityKind: "crm",
      entityId: "crm-1002",
      title: "Llamada comercial",
      details: "Se confirmo seguimiento con el cliente",
      at: "2026-04-21T10:00:00.000Z",
      source: "smoke"
    }),
    normalizeActivityRecord({
      id: "act-operation-1",
      type: "operation.update",
      label: "Operacion",
      tone: "warning",
      customerId: "cus-1002",
      entityKind: "operation",
      entityId: "op-1001",
      operationId: "op-1001",
      title: "Cambio de estado",
      details: "Operacion paso a Arribo detectado",
      at: "2026-04-21T11:00:00.000Z",
      source: "smoke"
    })
  ];

  const records = listActivityRecords();
  const customerFeed = getCustomerActivityFeed("cus-1002");
  const operationFeed = getOperationActivityFeed("op-1001");

  assert.equal(records.length, 2);
  assert.equal(customerFeed.length >= 2, true);
  assert.equal(operationFeed.length, 1);
  assert.equal(operationFeed[0].entityId, "op-1001");
  assert.equal(customerFeed.some((item) => item.entityId === "crm-1002"), true);
  assert.equal(customerFeed.some((item) => item.entityId === "op-1001"), true);

  console.log(JSON.stringify({
    ok: true,
    records: records.length,
    customerFeed: customerFeed.length,
    operationFeed: operationFeed.length
  }, null, 2));
} finally {
  state.activityLog = originalActivityLog;
}
