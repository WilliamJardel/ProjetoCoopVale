# ProjetoCoopVale

Aplicação desktop CoopVale com frontend React e backend Rust/Tauri.

## Instalação

Na pasta raiz do projeto:

```bash# ProjetoCoopVale

Aplicação desktop **CoopVale**, desenvolvida com frontend em React e backend em Rust utilizando Tauri.

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de que possui as seguintes ferramentas instaladas:

- **Node.js** (versão 18 ou superior);
- **Rust** e **Cargo**;
- **npm** (gerenciador de pacotes do Node.js).

### Dependências para Linux (Ubuntu/Debian)

Caso esteja utilizando Linux, instale as dependências necessárias para interface gráfica e compilação do Tauri:

```bash
sudo apt update

sudo apt install -y \
  build-essential \
  curl \
  pkg-config \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libappindicator3-1 \
  librsvg2-dev \
  libsoup-3.0-dev \
  libssl-dev
```

## 🚀 Como executar o projeto

### 1. Instalar as dependências

Na pasta raiz do projeto, execute:

```bash
npm install
```

### 2. Executar em modo de desenvolvimento

Para iniciar o backend Tauri e o frontend React simultaneamente, execute:

```bash
npm start
```

> **Nota:** O Tauri inicia automaticamente o servidor Webpack na porta `3000` e abre a janela da aplicação desktop.

## 📦 Gerar a aplicação para produção

Para gerar o build otimizado do frontend e criar o pacote instalável da aplicação desktop, execute:

```bash
npm run build:desktop
```

O comando gera os artefatos de distribuição da aplicação, como pacotes `.deb` e `.AppImage`, conforme a configuração de build do projeto.

## 🛠️ Comandos úteis

**Executar apenas o frontend (sem a aplicação desktop):**

```bash
npm run dev
```

**Executar o Tauri diretamente pelo Cargo:**

Útil para desenvolvimento e depuração de erros relacionados ao backend Rust.

```bash
cd backend/CoopVale
cargo tauri dev
```

## 📁 Estrutura do projeto

Principais diretórios e arquivos da aplicação:

```text
ProjetoCoopVale/
├── Frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── Components/
│   │   │   └── login.jsx
│   │   ├── Styles/
│   │   │   └── login.css
│   │   └── index.js
│   └── dist/
│
├── backend/
│   └── CoopVale/
│       └── src-tauri/
│           └── # Backend Rust e comandos IPC do Tauri
│
└── webpack.config.js
```

### Principais arquivos

| Arquivo/Diretório | Descrição |
|---|---|
| `Frontend/src/App.jsx` | Componente principal da aplicação React. |
| `Frontend/src/Components/login.jsx` | Componente da tela de login ValeGestão. |
| `Frontend/src/Styles/login.css` | Estilização da tela de login. |
| `Frontend/src/index.js` | Ponto de entrada da aplicação React. |
| `backend/CoopVale/src-tauri/` | Backend Rust e comandos IPC do Tauri. |
| `webpack.config.js` | Configuração do Webpack para compilação do frontend. |
| `Frontend/dist/` | Diretório gerado automaticamente durante o build. |

## ⚠️ Observações

- A pasta `Frontend/dist/` é gerada automaticamente durante os processos de build.
- Não é necessário versionar os arquivos gerados dentro de `Frontend/dist/`.
- Certifique-se de incluir `Frontend/dist/` no arquivo `.gitignore` para evitar que os artefatos de compilação sejam enviados ao repositório.
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
