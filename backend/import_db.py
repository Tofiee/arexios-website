import os
import mysql.connector
from mysql.connector import Error

def import_sql(file_path, host, port, user, password, database):
    try:
        connection = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            multi=True
        )
        
        if connection.is_connected():
            print(f"Connected to MySQL - {database}")
            
            with open(file_path, 'r', encoding='utf-8') as file:
                sql_content = file.read()
            
            cursor = connection.cursor()
            
            statements = []
            current_statement = []
            
            for line in sql_content.split('\n'):
                stripped = line.strip()
                
                if stripped.startswith('--') or not stripped:
                    continue
                
                current_statement.append(line)
                
                if stripped.endswith(';'):
                    statement = '\n'.join(current_statement).strip()
                    if statement:
                        statements.append(statement)
                    current_statement = []
            
            for i, statement in enumerate(statements):
                try:
                    cursor.execute(statement)
                    connection.commit()
                    print(f"Executed: {statement[:50]}...")
                except Error as e:
                    print(f"Error executing: {e}")
                    print(f"Statement: {statement[:100]}")
            
            cursor.close()
            connection.close()
            print("Import completed!")
            
    except Error as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    import sys
    
    sql_file = os.path.join(os.path.dirname(__file__), 'arexios_db.sql')
    print(f"Reading SQL file: {sql_file}")
    print(f"File exists: {os.path.exists(sql_file)}")
    
    host = os.getenv('MYSQL_HOST', 'mysql.railway.internal')
    port = int(os.getenv('MYSQL_PORT', '3306'))
    user = os.getenv('MYSQL_USER', 'root')
    password = os.getenv('MYSQL_PASSWORD')
    database = os.getenv('MYSQL_DATABASE', 'railway')
    
    print(f"Host: {host}, Port: {port}, User: {user}, Database: {database}")
    
    if os.path.exists(sql_file):
        import_sql(sql_file, host, port, user, password, database)
    else:
        print("SQL file not found!")
