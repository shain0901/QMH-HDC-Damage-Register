import os


def _require(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val


class Settings:
    # Postgres connection string (Vercel Postgres / Neon / Supabase all provide one of these).
    @property
    def database_url(self) -> str:
        return _require("DATABASE_URL")

    # Long random string — used to sign session JWTs. Generate with: openssl rand -hex 32
    @property
    def jwt_secret(self) -> str:
        return _require("JWT_SECRET")

    # Resend API key (resend.com) — used to send magic-link emails.
    @property
    def resend_api_key(self) -> str:
        return _require("RESEND_API_KEY")

    # "From" address for magic-link emails. Must be a verified sender/domain in Resend.
    @property
    def email_from(self) -> str:
        return os.environ.get("EMAIL_FROM", "QMH Damage Register <noreply@hanmersolutions.co.nz>")

    # Public URL of the deployed app (no trailing slash), e.g. https://qmh-damage-register.vercel.app
    # Used to build the magic-link URL emailed to people.
    @property
    def app_base_url(self) -> str:
        return _require("APP_BASE_URL")

    # Vercel Blob read/write token (auto-provided when you add Blob storage to the Vercel project).
    @property
    def blob_token(self) -> str:
        return _require("BLOB_READ_WRITE_TOKEN")


settings = Settings()
