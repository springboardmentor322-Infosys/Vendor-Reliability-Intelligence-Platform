from fastapi_mail import ConnectionConfig

conf = ConnectionConfig(
    MAIL_USERNAME="kottehrishitha@gmail.com"
    MAIL_PASSWORD="Hrishitha2005",
    MAIL_FROM="your_email@gmail.com",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)