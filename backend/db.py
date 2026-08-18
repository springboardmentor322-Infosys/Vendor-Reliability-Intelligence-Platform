import psycopg2
import os
import threading
from dotenv import load_dotenv

# Load .env from root directory
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(ROOT_DIR, ".env"))

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "vendor_platform")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Amruta@9279")
DB_PORT = os.getenv("DB_PORT", "5432")

class ThreadLocalConnectionProxy:
    def __init__(self):
        self._local = threading.local()

    def _get_conn(self):
        # Retrieve or initialize the thread-local connection
        conn = getattr(self._local, "conn", None)
        if conn is None or conn.closed:
            conn = psycopg2.connect(
                host=DB_HOST,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD,
                port=DB_PORT
            )
            self._local.conn = conn
        return conn

    def cursor(self, *args, **kwargs):
        return self._get_conn().cursor(*args, **kwargs)

    def commit(self):
        conn = getattr(self._local, "conn", None)
        if conn is not None and not conn.closed:
            conn.commit()

    def rollback(self):
        conn = getattr(self._local, "conn", None)
        if conn is not None and not conn.closed:
            conn.rollback()

    def close(self):
        conn = getattr(self._local, "conn", None)
        if conn is not None:
            try:
                if not conn.closed:
                    conn.close()
            except Exception:
                pass
            self._local.conn = None

    def __enter__(self):
        return self._get_conn().__enter__()

    def __exit__(self, exc_type, exc_val, exc_tb):
        return self._get_conn().__exit__(exc_type, exc_val, exc_tb)

    def __getattr__(self, name):
        return getattr(self._get_conn(), name)

class ThreadLocalCursorProxy:
    def __init__(self, connection_proxy):
        self._connection_proxy = connection_proxy

    def _get_cursor(self):
        local = self._connection_proxy._local
        cursor = getattr(local, "cursor", None)
        if cursor is None or cursor.closed:
            cursor = self._connection_proxy._get_conn().cursor()
            local.cursor = cursor
        return cursor

    def execute(self, *args, **kwargs):
        return self._get_cursor().execute(*args, **kwargs)

    def fetchone(self, *args, **kwargs):
        return self._get_cursor().fetchone(*args, **kwargs)

    def fetchall(self, *args, **kwargs):
        return self._get_cursor().fetchall(*args, **kwargs)

    def fetchmany(self, *args, **kwargs):
        return self._get_cursor().fetchmany(*args, **kwargs)

    def close(self):
        local = self._connection_proxy._local
        cursor = getattr(local, "cursor", None)
        if cursor is not None:
            try:
                if not cursor.closed:
                    cursor.close()
            except Exception:
                pass
            local.cursor = None

    def __enter__(self):
        return self._get_cursor().__enter__()

    def __exit__(self, exc_type, exc_val, exc_tb):
        return self._get_cursor().__exit__(exc_type, exc_val, exc_tb)

    def __getattr__(self, name):
        return getattr(self._get_cursor(), name)

# Instantiated thread-safe proxies
conn = ThreadLocalConnectionProxy()
cursor = ThreadLocalCursorProxy(conn)