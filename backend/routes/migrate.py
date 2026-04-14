from fastapi import APIRouter
import mysql.connector
import os

router = APIRouter()

@router.post("/migrate/add-columns")
def migrate_add_columns():
    host = os.getenv('MYSQLHOST', 'mysql.railway.internal')
    port = int(os.getenv('MYSQLPORT', '3306'))
    user = os.getenv('MYSQLUSER', 'root')
    password = os.getenv('MYSQLPASSWORD') or os.getenv('MYSQL_ROOT_PASSWORD')
    database = os.getenv('MYSQLDATABASE', 'railway')
    
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
        
        cursor.execute("""
            ALTER TABLE support_sessions 
            ADD COLUMN ip_address VARCHAR(50) NULL,
            ADD COLUMN location VARCHAR(100) NULL
        """)
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {"status": "success", "message": "Columns added", "tables": tables}
    except Exception as e:
        return {"status": "error", "message": str(e)}
