import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\backend\services.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''class NotificationService:
    @staticmethod
    def send_notification(recipient_email: str, subject: str, body: str):
        """
        Mocks sending an SMTP email by logging it to the console.
        """
        print(f"\n{'='*50}")
        print(f"dY"  EMAIL NOTIFICATION")
        print(f"To: {recipient_email}")
        print(f"Subject: {subject}")
        print(f"Body: {body}")
        print(f"{'='*50}\n", flush=True)'''

replacement = '''class NotificationService:
    @staticmethod
    def send_notification(recipient_email: str, subject: str, body: str):
        """
        Mocks sending an SMTP email by logging it to the console.
        """
        print(f"\\n{'='*50}")
        print(f"dY\\"  EMAIL NOTIFICATION")
        print(f"To: {recipient_email}")
        print(f"Subject: {subject}")
        print(f"Body: {body}")
        print(f"{'='*50}\\n", flush=True)
        
        # Also save to the Notifications table so it shows up in the UI
        try:
            from database import SessionLocal
            from models import Notification, User
            db = SessionLocal()
            user = db.query(User).filter(User.email == recipient_email).first()
            if user:
                db.add(Notification(
                    user_id=user.id,
                    type="Email Alert",
                    title=subject,
                    message=body,
                    severity="Info"
                ))
                db.commit()
            db.close()
        except Exception as e:
            print("Error saving notification to db:", e)'''

content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated services.py")
