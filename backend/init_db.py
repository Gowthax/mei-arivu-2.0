import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:gownirai12*#@localhost:5432/meiarivu_db")
result = urllib.parse.urlparse(db_url)

username = result.username
password = result.password
database = result.path[1:]
hostname = result.hostname
port = result.port

try:
    con = psycopg2.connect(dbname='postgres', user=username, host=hostname, password=password, port=port)
    con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = con.cursor()
    cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{database}'")
    exists = cursor.fetchone()
    if not exists:
        cursor.execute(f'CREATE DATABASE "{database}"')
        print(f"Database {database} created.")
    else:
        print(f"Database {database} already exists.")
except Exception as e:
    print(f"Could not connect to postgres or create DB: {e}")
