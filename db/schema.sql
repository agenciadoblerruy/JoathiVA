BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('maestro', 'cliente', 'proveedor', 'despachante')),
  password_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  raw_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document_number TEXT,
  city TEXT,
  country TEXT,
  status TEXT,
  notes TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers (status);
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers (name);
CREATE TRIGGER trg_providers_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS brokers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  country TEXT,
  role TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_brokers_name ON brokers (name);
CREATE TRIGGER trg_brokers_updated_at BEFORE UPDATE ON brokers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  broker_id TEXT REFERENCES brokers(id) ON DELETE SET NULL,
  status TEXT,
  origin TEXT,
  destination TEXT,
  amount NUMERIC(14,2),
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes (status);
CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  quote_id TEXT REFERENCES quotes(id) ON DELETE SET NULL,
  provider_id TEXT REFERENCES providers(id) ON DELETE SET NULL,
  broker_id TEXT REFERENCES brokers(id) ON DELETE SET NULL,
  status TEXT,
  operation_type TEXT,
  reference TEXT,
  container TEXT,
  dua TEXT,
  origin TEXT,
  destination TEXT,
  arrival_date DATE,
  load_date DATE,
  return_date DATE,
  risk TEXT,
  document_checklist JSONB NOT NULL DEFAULT '{}'::JSONB,
  notes TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operations_customer_id ON operations (customer_id);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations (status);
CREATE INDEX IF NOT EXISTS idx_operations_dua ON operations (dua);
CREATE INDEX IF NOT EXISTS idx_operations_reference ON operations (reference);
CREATE INDEX IF NOT EXISTS idx_operations_document_checklist_gin ON operations USING GIN (document_checklist);
CREATE TRIGGER trg_operations_updated_at BEFORE UPDATE ON operations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  operation_id TEXT REFERENCES operations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  priority TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  raw_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks (customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_operation_id ON tasks (operation_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT,
  entity_id TEXT,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  operation_id TEXT REFERENCES operations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  label TEXT,
  tone TEXT,
  details TEXT,
  source TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  raw_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_customer_id ON activity_log (customer_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_operation_id ON activity_log (operation_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log (created_at);

COMMIT;
