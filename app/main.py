# app/main.py

from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from jose import jwt, JWTError
import pandas as pd
import io
import re
import numpy as np
import math
import json

from . import models, schemas, auth
from .database import engine, get_db

# Esta línea crea las tablas en la base de datos si no existen
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cloud Blasting API")

# Configuración de CORS para permitir la comunicación con el frontend
origins = ["http://localhost:3000", "http://localhost", "http://127.0.0.1", "null"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependencia de Autenticación ---
# Línea Corregida
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


# --- ¡NUEVA FUNCIÓN DE AYUDA! ---
def clean_orphan_drills(project_id: int, db: Session):
    """
    Encuentra y resetea el tiempo de todos los taladros 'huérfanos'
    (que no son iniciadores y no reciben ninguna conexión).
    """
    print("--- [DEBUG] Ejecutando limpieza de huérfanos ---")
    all_drills_in_project = db.query(models.Drill).filter(models.Drill.project_id == project_id).all()
    
    # Obtenemos los IDs de todos los taladros que SÍ reciben una conexión
    links_in_project = db.query(models.SequenceLink).join(models.Drill, models.SequenceLink.from_drill_id == models.Drill.id).filter(models.Drill.project_id == project_id)
    connected_drill_ids = {link.to_drill_id for link in links_in_project}

    for drill in all_drills_in_project:
        if not drill.is_initiator and drill.id not in connected_drill_ids:
            if drill.tiempo != 0: # Solo modificamos si es necesario
                print(f"--- [DEBUG] Reseteando taladro huérfano: {drill.label} (ID: {drill.id}) ---")
                drill.tiempo = 0
    
    db.commit()


# ===================================================================
# ENDPOINTS
# ===================================================================

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Cloud Blasting API is running - VERSION 2"}

# --- Endpoints de Usuarios ---

@app.post("/api/users/", response_model=schemas.UserInDB)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos", headers={"WWW-Authenticate": "Bearer"})
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/", response_model=list[schemas.User])
def read_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

# --- Endpoints de Proyectos ---

@app.post("/api/projects/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_project = models.Project(name=project.name, owner_id=current_user.id)
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@app.get("/api/projects/", response_model=list[schemas.Project])
def read_projects(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Project).filter(models.Project.owner_id == current_user.id).all()

@app.get("/api/projects/{project_id}", response_model=schemas.Project)
def read_project(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    project = db.query(models.Project).options(joinedload(models.Project.drills).joinedload(models.Drill.sequences_from)).filter(
        models.Project.id == project_id, 
        models.Project.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project

@app.post("/api/projects/{project_id}/upload-csv/", response_model=schemas.Project)
async def upload_csv_for_project(
    project_id: int, 
    file: UploadFile = File(...), 
    mapping: str = Form(...),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(models.Project.id == project_id, models.Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    db.query(models.Drill).filter(models.Drill.project_id == project_id).delete()
    
    try:
        column_mapping = json.loads(mapping)
        
        # --- ¡CAMBIO CLAVE! ---
        # 1. Filtramos el mapeo para quitar las claves que el usuario dejó vacías (como 'z')
        filtered_mapping = {k: v for k, v in column_mapping.items() if v}

        # 2. Creamos el diccionario para renombrar, solo con las columnas que el usuario sí mapeó
        rename_dict = {v: k for k, v in filtered_mapping.items()}
        
        contents = await file.read()
        # Leemos el CSV, asumiendo que la primera fila son los encabezados
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))

        # 3. Renombramos las columnas
        df = df.rename(columns=rename_dict)

        # 4. Verificamos que las columnas requeridas existan después de renombrar
        required_cols = ['label', 'x', 'y']
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"La columna mapeada para '{col}' no se encontró en el archivo.")

        # 5. Si la columna 'z' no existe después del mapeo, la creamos con un valor por defecto
        if 'z' not in df.columns:
            df['z'] = 0.0

        # 6. Seleccionamos solo las columnas que nos interesan para evitar datos extra
        final_df = df[['label', 'x', 'y', 'z']]

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error procesando el archivo o el mapeo: {e}")

    for index, row in final_df.iterrows():
        drill_data = models.Drill(
            label=str(row['label']), x=row['x'], y=row['y'], z=row['z'],
            tiempo=0, is_initiator=False, project_id=project.id
        )
        db.add(drill_data)
        
    db.commit()
    db.refresh(project)
    return project

# --- Endpoints de Secuenciación ---

@app.post("/api/projects/{project_id}/set-initiator/{drill_id}", response_model=schemas.Project)
def set_initiator(project_id: int, drill_id: int, timing: schemas.TimingApplication, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    drill = db.query(models.Drill).filter(models.Drill.id == drill_id, models.Drill.project_id == project_id).first()
    if not drill:
        raise HTTPException(status_code=404, detail="Taladro no encontrado")
    
    if timing.delay_ms >= 0:
        drill.is_initiator = True
        drill.tiempo = timing.delay_ms
    else:
        drill.is_initiator = False
        drill.tiempo = 0 
    
    db.commit()

    # ¡Llamamos a nuestra función de limpieza y listo!
    clean_orphan_drills(project_id, db)
    
    return db.query(models.Project).options(joinedload(models.Project.drills).joinedload(models.Drill.sequences_from)).filter(models.Project.id == project_id).first()

@app.post("/api/projects/{project_id}/apply-sequence/{from_id}/{to_id}", response_model=schemas.Project)
def apply_sequence(project_id: int, from_id: int, to_id: int, timing_data: schemas.TimingApplication, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    from_drill = db.query(models.Drill).get(from_id)
    to_drill = db.query(models.Drill).get(to_id)

    if not from_drill or not to_drill or from_drill.project_id != project_id or to_drill.project_id != project_id:
        raise HTTPException(status_code=404, detail="Taladro no encontrado en este proyecto")

    existing_link = db.query(models.SequenceLink).filter(models.SequenceLink.to_drill_id == to_id).first()
    if existing_link:
        raise HTTPException(status_code=400, detail=f"El taladro {to_drill.label} ya recibe una conexión.")

    new_link = models.SequenceLink(from_drill_id=from_id, to_drill_id=to_id)
    db.add(new_link)
    to_drill.tiempo = from_drill.tiempo + timing_data.delay_ms
    
    db.commit()

    # ¡Llamamos a nuestra función de limpieza y listo!
    clean_orphan_drills(project_id, db)
    
    return db.query(models.Project).options(joinedload(models.Project.drills).joinedload(models.Drill.sequences_from)).filter(models.Project.id == project_id).first()


@app.post("/api/projects/{project_id}/undo-last-sequence", response_model=schemas.Project)
def undo_last_sequence(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    last_link = db.query(models.SequenceLink).join(models.Drill, models.SequenceLink.from_drill_id == models.Drill.id)\
        .filter(models.Drill.project_id == project_id).order_by(models.SequenceLink.id.desc()).first()

    if not last_link:
        raise HTTPException(status_code=400, detail="No hay secuencias que deshacer.")

    db.delete(last_link)
    db.commit()

    # ¡Llamamos a nuestra función de limpieza y listo!
    clean_orphan_drills(project_id, db)

    return db.query(models.Project).options(joinedload(models.Project.drills).joinedload(models.Drill.sequences_from)).filter(models.Project.id == project_id).first()



@app.get("/api/projects/{project_id}/timing-analysis", response_model=schemas.TimingAnalysisResponse)
def get_timing_analysis(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    project = db.query(models.Project).options(joinedload(models.Project.drills)).filter(models.Project.id == project_id, models.Project.owner_id == current_user.id).first()
    if not project or not project.drills:
        return {"data": []}
    drill_times = [d.tiempo for d in project.drills]
    if not drill_times:
        return {"data": []}
    max_time = max(drill_times) if drill_times else 0
    time_axis = np.linspace(0, max_time + 50, num=500)
    total_energy = np.zeros_like(time_axis)
    std_dev = 5.0
    amplitude = 1.0
    for t in drill_times:
        energy_curve = amplitude * np.exp(-0.5 * ((time_axis - t) / std_dev) ** 2)
        total_energy += energy_curve
    response_data = [{"time": t, "energy": e} for t, e in zip(time_axis, total_energy)]
    return {"data": response_data}

@app.get("/api/projects/{project_id}/relief-analysis", response_model=schemas.ReliefAnalysisResponse)
def get_relief_analysis(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print("\n--- [DEBUG] Iniciando get_relief_analysis ---")
    links = db.query(models.SequenceLink).join(models.Drill, models.SequenceLink.from_drill_id == models.Drill.id)\
        .filter(models.Drill.project_id == project_id)\
        .options(joinedload(models.SequenceLink.from_drill), joinedload(models.SequenceLink.to_drill))\
        .all()

    if not links:
        print("[DEBUG] No se encontraron enlaces. Devolviendo datos vacíos.")
        return {"data": []}

    print(f"[DEBUG] Se encontraron {len(links)} enlaces.")
    relief_data = []
    for i, link in enumerate(links):
        print(f"\n[DEBUG] Procesando enlace #{i+1}: from_id={link.from_drill_id}, to_id={link.to_drill_id}")
        
        from_drill = link.from_drill
        to_drill = link.to_drill

        if not from_drill or not to_drill:
            print(f"[ERROR] ¡Taladro de origen o destino es Nulo! From: {from_drill}, To: {to_drill}")
            continue

        print(f"[DEBUG] From: {from_drill.label} (tiempo={from_drill.tiempo}), To: {to_drill.label} (tiempo={to_drill.tiempo})")
        
        time_delay = to_drill.tiempo - from_drill.tiempo
        print(f"[DEBUG] Retardo de tiempo calculado: {time_delay}")

        if time_delay > 0:
            distance = math.sqrt((to_drill.x - from_drill.x)**2 + (to_drill.y - from_drill.y)**2)
            velocity = distance / time_delay
            
            mid_x = (from_drill.x + to_drill.x) / 2
            mid_y = (from_drill.y + to_drill.y) / 2
            
            relief_data.append({"x": mid_x, "y": mid_y, "relief_velocity": velocity})
            print(f"[DEBUG] Punto de relief añadido. Velocidad: {velocity}")
        else:
            print(f"[WARN] Retardo de tiempo es cero o negativo. Omitiendo enlace.")

    print("--- [DEBUG] Finalizando get_relief_analysis ---\n")
    return {"data": relief_data}

@app.get("/api/projects/{project_id}/timing-histogram", response_model=schemas.TimingHistogramResponse)
def get_timing_histogram(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    project = db.query(models.Project).options(joinedload(models.Project.drills)).filter(models.Project.id == project_id, models.Project.owner_id == current_user.id).first()
    if not project or not project.drills:
        return {"data": []}
    df = pd.DataFrame([{"tiempo": d.tiempo, "label": d.label} for d in project.drills])
    if df.empty:
        return {"data": []}
    histogram_data = df.groupby('tiempo').agg(frequency=('label', 'count'), drill_labels=('label', list)).reset_index()
    response_data = histogram_data.apply(lambda row: {"time": row['tiempo'], "frequency": row['frequency'], "drill_labels": row['drill_labels']}, axis=1).tolist()
    return {"data": response_data}
