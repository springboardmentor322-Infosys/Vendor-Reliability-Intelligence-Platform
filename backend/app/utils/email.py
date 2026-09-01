import os
import smtplib

from email.message import EmailMessage

from dotenv import load_dotenv


# ==========================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================

load_dotenv()


# ==========================================
# SMTP CONFIGURATION
# ==========================================

SMTP_HOST = os.getenv(
    "SMTP_HOST",
    "smtp.gmail.com"
)

SMTP_PORT = int(
    os.getenv(
        "SMTP_PORT",
        "587"
    )
)

SMTP_USERNAME = os.getenv(
    "SMTP_USERNAME",
    ""
)

SMTP_PASSWORD = os.getenv(
    "SMTP_PASSWORD",
    ""
)

SMTP_FROM_EMAIL = os.getenv(
    "SMTP_FROM_EMAIL",
    SMTP_USERNAME
)


# ==========================================
# SEND EMAIL
# ==========================================

def send_email(
    recipient_email: str,
    subject: str,
    message: str
) -> bool:

    # ======================================
    # VALIDATE CONFIGURATION
    # ======================================

    if not SMTP_USERNAME:

        print(
            "SMTP_USERNAME is not configured."
        )

        return False


    if not SMTP_PASSWORD:

        print(
            "SMTP_PASSWORD is not configured."
        )

        return False


    if not recipient_email:

        print(
            "Recipient email is empty."
        )

        return False


    # ======================================
    # CREATE EMAIL
    # ======================================

    email = EmailMessage()


    email["Subject"] = subject

    email["From"] = (
        SMTP_FROM_EMAIL
        or SMTP_USERNAME
    )

    email["To"] = recipient_email


    email.set_content(
        message
    )


    # ======================================
    # SEND EMAIL
    # ======================================

    try:

        with smtplib.SMTP(
            SMTP_HOST,
            SMTP_PORT
        ) as server:

            server.starttls()

            server.login(
                SMTP_USERNAME,
                SMTP_PASSWORD
            )

            server.send_message(
                email
            )


        print(
            f"Email sent successfully to "
            f"{recipient_email}"
        )


        return True


    except Exception as error:

        print(
            "Failed to send email:",
            error
        )

        return False