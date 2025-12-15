-- Minimal fixtures for Phase 10 verification.
CREATE TABLE IF NOT EXISTS public.items (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.items (name) VALUES ('alpha'), ('beta'), ('gamma');

-- Used for NDJSON streaming/perf smoke tests.
CREATE TABLE IF NOT EXISTS public.big_items (
  id bigserial PRIMARY KEY,
  payload text NOT NULL
);
