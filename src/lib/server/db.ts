import "server-only";
import path from "node:path";

// Un solo SQL (Postgres) con dos motores:
//  · Producción: DATABASE_URL (Neon, Supabase, RDS…) con `pg`.
//  · Local: PGlite (Postgres real en WASM) guardado en .data/, sin instalar nada.
// En Vercel sin DATABASE_URL no hay disco persistente: dbAvailable() devuelve false y la tienda
// sigue vendiendo con Stripe, pero sin pago al recibir ni backoffice.
export type Row = Record<string, any>;
export type Exec = (sql: string, params?: unknown[]) => Promise<Row[]>;
type Engine = { query: Exec; tx: <T>(fn: (q: Exec) => Promise<T>) => Promise<T> };

const SCHEMA = `
create table if not exists orders (
  id text primary key,
  code text unique not null,
  token text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  channel text not null check (channel in ('web','pos')),
  status text not null,
  payment_mode text not null check (payment_mode in ('online','pickup','cod','pos')),
  payment_status text not null,
  delivery text not null check (delivery in ('delivery','collect','counter')),
  customer_name text, email text, phone text,
  address text, postal_code text, city text, delivery_note text,
  subtotal integer not null, discount integer not null default 0, shipping integer not null default 0,
  surcharge integer not null default 0, total integer not null, discount_code text,
  stripe_session_id text unique, stripe_payment_intent text,
  courier text, tracking_number text,
  review_reason text, test boolean not null default true,
  request_key text unique,
  withdrawal_at timestamptz, withdrawal_ref text,
  delivered_at timestamptz,
  stock_taken boolean not null default false
);
create index if not exists orders_created on orders (created_at desc);
create index if not exists orders_status on orders (status);
create table if not exists order_items (
  id serial primary key,
  order_id text not null references orders(id) on delete cascade,
  kind text not null, ref text not null, name text not null,
  unit integer not null, quantity integer not null,
  components jsonb not null default '[]'
);
create index if not exists order_items_order on order_items (order_id);
create table if not exists payments (
  id serial primary key,
  order_id text not null references orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('charge','refund')),
  method text not null, amount integer not null,
  reference text, status text not null,
  recorded_by text not null, verified_by text, verified_at timestamptz
);
create unique index if not exists payments_reference on payments (kind, method, reference) where reference is not null;
create index if not exists payments_order on payments (order_id);
create table if not exists order_events (
  id serial primary key,
  order_id text not null references orders(id) on delete cascade,
  at timestamptz not null default now(),
  type text not null, label text not null, actor text not null,
  public boolean not null default false
);
create index if not exists order_events_order on order_events (order_id);
create table if not exists stock (
  product_id text primary key, on_hand integer not null,
  updated_at timestamptz not null default now(), updated_by text
);
create table if not exists stock_moves (
  id serial primary key, at timestamptz not null default now(),
  product_id text not null, delta integer not null, reason text not null, actor text not null, order_id text
);
create table if not exists funnel (
  day date not null, name text not null, n integer not null default 0, primary key (day, name)
);
create table if not exists customers (
  id text primary key, email text unique not null, password_hash text, google_sub text unique,
  name text, phone text,
  marketing boolean not null default false, marketing_at timestamptz, terms_at timestamptz not null,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists customer_sessions (
  token_hash text primary key, customer_id text not null references customers(id) on delete cascade,
  created_at timestamptz not null default now(), expires_at timestamptz not null
);
create index if not exists customer_sessions_customer on customer_sessions (customer_id);
create table if not exists customer_addresses (
  id serial primary key, customer_id text not null references customers(id) on delete cascade,
  line text not null, postal_code text not null, city text not null, note text
);
create table if not exists customer_favorites (
  customer_id text not null references customers(id) on delete cascade, product_id text not null,
  at timestamptz not null default now(), primary key (customer_id, product_id)
);
alter table orders add column if not exists customer_id text references customers(id) on delete set null;
alter table orders add column if not exists linked_at timestamptz;
create index if not exists orders_customer on orders (customer_id);
create table if not exists subscriptions (
  id text primary key, token text unique not null,
  customer_id text references customers(id) on delete set null,
  status text not null, weeks int not null, delivery text not null,
  customer_name text, email text, phone text, address text, postal_code text, city text, delivery_note text,
  stripe_session_id text unique, stripe_subscription_id text unique, stripe_customer_id text,
  next_cycle_at timestamptz, notice_at timestamptz, noticed_for timestamptz,
  consent_at timestamptz not null, cancelled_at timestamptz, test boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists subscription_items (
  subscription_id text not null references subscriptions(id) on delete cascade, product_id text not null,
  quantity int not null check (quantity > 0), unit int not null, primary key (subscription_id, product_id)
);
create table if not exists subscription_events (
  id serial primary key, subscription_id text not null references subscriptions(id) on delete cascade,
  label text not null, actor text not null, at timestamptz not null default now()
);
alter table orders add column if not exists subscription_id text references subscriptions(id) on delete set null;
create table if not exists reviews (
  id serial primary key, subject_type text not null, subject_id text not null,
  customer_id text not null references customers(id) on delete cascade,
  order_id text not null references orders(id) on delete cascade,
  rating int not null check (rating between 1 and 5), body text not null default '', public_name text not null,
  test boolean not null default false, status text not null default 'published',
  removed_reason text, removed_detail text, removed_by text, removed_at timestamptz,
  reply text, reply_by text, reply_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (order_id, subject_type, subject_id)
);
create index if not exists reviews_subject on reviews (subject_type, subject_id);
create table if not exists login_attempts (ip text not null, at timestamptz not null default now());
`;

