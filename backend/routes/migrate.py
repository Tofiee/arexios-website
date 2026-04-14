from fastapi import APIRouter
import mysql.connector
import os

router = APIRouter()

@router.post("/migrate/add-columns")
def migrate_add_columns():
    MYSQL_URL = os.getenv('MYSQL_URL', '')
    
    if not MYSQL_URL:
        return {"status": "error", "message": "MYSQL_URL not found"}
    
    url_parts = MYSQL_URL.replace("mysql://", "").split("/")
    user_pass_host_port = url_parts[0]
    db_name = url_parts[1] if len(url_parts) > 1 else "railway"
    
    user_pass, host_port = user_pass_host_port.rsplit("@", 1)
    user = user_pass.split(":")[0]
    password = user_pass.split(":")[1] if ":" in user_pass else ""
    host = host_port.split(":")[0]
    port = int(host_port.split(":")[1]) if ":" in host_port else 3306
    
    try:
        conn = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=db_name
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
        
        return {"status": "success", "message": "Columns added", "tables": [t[0] for t in tables]}
    except Exception as e:
        return {"status": "error", "message": str(e)}
