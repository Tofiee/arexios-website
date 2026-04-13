import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+mysqlconnector://root:@localhost:3306/arexios_db")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN discord_id VARCHAR(50);"))
        conn.execute(text("ALTER TABLE users ADD COLUMN discord_username VARCHAR(100);"))
        conn.commit()
        print("Successfully altered users table for discord columns.")
    except Exception as e:
        print(f"Alter table failed (maybe columns exist?): {e}")
