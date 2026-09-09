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