import assert from "node:assert/strict";
import { getOperationAlerts } from "../../version-24/V/v1/domain-core.js";

function alertTypes(operation) {
  return getOperationAlerts(operation).map((alert) => alert.type).sort();
}

const today = new Date();
const todayIso = today.toISOString().slice(0, 10);
const yesterday = new Date(today);
yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const yesterdayIso = yesterday.toISOString().slice(0, 10);
const inTwoDays = new Date(today);
inTwoDays.setUTCDate(inTwoDays.getUTCDate() + 2);
const inTwoDaysIso = inTwoDays.toISOString().slice(0, 10);
const inFourDays = new Date(today);
inFourDays.setUTCDate(inFourDays.getUTCDate() + 4);
const inFourDaysIso = inFourDays.toISOString().slice(0, 10);

const arrivalDue = {
  id: "op-alert-1",
  referencia: "AL-001",
  clientId: "cus-1",
  estadoOperacion: "Arribo detectado",
  riesgo: "Medio",
  fechaArribo: yesterdayIso,
  fechaDevolucion: inTwoDaysIso,
  documentChecklist: {
    previsionCamion: false,
    ncm: true,
    valorSeguro: true,
    dua: true
  }
};

const docsPending = {
  id: "op-alert-2",
  referencia: "AL-002",
  clientId: "cus-2",
  estadoOperacion: "Documentacion preliminar",
  riesgo: "Bajo",
  fechaArribo: inFourDaysIso,
  fechaDevolucion: inFourDaysIso,
  documentChecklist: {
    previsionCamion: true,
    ncm: false,
    valorSeguro: false,
    dua: false
  }
};

const duaPending = {
  id: "op-alert-3",
  referencia: "AL-003",
  clientId: "cus-3",
  estadoOperacion: "Esperando NCM/seguro",
  riesgo: "Bajo",
  fechaArribo: inFourDaysIso,
  fechaDevolucion: inFourDaysIso,
  documentChecklist: {
    previsionCamion: true,
    ncm: true,
    valorSeguro: true,
    dua: false
  }
};

const highRiskClosed = {
  id: "op-alert-4",
  referencia: "AL-004",
  clientId: "cus-4",
  estadoOperacion: "Cerrado",
  riesgo: "Alto",
  fechaArribo: todayIso,
  fechaDevolucion: yesterdayIso,
  documentChecklist: {
    previsionCamion: false,
    ncm: false,
    valorSeguro: false,
    dua: false
  }
};

assert.deepStrictEqual(alertTypes(arrivalDue), ["arrival.due", "return.due", "truck.missing"]);
assert.deepStrictEqual(alertTypes(docsPending), ["docs.ncm-insurance"]);
assert.deepStrictEqual(alertTypes(duaPending), ["docs.dua"]);
assert.deepStrictEqual(alertTypes(highRiskClosed), []);

console.log(
  JSON.stringify(
    {
      ok: true,
      cases: 4,
      checked: [
        { id: arrivalDue.id, alertTypes: alertTypes(arrivalDue) },
        { id: docsPending.id, alertTypes: alertTypes(docsPending) },
        { id: duaPending.id, alertTypes: alertTypes(duaPending) },
        { id: highRiskClosed.id, alertTypes: alertTypes(highRiskClosed) }
      ]
    },
    null,
    2
  )
);
