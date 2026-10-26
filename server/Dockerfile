# CineLocal Server para Synology (Container Manager). Se construye desde la raíz del repositorio:
#   docker build -f server/Dockerfile -t cinelocal-server .
FROM node:22-bookworm-slim

# ffmpeg con VA-API y los controladores de la gráfica Intel (el DS220+ lleva un Celeron J4025, Gemini Lake)
RUN sed -i 's/^Components: main$/Components: main non-free non-free-firmware/' /etc/apt/sources.list.d/debian.sources \
 && apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg intel-media-va-driver-non-free i965-va-driver vainfo ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# sólo lo que usa el servidor: los módulos comunes de la app de escritorio, su interfaz y server/
COPY package.json ./
COPY src/main ./src/main
COPY src/renderer ./src/renderer
COPY server ./server

ENV NODE_ENV=production \
    CINELOCAL_DATA=/data \
    CINELOCAL_LIBRARY=/media \
    PORT=8095

EXPOSE 8095
# el usuario lo fija docker-compose.yml (el mismo uid que el de DSM, para poder leer la carpeta compartida)
CMD ["node", "server/index.js"]