// timestamptz → ISO en ambos motores, para que el resto del código no dependa del driver.
const iso = (rows: Row[]) =>
  rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])));

async function pgEngine(url: string): Promise<Engine> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000 });
  await pool.query(SCHEMA);
  return {
    query: async (sql, params = []) => iso((await pool.query(sql, params as any[])).rows),
    tx: async (fn) => {
      const c = await pool.connect();
      try {
        await c.query("begin");
        const out = await fn(async (sql, params = []) => iso((await c.query(sql, params as any[])).rows));
        await c.query("commit");
        return out;
      } catch (e) {
        await c.query("rollback");
        throw e;
      } finally {
        c.release();
      }
    },
  };
}

async function pgliteEngine(): Promise<Engine> {
  const { PGlite } = await import("@electric-sql/pglite");
  const fs = await import("node:fs");
  const dir = path.resolve(process.env.PGLITE_DIR || ".data/pg");
  fs.mkdirSync(dir, { recursive: true });
  const db = await PGlite.create(dir);
  await db.exec(SCHEMA);
  return {
    query: async (sql, params = []) => iso((await db.query(sql, params as any[])).rows as Row[]),
    tx: (fn) =>
      db.transaction((t) => fn(async (sql, params = []) => iso((await t.query(sql, params as any[])).rows as Row[]))) as any,
  };
}

// globalThis: en desarrollo el módulo se recarga y PGlite no admite dos instancias en la misma carpeta.
const g = globalThis as unknown as { __hpdb?: Promise<Engine> };

export const dbAvailable = () => Boolean(process.env.DATABASE_URL) || !process.env.VERCEL;

function engine() {
  if (!dbAvailable()) return Promise.reject(new Error("db_unavailable"));
  if (!g.__hpdb) {
    g.__hpdb = (process.env.DATABASE_URL ? pgEngine(process.env.DATABASE_URL) : pgliteEngine()).catch((e) => {
      g.__hpdb = undefined;
      throw e;
    });
  }
  return g.__hpdb;
}

export const query: Exec = async (sql, params) => (await engine()).query(sql, params);
export const tx = async <T>(fn: (q: Exec) => Promise<T>): Promise<T> => (await engine()).tx(fn);
