import sqlite3


DATABASE = "vendoriq.db"


def migrate():

    connection = sqlite3.connect(
        DATABASE
    )

    cursor = connection.cursor()


    cursor.execute(
        "PRAGMA table_info(vendors)"
    )

    existing_columns = {

        row[1]

        for row in cursor.fetchall()

    }


    # ==========================================
    # CATEGORY
    # ==========================================

    if "category" not in existing_columns:

        cursor.execute(
            """
            ALTER TABLE vendors
            ADD COLUMN category
            TEXT DEFAULT 'Service Provider'
            """
        )

        print(
            "Added category column"
        )


    # ==========================================
    # APPROVAL STATUS
    # ==========================================

    if "approval_status" not in existing_columns:

        cursor.execute(
            """
            ALTER TABLE vendors
            ADD COLUMN approval_status
            TEXT DEFAULT 'Pending'
            """
        )

        print(
            "Added approval_status column"
        )


    # ==========================================
    # STATUS
    # ==========================================

    if "status" not in existing_columns:

        cursor.execute(
            """
            ALTER TABLE vendors
            ADD COLUMN status
            TEXT DEFAULT 'Active'
            """
        )

        print(
            "Added status column"
        )


    # ==========================================
    # CONTACT PERSON
    # ==========================================

    if "contact_person" not in existing_columns:

        cursor.execute(
            """
            ALTER TABLE vendors
            ADD COLUMN contact_person
            TEXT
            """
        )

        print(
            "Added contact_person column"
        )


    connection.commit()

    connection.close()


    print(
        "\nVendor database migration completed."
    )


if __name__ == "__main__":

    migrate()