from app.database import SessionLocal, Base, engine
from app.models.budget import Budget
from app.models.user import User
from app.models.vendor import Vendor
from app.models.message_thread import MessageThread
from app.models.message import Message
from app.models.dispute import Dispute
from app.migrations import ensure_schema
ensure_schema(); Base.metadata.create_all(bind=engine)
db=SessionLocal()
try:
    for dept,limit in [("IT",5000000),("Operations",15000000),("Procurement",20000000),("General",10000000)]:
        if not db.query(Budget).filter_by(department=dept).first(): db.add(Budget(department=dept,allocated_limit=limit))
    u=db.query(User).filter_by(email="vendor@vendoriq.com").first(); v=db.query(Vendor).filter_by(id=1).first()
    if u and v: u.vendor_id=v.id; v.user_id=u.id
    db.commit()
finally: db.close()
print("Reference-aligned seed data ready.")
