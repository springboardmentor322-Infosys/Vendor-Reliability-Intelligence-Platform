import re
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text
from openpyxl.utils import get_column_letter


DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "Vendor-Reliability",
    "user": "postgres",
    "password": "Su26pr04aja",
}

OUTPUT_FILE = Path("vendoriq_complete_database.xlsx")


def clean_sheet_name(name: str) -> str:
    """
    Excel worksheet names:
    - Maximum 31 characters
    - Cannot contain: \\ / * ? : [ ]
    """
    name = re.sub(r'[\\/*?:\[\]]', "_", name)
    return name[:31] or "Sheet"


def make_unique_sheet_name(table_name: str, used_names: set) -> str:
    base_name = clean_sheet_name(table_name)
    sheet_name = base_name
    counter = 1

    while sheet_name in used_names:
        suffix = f"_{counter}"
        sheet_name = f"{base_name[:31 - len(suffix)]}{suffix}"
        counter += 1

    used_names.add(sheet_name)
    return sheet_name


def remove_timezone_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    """
    Convert timezone-aware datetime columns into timezone-naive
    datetime columns so Excel can store them.
    """
    for column in dataframe.columns:
        if isinstance(dataframe[column].dtype, pd.DatetimeTZDtype):
            dataframe[column] = dataframe[column].dt.tz_localize(None)

    return dataframe


def format_worksheet(worksheet):
    """
    Apply basic formatting:
    - Freeze the header row
    - Enable autofilter
    - Adjust column widths
    """
    worksheet.freeze_panes = "A2"
    worksheet.auto_filter.ref = worksheet.dimensions

    for column_cells in worksheet.columns:
        max_length = 0
        column_letter = get_column_letter(column_cells[0].column)

        for cell in column_cells:
            if cell.value is not None:
                max_length = max(max_length, len(str(cell.value)))

        worksheet.column_dimensions[column_letter].width = min(
            max(max_length + 2, 12),
            40
        )


def main():
    password = DB_CONFIG["password"]

    if password == "YOUR_DATABASE_PASSWORD":
        raise ValueError(
            "Please replace YOUR_DATABASE_PASSWORD with your PostgreSQL password."
        )

    connection_url = (
        f"postgresql+psycopg2://"
        f"{DB_CONFIG['user']}:{password}@"
        f"{DB_CONFIG['host']}:{DB_CONFIG['port']}/"
        f"{DB_CONFIG['database']}"
    )

    engine = create_engine(connection_url)

    with engine.connect() as connection:
        tables_query = text("""
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """)

        tables = [
            row[0]
            for row in connection.execute(tables_query).fetchall()
        ]

        used_sheet_names = set()

        with pd.ExcelWriter(
            OUTPUT_FILE,
            engine="openpyxl"
        ) as writer:

            for table_name in tables:
                print(f"Exporting: {table_name}")

                query = text(
                    f'SELECT * FROM public."{table_name}"'
                )

                dataframe = pd.read_sql_query(
                    query,
                    connection
                )

                # Fix timezone-aware datetime columns
                dataframe = remove_timezone_columns(dataframe)

                sheet_name = make_unique_sheet_name(
                    table_name,
                    used_sheet_names
                )

                dataframe.to_excel(
                    writer,
                    sheet_name=sheet_name,
                    index=False
                )

                worksheet = writer.book[sheet_name]
                format_worksheet(worksheet)

    print("\nExport completed successfully.")
    print(f"Output file: {OUTPUT_FILE.resolve()}")
    print(f"Tables exported: {len(tables)}")


if __name__ == "__main__":
    main()