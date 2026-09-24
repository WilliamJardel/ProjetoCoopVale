# CoopVale - Backend (Tauri + Rust + SQLite)

Este projeto **não utiliza uma API REST tradicional via HTTP**.

A comunicação entre o frontend (React/Vue/etc.) e o backend (Rust) é realizada por meio de **comandos IPC fornecidos pelo Tauri**.

## 🛠️ Como rodar o projeto

Certifique-se de ter as dependências necessárias do Tauri instaladas no Linux, como `libwebkit2gtk-4.1-dev`.

### 1. Instalar as dependências

```bash
npm install
```

### 2. Executar o projeto

```bash
npm run tauri dev
```

O banco de dados SQLite (`coopvale.db`) será **gerado automaticamente na raiz do projeto** na primeira execução.

---

## 🔌 Comandos IPC (APIs)

Os comandos IPC funcionam como a interface entre o frontend e o backend Rust.

Para utilizá-los no frontend, importe o `invoke` do Tauri:

```javascript
import { invoke } from "@tauri-apps/api/core";
```

---

## 🔐 Autenticação e Sessão

### Registrar usuário

Registra um novo usuário. A senha deve possuir **no mínimo 6 caracteres**.

```javascript
const userId = await invoke("register_user", {
  name: "Joao",
  email: "joao@email.com",
  password: "123456"
});
```

**Retorno:**

```text
userId
```

---

### Fazer login

Realiza a autenticação do usuário.

Após **5 tentativas de login inválidas**, o acesso é bloqueado por **5 minutos**.

```javascript
const session = await invoke("login", {
  email: "joao@email.com",
  password: "123456"
});
```

**Retorno:**

```json
{
  "user_id": 1,
  "name": "Joao",
  "email": "joao@email.com",
  "logged_in_at": "2026-..."
}
```

---

### Verificar autenticação

Verifica se existe um usuário autenticado na sessão atual.

```javascript
const isAuthenticated = await invoke("is_authenticated");
```

**Retorno:**

```text
true
```

ou

```text
false
```

---

### Obter sessão atual

Retorna os dados da sessão atualmente autenticada.

```javascript
const currentSession = await invoke("current_session");
```

**Retorno:**

```json
{
  "user_id": 1,
  "name": "Joao",
  "email": "joao@email.com",
  "logged_in_at": "2026-..."
}
```

Caso não exista uma sessão ativa:

```text
null
```

---

### Logout

Encerra a sessão atual do usuário.

```javascript
await invoke("logout");
```

---

## 👤 Gestão de Usuários

### Buscar usuário por ID

Busca um usuário utilizando seu ID.

A senha **não é incluída no retorno**.

```javascript
const user = await invoke("get_user", {
  id: 1
});
```

---

### Listar todos os usuários

Retorna todos os usuários cadastrados.

```javascript
const users = await invoke("list_users");
```

---

## 📌 Resumo dos comandos

| Comando            | Descrição                           |
| ------------------ | ----------------------------------- |
| `register_user`    | Registra um novo usuário            |
| `login`            | Autentica um usuário                |
| `is_authenticated` | Verifica se existe uma sessão ativa |
| `current_session`  | Retorna a sessão atual              |
| `logout`           | Encerra a sessão                    |
| `get_user`         | Busca um usuário por ID             |
| `list_users`       | Lista todos os usuários             |

## 🧱 Tecnologias

* **Tauri** — comunicação IPC e integração com o desktop
* **Rust** — backend
* **SQLite** — banco de dados local
* **React/Vue/etc.** — frontend
* **JavaScript/TypeScript** — comunicação com os comandos IPC
