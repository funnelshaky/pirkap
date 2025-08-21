# app/models.py

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    projects = relationship("Project", back_populates="owner")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="projects")
    drills = relationship("Drill", back_populates="project", cascade="all, delete-orphan")

class Drill(Base):
    __tablename__ = "drills"
    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, index=True)
    x = Column(Float)
    y = Column(Float)
    z = Column(Float)
    tiempo = Column(Integer, default=0)
    is_initiator = Column(Boolean, default=False)
    project_id = Column(Integer, ForeignKey("projects.id"))
    
    project = relationship("Project", back_populates="drills")
    
    # Un taladro puede iniciar muchas secuencias (flechas de salida)
    sequences_from = relationship("SequenceLink", foreign_keys="[SequenceLink.from_drill_id]", back_populates="from_drill", cascade="all, delete-orphan")
    
    # Un taladro solo puede ser el destino de UNA secuencia (flecha de entrada)
    sequence_to = relationship("SequenceLink", foreign_keys="[SequenceLink.to_drill_id]", back_populates="to_drill", uselist=False)

class SequenceLink(Base):
    __tablename__ = "sequence_links"
    id = Column(Integer, primary_key=True)
    from_drill_id = Column(Integer, ForeignKey("drills.id"))
    to_drill_id = Column(Integer, ForeignKey("drills.id"), unique=True) # Regla: solo una flecha de entrada
    
    # Relaciones bidireccionales para una navegación de datos perfecta
    from_drill = relationship("Drill", back_populates="sequences_from", foreign_keys=[from_drill_id])
    to_drill = relationship("Drill", back_populates="sequence_to", foreign_keys=[to_drill_id])