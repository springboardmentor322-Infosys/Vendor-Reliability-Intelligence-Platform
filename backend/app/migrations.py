from sqlalchemy import inspect, text

from app.database import engine


def ensure_schema():
    """
    Run lightweight database migrations required by VendorIQ.

    This project supports SQLite for local/demo use and PostgreSQL
    through DATABASE_URL. Each migration checks whether the required
    table/column already exists before creating it.
    """

    inspector = inspect(engine)
    dialect = engine.dialect.name

    # ==========================================================
    # AUDIT FINDINGS TABLE
    # ==========================================================

    if "audit_findings" not in inspector.get_table_names():

        if dialect == "sqlite":
            with engine.begin() as conn:
                conn.execute(
                    text(
                        """
                        CREATE TABLE audit_findings (
                            id INTEGER PRIMARY KEY,
                            finding_id VARCHAR UNIQUE NOT NULL,
                            finding VARCHAR NOT NULL,
                            description TEXT,
                            vendor_id INTEGER,
                            audit VARCHAR NOT NULL,
                            severity VARCHAR NOT NULL DEFAULT 'Medium',
                            status VARCHAR NOT NULL DEFAULT 'Open',
                            evidence_url VARCHAR,
                            due_date DATE,
                            FOREIGN KEY (vendor_id)
                                REFERENCES vendors(id)
                        )
                        """
                    )
                )

        else:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS audit_findings (
                            id SERIAL PRIMARY KEY,
                            finding_id VARCHAR UNIQUE NOT NULL,
                            finding VARCHAR NOT NULL,
                            description TEXT,
                            vendor_id INTEGER,
                            audit VARCHAR NOT NULL,
                            severity VARCHAR NOT NULL DEFAULT 'Medium',
                            status VARCHAR NOT NULL DEFAULT 'Open',
                            evidence_url VARCHAR,
                            due_date DATE,
                            FOREIGN KEY (vendor_id)
                                REFERENCES vendors(id)
                        )
                        """
                    )
                )

    else:

        # ======================================================
        # ADD MISSING COLUMNS TO EXISTING TABLE
        # ======================================================

        columns = {
            column["name"]
            for column in inspector.get_columns(
                "audit_findings"
            )
        }

        required_columns = {
            "finding_id": "VARCHAR",
            "finding": "VARCHAR",
            "description": "TEXT",
            "vendor_id": "INTEGER",
            "audit": "VARCHAR",
            "severity": "VARCHAR",
            "status": "VARCHAR",
            "evidence_url": "VARCHAR",
            "due_date": "DATE",
        }

        for column_name, column_type in required_columns.items():

            if column_name in columns:
                continue

            with engine.begin() as conn:

                if dialect == "sqlite":

                    conn.execute(
                        text(
                            f"""
                            ALTER TABLE audit_findings
                            ADD COLUMN {column_name}
                            {column_type}
                            """
                        )
                    )

                else:

                    conn.execute(
                        text(
                            f"""
                            ALTER TABLE audit_findings
                            ADD COLUMN IF NOT EXISTS
                            {column_name}
                            {column_type}
                            """
                        )
                    )

    # ==========================================================
    # PROCUREMENT REQUEST EXPECTED DELIVERY DATE
    # ==========================================================
    #
    # This migration is also kept here because the application
    # already uses this field when creating purchase orders.
    #

    inspector = inspect(engine)

    if "procurement_requests" in inspector.get_table_names():

        columns = {
            column["name"]
            for column in inspector.get_columns(
                "procurement_requests"
            )
        }

        if "expected_delivery_date" not in columns:

            with engine.begin() as conn:

                conn.execute(
                    text(
                        """
                        ALTER TABLE procurement_requests
                        ADD COLUMN expected_delivery_date DATE
                        """
                    )
                )

    # ==========================================================
    # CONTRACT EVIDENCE URL
    # ==========================================================

    inspector = inspect(engine)

    if "contracts" in inspector.get_table_names():

        columns = {
            column["name"]
            for column in inspector.get_columns(
                "contracts"
            )
        }

        if "evidence_url" not in columns:

            with engine.begin() as conn:

                conn.execute(
                    text(
                        """
                        ALTER TABLE contracts
                        ADD COLUMN evidence_url VARCHAR
                        """
                    )
                )
# ==========================================================
# VENDOR ONBOARDING DATE
# ==========================================================
# Added for the Vendor Management directory. Existing demo vendors
# receive deterministic demo onboarding dates; newly registered vendors
# receive today's date from the create endpoint.


def _ensure_vendor_onboarding_date():
    inspector = inspect(engine)
    if "vendors" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("vendors")}
    if "onboarded_date" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE vendors ADD COLUMN onboarded_date DATE"))

    # Populate existing demo records only when the value is missing.
    from datetime import date, timedelta
    with engine.begin() as conn:
        rows = conn.execute(
            text("SELECT id FROM vendors WHERE onboarded_date IS NULL")
        ).fetchall()
        for row in rows:
            onboarded = date(2025, 1, 1) + timedelta(days=(int(row[0]) - 1) * 7)
            conn.execute(
                text("UPDATE vendors SET onboarded_date = :onboarded WHERE id = :id"),
                {"onboarded": onboarded, "id": row[0]}
            )

_ensure_vendor_onboarding_date()


# ==========================================================
# PROCUREMENT REQUEST DETAILS / PURCHASE ORDER DETAILS
# ==========================================================

def _ensure_procurement_and_order_detail_columns():
    inspector = inspect(engine)
    dialect = engine.dialect.name

    if "procurement_requests" in inspector.get_table_names():
        columns = {c["name"] for c in inspector.get_columns("procurement_requests")}
        required = {
            "requested_by": "VARCHAR",
            "priority": "VARCHAR",
            "justification": "VARCHAR",
        }
        for name, typ in required.items():
            if name not in columns:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE procurement_requests ADD COLUMN {name} {typ}"))

    if "orders" in inspector.get_table_names():
        columns = {c["name"] for c in inspect(engine).get_columns("orders")}
        required = {
            "payment_terms": "VARCHAR",
            "line_items_json": "VARCHAR",
            "shipping_mode": "VARCHAR",
        }
        for name, typ in required.items():
            if name not in columns:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE orders ADD COLUMN {name} {typ}"))

        # Existing demo orders created before these fields were added should
        # still display complete order details in the Procurement Manager view.
        # Refresh the column set after ALTER TABLE operations so this works on
        # older SQLite databases as well as newly created ones.
        final_columns = {c["name"] for c in inspect(engine).get_columns("orders")}
        with engine.begin() as conn:
            if "payment_terms" in final_columns:
                conn.execute(text("UPDATE orders SET payment_terms = 'Advance' WHERE payment_terms IS NULL OR payment_terms = ''"))
            if "shipping_mode" in final_columns:
                conn.execute(text("UPDATE orders SET shipping_mode = 'Standard' WHERE shipping_mode IS NULL OR shipping_mode = ''"))

_ensure_procurement_and_order_detail_columns()
