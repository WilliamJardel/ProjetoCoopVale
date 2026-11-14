# ProjetoCoopVale

Aplicação desktop CoopVale com frontend React, empacotada pelo Tauri e com
backend em Rust.

## Pré-requisitos

- Node.js e npm;
- Rust e Cargo;
- Dependências de sistema para Tauri no Linux (GTK, WebKitGTK, librsvg e
  bibliotecas de desenvolvimento correspondentes).

## Instalação e execução

Na raiz do projeto:

```bash
npm install
npm start
```

`npm start` executa `tauri dev`, que inicia o servidor Webpack na porta `3000`
e abre a aplicação desktop.

Para executar somente o frontend:

```bash
npm run dev
```

Para compilar o frontend e empacotar a aplicação desktop:

```bash
npm run build:desktop
```

Para verificar o backend Rust:

```bash
cd src-tauri
cargo check
```

## Estrutura

```text
ProjetoCoopVale/
├── src/                 # Aplicação React e referências das telas de entrega
├── src-tauri/            # Backend Rust e configuração Tauri
├── dist/                 # Artefatos gerados pelo Webpack
├── package.json
└── webpack.config.js
```

O código anterior das telas e do serviço de entregas está preservado em
`src/reference/backend/`; esses arquivos são referências e não fazem parte do
bundle React atual.
