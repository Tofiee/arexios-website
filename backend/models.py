from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(20), nullable=False, index=True)
    provider_id = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(100), nullable=True)
    username = Column(String(100), nullable=False)
    avatar_url = Column(String(255), nullable=True)
    steam_id = Column(String(50), nullable=True)
    discord_id = Column(String(50), nullable=True)
    discord_username = Column(String(100), nullable=True)
    role = Column(String(20), default="member")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ServerAdmin(Base):
    __tablename__ = "server_admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False)
    steam_id = Column(String(50), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    username = Column(String(100), nullable=False, default="Misafir")
    complaint_type = Column(String(50), nullable=False)
    target_name = Column(String(100), nullable=True)
    target_steam_id = Column(String(50), nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class SupportSession(Base):
    __tablename__ = "support_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_name = Column(String(100), nullable=False)
    user_email = Column(String(100), nullable=True)
    status = Column(String(20), default="waiting")  # "waiting", "active", "closed"
    assigned_admin_id = Column(Integer, nullable=True)
    assigned_admin_name = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    location = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class SupportMessage(Base):
    __tablename__ = "support_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False, index=True)
    sender_type = Column(String(20), nullable=False)  # "user", "admin", "system"
    sender_name = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SkinCategory(Base):
    __tablename__ = "skin_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    tier = Column(String(20), nullable=True)  # "premium", "premium_plus"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    skins = relationship("Skin", back_populates="category")

class Skin(Base):
    __tablename__ = "skins"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    image_url = Column(String(500), nullable=False)
    price = Column(Integer, nullable=False)
    category_id = Column(Integer, ForeignKey("skin_categories.id"), nullable=True)
    tier = Column(String(20), nullable=True)  # "premium", "premium_plus"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    category = relationship("SkinCategory", back_populates="skins")

class SiteSettings(Base):
    __tablename__ = "site_settings"

    id = Column(Integer, primary_key=True, index=True)
    cs16_server_ip = Column(String(100), nullable=True)
    cs16_server_ip = Column(String(100), nullable=True)
    cs16_server_port = Column(String(10), nullable=True)
    ts3_server_ip = Column(String(100), nullable=True)
    ts3_server_port = Column(String(10), nullable=True)
    ts3_query_port = Column(String(10), nullable=True)
    ts3_query_user = Column(String(100), nullable=True)
    ts3_query_password = Column(String(100), nullable=True)
    announcement_title = Column(String(255), nullable=True)
    announcement_content = Column(Text, nullable=True)
    announcement_active = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class LiveChatAdmin(Base):
    __tablename__ = "livechat_admins"

    id = Column(Integer, primary_key=True, index=True)
    steam_id = Column(String(50), nullable=True, unique=True)
    user_id = Column(Integer, nullable=True, unique=True)
    username = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superadmin = Column(Boolean, default=False)
    can_livechat = Column(Boolean, default=True)
    can_skin_management = Column(Boolean, default=True)
    can_settings = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

