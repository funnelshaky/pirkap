# Dockerfile (VERSIÓN FINAL Y VERIFICADA)

FROM python:3.10-bullseye

WORKDIR /code

COPY requirements.txt .

# Instala las dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /code/app

EXPOSE 8000
