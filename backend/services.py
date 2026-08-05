from sqlalchemy.orm import Session
import models
from datetime import datetime

class AuditService:
    @staticmethod
    def log_action(db: Session, action: str, entity_type: str, entity_id: int, user_id: int = None):
        """
        Logs a state change or important action to the AuditLog table.
        """
        log_entry = models.AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            timestamp=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

class NotificationService:
    @staticmethod
    def send_notification(recipient_email: str, subject: str, body: str):
        """
        Mocks sending an SMTP email by logging it to the console.
        """
        print(f"\n{'='*50}")
        print(f"📧 EMAIL NOTIFICATION")
        print(f"To: {recipient_email}")
        print(f"Subject: {subject}")
        print(f"Body: {body}")
        print(f"{'='*50}\n", flush=True)
