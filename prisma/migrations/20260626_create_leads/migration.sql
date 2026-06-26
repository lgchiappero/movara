CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY DEFAULT concat('clead', replace(gen_random_uuid()::text, '-', '')),
  nombre TEXT NOT NULL,
  apellido TEXT,
  dni TEXT,
  telefono TEXT NOT NULL,
  email TEXT,
  provincia TEXT,
  mensaje TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
