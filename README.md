# ProjetoCoopVale

Aplicação desktop CoopVale com frontend React e backend Rust/Tauri.

## Instalação

Na pasta raiz do projeto:

```bash
npm install
```

## Executar em desenvolvimento

```bash
npm start
```

O comando inicia o backend Tauri em `backend/CoopVale/src-tauri` e abre o
frontend React em modo de desenvolvimento. O Tauri inicia o servidor Webpack
na porta `3000`.

## Gerar a aplicação desktop

```bash
npm run build:desktop
```

O comando gera o frontend e cria o pacote desktop Tauri.

## Estrutura relevante

- `Frontend/src/App.jsx` — componente principal React.
- `Frontend/src/Components/login.jsx` — tela de login ValeGestão.
- `Frontend/src/Styles/login.css` — estilos da tela.
- `Frontend/src/index.js` — entrada do React.
- `backend/CoopVale/src-tauri/` — backend Rust e comandos IPC do Tauri.
- `webpack.config.js` — build do React sem Vite.
- `Frontend/dist/` — gerado automaticamente pelo build.

## Observação

A pasta `Frontend/dist` não precisa ser versionada; ela é recriada pelos comandos
de build e desenvolvimento.
