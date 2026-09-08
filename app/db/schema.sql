-- QMH Damage Register — schema
-- Run this once against your Postgres database (Vercel Postgres / Neon / Supabase all work).
-- psql "$DATABASE_URL" -f backend/app/db/schema.sql

create extension if not exists pgcrypto;

create table if not exists users (
    id            uuid primary key default gen_random_uuid(),
    email         text not null unique,
    name          text not null,
    role          text not null check (role in ('admin','editor','reporter_repairer','repairer')),
    active        boolean not null default true,
    created_at    timestamptz not null default now(),
    last_login_at timestamptz
);

-- One-time magic-link tokens. A row is deleted once used or once it expires (cleanup is best-effort;
-- expired/used tokens are also rejected at verify time regardless of whether cleanup has run).
create table if not exists magic_links (
    token       text primary key,
    email       text not null,
    expires_at  timestamptz not null,
    used_at     timestamptz,
    created_at  timestamptz not null default now()
);

create table if not exists buildings (
    id    uuid primary key default gen_random_uuid(),
    name  text not null unique,
    sort_order int not null default 0
);

create table if not exists zones (
    id           uuid primary key default gen_random_uuid(),
    building_id  uuid not null references buildings(id) on delete cascade,
    label        text not null,
    color        text,               -- hex swatch matching the marked-up site photo, e.g. #ec1c24
    sort_order   int not null default 0,
    created_at   timestamptz not null default now(),
    unique (building_id, label)
);

create table if not exists incidents (
    id                 uuid primary key default gen_random_uuid(),
    ref_code           text not null unique,
    date_found         date not null,
    time_found         time not null,
    reported_by_user   uuid references users(id),
    reported_by_name   text not null,   -- denormalised snapshot, so a later user rename/removal doesn't rewrite history
    contact            text,
    damage_type        text not null,
    police_status      text not null default 'Not yet filed' check (police_status in ('Not yet filed','Filed','Not required')),
    police_number      text,
    notes              text not null,
    repair_status      text not null default 'Not assigned' check (repair_status in ('Not assigned','Assigned','Repaired')),
    repair_contractor  text,
    repair_date        date,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

-- An incident can span multiple zones (e.g. one break-in, several windows).
-- building_name/zone_label/zone_color are a snapshot taken at the time the incident was
-- logged, so a later zone rename/removal (via "Edit zone layout") never rewrites history —
-- zone_id is kept only as a convenience link back while the zone still exists.
create table if not exists incident_locations (
    id             uuid primary key default gen_random_uuid(),
    incident_id    uuid not null references incidents(id) on delete cascade,
    zone_id        uuid references zones(id) on delete set null,
    building_name  text not null,
    zone_label     text not null,
    zone_color     text
);

create table if not exists incident_photos (
    id             uuid primary key default gen_random_uuid(),
    incident_id    uuid not null references incidents(id) on delete cascade,
    blob_url       text not null,     -- Vercel Blob public URL
    filename       text not null,
    uploaded_by    uuid references users(id),
    uploaded_at    timestamptz not null default now()
);

create index if not exists idx_incident_locations_incident on incident_locations(incident_id);
create index if not exists idx_incident_locations_zone on incident_locations(zone_id);
create index if not exists idx_incident_photos_incident on incident_photos(incident_id);
create index if not exists idx_zones_building on zones(building_id);
create index if not exists idx_incidents_date on incidents(date_found desc);
create index if not exists idx_magic_links_email on magic_links(email);
