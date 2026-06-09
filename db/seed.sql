BEGIN;

INSERT INTO users (id, email, name, role, password_hash, is_active)
VALUES ('usr_maestro_001','maestro@joathi.com','Administrador Maestro','maestro','Maestro2026!',TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, name, email, phone, city, country, status, notes, raw_data)
VALUES ('cus_demo_001','Importadora Demo SRL','contacto@importadorademo.com','+598 99 000 001','Montevideo','UY','Activo','Cliente de prueba','{"tipoCliente":"Activo","empresa":"Importadora Demo SRL"}'::JSONB)
ON CONFLICT (id) DO NOTHING;

INSERT INTO providers (id, name, email, phone, status, notes, raw_data)
VALUES ('prv_demo_001','Transportes del Sur','operaciones@transportesdelsur.com','+598 99 000 002','active','Proveedor de prueba','{"fleet":["Camion 1"],"routes":["MVD-ASU"]}'::JSONB)
ON CONFLICT (id) DO NOTHING;

INSERT INTO brokers (id, name, email, phone, company, country, role, status, notes)
VALUES ('brk_demo_001','Carlos Despachante','carlos@despachos.com','+598 99 000 003','Despachos del Cono Sur','UY','UY','active','Despachante de prueba')
ON CONFLICT (id) DO NOTHING;

INSERT INTO operations (id, customer_id, provider_id, broker_id, status, operation_type, reference, container, dua, origin, destination, arrival_date, risk, document_checklist, notes, raw_data)
VALUES ('op_demo_001','cus_demo_001','prv_demo_001','brk_demo_001','En transito','Importacion','REF-2026-001','CONT-001234','776201','Asuncion','Montevideo',CURRENT_DATE + INTERVAL '3 days','Bajo','{"avisoArribo":true,"previsionCamion":false,"facturaCRT":false,"borradorCRT":false,"ncm":false,"valorSeguro":false,"dua":false,"micDefinitivo":false,"crtDefinitivo":false}'::JSONB,'Operacion demo','{"estadoOperacion":"En transito","riesgo":"Bajo"}'::JSONB)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_log (id, entity_type, entity_id, customer_id, operation_id, action, label, tone, details, source, metadata, raw_data)
VALUES ('act_demo_001','operation','op_demo_001','cus_demo_001','op_demo_001','operation.created','Operacion creada','info','Operacion REF-2026-001 creada','seed','{"seedVersion":1}'::JSONB,'{}'::JSONB)
ON CONFLICT (id) DO NOTHING;

COMMIT;
