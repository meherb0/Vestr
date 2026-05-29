from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# This is the path where our SQLite database file will live
DATABASE_URL = "sqlite:///./vestr.db"

# The engine is the core connection to our database
# It handles all the actual talking to SQLite under the hood
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite specifically
)

# Every database table we create will inherit from this Base class
# Think of it as the parent blueprint all our tables share
Base = declarative_base()

# SessionLocal is a factory that creates database sessions
# A session = one conversation with the database (read, write, close)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def init_db():
    """Creates all tables in the database if they don't exist yet"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """
    Gives us a database session and guarantees it closes properly
    even if something crashes halfway through
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()