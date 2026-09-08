"""
Thin Postgres connection helper.

Runs on Vercel's serverless Python runtime, where each invocation may be a fresh
process — so this opens a short-lived connection per request rather than pooling
in-process. Fine for this app's traffic (a handful of staff, occasional writes).
If usage ever grows enough for this to matter, point DATABASE_URL at a pooled
connection string (Vercel Postgres and Neon both offer one) rather than changing
this code.
"""
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from app.config import settings


@contextmanager
def get_conn():
    conn = psycopg.connect(settings.database_url, row_factory=dict_row, autocommit=False)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
