# frontend/Dockerfile

# 1. Usar una imagen oficial de Node.js como base
FROM node:18-alpine

# 2. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiar los archivos de dependencias.
# Hacemos esto en un paso separado para aprovechar la caché de Docker.
# Si no cambiamos las dependencias, no se volverá a ejecutar 'npm install'.
COPY package.json ./
COPY package-lock.json ./

# 4. Instalar las dependencias del proyecto
RUN npm install

# 5. Copiar el resto del código de la aplicación
COPY . .

# 6. Exponer el puerto 3000, que es el que usa el servidor de desarrollo de React
EXPOSE 3000

# 7. El comando para iniciar la aplicación
CMD ["npm", "start"]