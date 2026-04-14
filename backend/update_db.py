import os
import mysql.connector

host = os.getenv('MYSQLHOST', 'mysql.railway.internal')
port = int(os.getenv('MYSQLPORT', '3306'))
user = os.getenv('MYSQLUSER', 'root')
password = os.getenv('MYSQLPASSWORD')
database = os.getenv('MYSQLDATABASE', 'railway')

print(f"Connecting to {host}:{port}/{database}")

try:
    conn = mysql.connector.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database
    )
    cursor = conn.cursor()
    
    cursor.execute("SHOW TABLES;")
    tables = cursor.fetchall()
    print(f"Tables: {tables}")
    
    cursor.execute("""
        ALTER TABLE support_sessions 
        ADD COLUMN ip_address VARCHAR(50) NULL,
        ADD COLUMN location VARCHAR(100) NULL
    """)
    conn.commit()
    print("Columns added successfully!")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
