# ProjetoCoopVale

Projeto React + Electron, sem Vite.

## Instalação

Na pasta raiz:

```bash
npm install
```

## Executar

```bash
npm start
```

O comando `start` primeiro gera o bundle React com Webpack e depois abre o Electron.

## Estrutura relevante

- `Frontend/src/App.jsx` — componente principal React.
- `Frontend/src/Components/login.jsx` — tela de login ValeGestão.
- `Frontend/src/Styles/login.css` — estilos da tela.
- `Frontend/src/index.js` — entrada do React.
- `Frontend/src/electron/main.js` — processo principal do Electron.
- `Frontend/src/electron/preload.js` — preload.
- `webpack.config.js` — build do React sem Vite.
- `Frontend/dist/` — gerado automaticamente pelo build.

## Observação

A pasta `Frontend/dist` não precisa ser versionada; ela é recriada pelo `npm start`.
