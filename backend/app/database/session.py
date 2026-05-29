from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy import inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.models import db_models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_lightweight_columns()


def _ensure_lightweight_columns() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    statements = []
    if "bio" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN bio VARCHAR(500)")
    if "location" not in columns:
        statements.append("ALTER TABLE users ADD COLUMN location VARCHAR(120)")
    if not statements:
        return
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def seed_default_admin() -> None:
    from sqlalchemy import func

    from app.auth.security import hash_password
    from app.models.db_models import User, UserRole

    settings = get_settings()
    with SessionLocal() as db:
        existing = db.query(User).filter(func.lower(User.email) == settings.default_admin_email.lower()).first()
        if existing is not None:
            if existing.role != UserRole.ADMIN:
                existing.role = UserRole.ADMIN
                db.commit()
            return
        db.add(
            User(
                name=settings.default_admin_name,
                email=settings.default_admin_email.lower(),
                hashed_password=hash_password(settings.default_admin_password),
                role=UserRole.ADMIN,
            )
        )
        db.commit()
