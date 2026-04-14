from fastapi import APIRouter
from sqlalchemy import text
import os

router = APIRouter()

SQL_DATA = {
    "admin": {"username": "Tofie", "steam_id": "76561198116871167", "is_active": 1},
    "category": {"name": "AWP", "slug": "awp", "is_active": 1},
    "skin": {
        "name": "Asiimov",
        "image_url": "https://toppng.com/uploads/preview/1600-x-342-13-cs-go-awp-asiimov-115629374274flsydpwq9.png",
        "price": 100,
        "is_active": 1
    },
    "user": {
        "provider": "google",
        "provider_id": "106108660317814261500",
        "email": "anilmentess@gmail.com",
        "username": "Anıl MENTEŞ",
        "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocLWeXCkZMT8TSvtI8F-FQoYnro5yBj3h9_VW8rnP3_-Q8EY1tV2=s96-c",
        "steam_id": "76561198116871167",
        "role": "member",
        "is_active": 1,
        "discord_id": "199494143947309056",
        "discord_username": "tofie_"
    }
}

def get_connection():
    import mysql.connector
    
    # Try Railway's DATABASE_URL first
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    
    # If no DATABASE_URL, try MYSQL_URL from Railway
    if not DATABASE_URL or "localhost" in DATABASE_URL:
        DATABASE_URL = os.getenv("MYSQL_URL", "")
    
    # If still empty, construct from individual variables
    if not DATABASE_URL or "localhost" in DATABASE_URL:
        host = os.getenv("MYSQLHOST", "mysql.railway.internal")
        port = os.getenv("MYSQLPORT", "3306")
        user = os.getenv("MYSQLUSER", "root")
        password = os.getenv("MYSQLPASSWORD") or os.getenv("MYSQL_ROOT_PASSWORD", "")
        db = os.getenv("MYSQLDATABASE", "railway")
        DATABASE_URL = f"mysql+mysqlconnector://{user}:{password}@{host}:{port}/{db}"
    
    url_parts = DATABASE_URL.replace("mysql+mysqlconnector://", "").split("/")
    user_pass_host_port = url_parts[0]
    db_name = url_parts[1].split('?')[0] if len(url_parts) > 1 else "railway"
    user_pass, host_port = user_pass_host_port.split("@")
    user = user_pass.split(":")[0]
    password = user_pass.split(":")[1] if ":" in user_pass else ""
    host = host_port.split(":")[0]
    port = int(host_port.split(":")[1]) if ":" in host_port else 3306
    
    return mysql.connector.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=db_name
    )

@router.post("/import-initial-data")
def import_initial_data():
    results = {"server_admins": None, "skin_categories": None, "skins": None, "users": None}
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO server_admins (username, steam_id, is_active) 
                VALUES (%s, %s, %s)
            """, (SQL_DATA["admin"]["username"], SQL_DATA["admin"]["steam_id"], SQL_DATA["admin"]["is_active"]))
            conn.commit()
            results["server_admins"] = "inserted"
        except Exception as e:
            if "Duplicate" in str(e) or "UNIQUE" in str(e):
                results["server_admins"] = "already exists"
            else:
                results["server_admins"] = f"error: {str(e)}"
        
        try:
            cursor.execute("""
                INSERT INTO skin_categories (name, slug, is_active) 
                VALUES (%s, %s, %s)
            """, (SQL_DATA["category"]["name"], SQL_DATA["category"]["slug"], SQL_DATA["category"]["is_active"]))
            conn.commit()
            results["skin_categories"] = "inserted"
        except Exception as e:
            if "Duplicate" in str(e) or "UNIQUE" in str(e):
                results["skin_categories"] = "already exists"
            else:
                results["skin_categories"] = f"error: {str(e)}"
        
        cursor.execute("SELECT id FROM skin_categories WHERE slug = %s", (SQL_DATA["category"]["slug"],))
        category = cursor.fetchone()
        category_id = category[0] if category else None
        
        if category_id:
            try:
                cursor.execute("""
                    INSERT INTO skins (name, image_url, price, is_active, category_id) 
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    SQL_DATA["skin"]["name"],
                    SQL_DATA["skin"]["image_url"],
                    SQL_DATA["skin"]["price"],
                    SQL_DATA["skin"]["is_active"],
                    category_id
                ))
                conn.commit()
                results["skins"] = "inserted"
            except Exception as e:
                if "Duplicate" in str(e) or "UNIQUE" in str(e):
                    results["skins"] = "already exists"
                else:
                    results["skins"] = f"error: {str(e)}"
        
        try:
            cursor.execute("""
                INSERT INTO users (provider, provider_id, email, username, avatar_url, steam_id, role, is_active, discord_id, discord_username) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                SQL_DATA["user"]["provider"],
                SQL_DATA["user"]["provider_id"],
                SQL_DATA["user"]["email"],
                SQL_DATA["user"]["username"],
                SQL_DATA["user"]["avatar_url"],
                SQL_DATA["user"]["steam_id"],
                SQL_DATA["user"]["role"],
                SQL_DATA["user"]["is_active"],
                SQL_DATA["user"]["discord_id"],
                SQL_DATA["user"]["discord_username"]
            ))
            conn.commit()
            results["users"] = "inserted"
        except Exception as e:
            if "Duplicate" in str(e) or "UNIQUE" in str(e):
                results["users"] = "already exists"
            else:
                results["users"] = f"error: {str(e)}"
        
        cursor.close()
        conn.close()
        
        return {"status": "success", "results": results}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}
