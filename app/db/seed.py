"""
One-off seed script — run once against a fresh database, after schema.sql.

    python -m app.db.seed

Reads DATABASE_URL the same way the app does. Safe to re-run: uses "on conflict do nothing" /
"do update" so it won't duplicate rows if you run it again after adding more zones by hand.

Fill in real email addresses before running this against production — placeholders below are
marked TODO.
"""
from app.db.connection import get_conn

# --- Staff & contractors -----------------------------------------------------------------
# TODO: confirm/replace these email addresses before running against production.
USERS = [
    dict(email="shain@hanmersolutions.co.nz", name="Shain Holdsworth", role="admin"),
    dict(email="TODO-rhys@example.com", name="Rhys Wilson", role="editor"),
    dict(email="TODO-garth@example.com", name="Garth Smith", role="editor"),
    dict(email="TODO-salym@example.com", name="Salym Colello", role="reporter_repairer"),
]

# --- Buildings & zones, matching the marked-up site photos (Sept 2026) -------------------
# Colours are sampled from Shain's own hand-drawn outlines, so the app's zone-colour dots match
# the printed/emailed reference photo. Update these if the photos get redrawn with new colours.
BUILDINGS = {
    "Chisholm Block": [
        ("Zone1-N", "#000000"), ("Zone1-S", "#585858"),
        ("Zone2-N", "#ec1c24"), ("Zone2-S", "#88001b"),
        ("Zone3-N", "#00a8f3"), ("Zone3-S", "#8cfffb"),
    ],
    "Nurse's Hostel": [
        ("Zone1", "#000000"),
        ("Zone2-NW", "#ec1c24"), ("Zone2-SW", "#88001b"),
        ("Zone3-S", "#00a8f3"),
        ("Zone4-SE", "#fff200"),
    ],
    "Soldier's Block": [
        ("Zone1-N", "#000000"), ("Zone1-S", "#585858"),
        ("Zone2-E", "#ec1c24"), ("Zone2-W", "#88001b"),
        ("Zone3-N", "#00a8f3"), ("Zone3-S", "#8cfffb"),
        ("Zone4-W", "#fff200"), ("Zone4-E", "#fdeca6"),
    ],
}


def run():
    with get_conn() as conn:
        for u in USERS:
            conn.execute(
                """
                insert into users (email, name, role) values (%s, %s, %s)
                on conflict (email) do update set name = excluded.name, role = excluded.role
                """,
                (u["email"].lower(), u["name"], u["role"]),
            )
        print(f"Seeded {len(USERS)} users.")

        for order, (building_name, zones) in enumerate(BUILDINGS.items()):
            conn.execute(
                """
                insert into buildings (name, sort_order) values (%s, %s)
                on conflict (name) do update set sort_order = excluded.sort_order
                """,
                (building_name, order),
            )
            building_id = conn.execute(
                "select id from buildings where name = %s", (building_name,)
            ).fetchone()["id"]
            for zorder, (label, color) in enumerate(zones):
                conn.execute(
                    """
                    insert into zones (building_id, label, color, sort_order) values (%s, %s, %s, %s)
                    on conflict (building_id, label) do update set color = excluded.color, sort_order = excluded.sort_order
                    """,
                    (building_id, label, color, zorder),
                )
        total_zones = sum(len(v) for v in BUILDINGS.values())
        print(f"Seeded {len(BUILDINGS)} buildings, {total_zones} zones.")


if __name__ == "__main__":
    run()
