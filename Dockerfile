FROM postgres:18
WORKDIR /ProjetoCoopVale
COPY . .
RUN (comandos do tauri)
CMD ["npm", "install", (comandos do tauri)]