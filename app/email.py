import resend

from app.config import settings


def send_magic_link(to_email: str, name: str, link: str) -> None:
    resend.api_key = settings.resend_api_key
    resend.Emails.send({
        "from": settings.email_from,
        "to": [to_email],
        "subject": "Sign in to the QMH Damage Register",
        "html": f"""
            <p>Hi {name},</p>
            <p>Click below to sign in to the Queen Mary Hospital damage register. This link works once
            and expires in 15 minutes.</p>
            <p><a href="{link}" style="display:inline-block;background:#ad4a15;color:#fff8f1;
               padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a></p>
            <p style="color:#6b6151;font-size:13px">If you didn't request this, you can ignore this email.</p>
        """,
    })
