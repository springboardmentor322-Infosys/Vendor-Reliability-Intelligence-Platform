import pymysql

def init_database():
    # Connect to MySQL server without specifying a database
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='1234'
    )
    
    try:
        with connection.cursor() as cursor:
            # Create the vendorintel database if it doesn't exist
            cursor.execute("CREATE DATABASE IF NOT EXISTS vendorintel")
            print("Database 'vendorintel' ensured to exist.")
    finally:
        connection.close()

if __name__ == "__main__":
    init_database()
