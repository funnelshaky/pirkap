# app/schemas.py (VERSIÓN CON REBUILD)

from pydantic import BaseModel, EmailStr
import datetime
from typing import List, Optional

# --- Schemas Base (sin relaciones) ---
class SequenceLinkBase(BaseModel):
    from_drill_id: int
    to_drill_id: int

class DrillBase(BaseModel):
    label: str
    x: float
    y: float
    z: float
    tiempo: int
    is_initiator: bool

class ProjectBase(BaseModel):
    name: str

class UserBase(BaseModel):
    email: EmailStr

# --- Schemas de Creación ---
class ProjectCreate(ProjectBase):
    pass

class UserCreate(UserBase):
    password: str

# --- Schemas Completos (con relaciones) ---
class SequenceLink(SequenceLinkBase):
    id: int
    class Config:
        from_attributes = True

class Drill(DrillBase):
    id: int
    project_id: int
    sequences_from: List['SequenceLink'] = [] # Usamos string para referencia futura
    class Config:
        from_attributes = True

class Project(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime.datetime
    drills: List[Drill] = []
    class Config:
        from_attributes = True

class User(UserBase):
    id: int
    projects: List[Project] = []
    class Config:
        from_attributes = True

# --- Schemas de Respuesta y Herramientas ---
class UserInDB(UserBase):
    id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class TimingApplication(BaseModel):
    delay_ms: int
    mode: str

class TimingAnalysisPoint(BaseModel):
    time: float
    energy: float

class TimingAnalysisResponse(BaseModel):
    data: List[TimingAnalysisPoint]

class ReliefPoint(BaseModel):
    x: float
    y: float
    relief_velocity: float

class ReliefAnalysisResponse(BaseModel):
    data: List[ReliefPoint]

class HistogramBin(BaseModel):
    time: int
    frequency: int
    drill_labels: List[str]

class TimingHistogramResponse(BaseModel):
    data: List[HistogramBin]

# --- ¡LÍNEA CLAVE! ---
# Esto le dice a Pydantic que resuelva las referencias circulares
Drill.model_rebuild()
Project.model_rebuild()
User.model_rebuild()