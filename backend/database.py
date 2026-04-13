import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv(override=True)

# We use HeidiSQL default connection structure commonly found in local environments.
# The user can edit the .env file if their configuration uses a password or non-standard port.
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+mysqlconnector://root:@localhost:3306/arexios_db")

# To automatically create the arexios_db if it doesn't exist, we must connect without a db name first
try:
    import mysql.connector
    url_parts = DATABASE_URL.replace("mysql+mysqlconnector://", "").split("/")
    user_pass_host_port = url_parts[0]
    db_name = url_parts[1].split('?')[0] if len(url_parts) > 1 else "arexios_db"
    
    # Simple parse string root:@localhost:3306
    user_pass, host_port = user_pass_host_port.split("@")
    user = user_pass.split(":")[0]
    password = user_pass.split(":")[1] if ":" in user_pass else ""
    host = host_port.split(":")[0]
    
    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password
    )
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    conn.close()
except Exception as e:
    print(f"Db init note (can be ignored if db exists): {e}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
