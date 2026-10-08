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

## 🔌 Comandos IPC

Os comandos IPC funcionam como a interface entre o frontend e o backend Rust.

Para utilizá-los no frontend, importe o `invoke` do Tauri:

```javascript
import { invoke } from "@tauri-apps/api/core";
```

---

# 🔐 Autenticação e Sessão

## Registrar usuário

Registra um novo usuário. A senha deve possuir **no mínimo 6 caracteres**.

```javascript
const userId = await invoke("register_user", {
  name: "Joao",
  email: "joao@email.com",
  password: "123456"
});
```

### Retorno

```text
userId
```

## Fazer login

Realiza a autenticação do usuário.

Após **5 tentativas de login inválidas**, o acesso é bloqueado por **5 minutos**.

```javascript
const session = await invoke("login", {
  email: "joao@email.com",
  password: "123456"
});
```

### Retorno

```json
{
  "user_id": 1,
  "name": "Joao",
  "email": "joao@email.com",
  "logged_in_at": "2026-..."
}
```

## Verificar autenticação

Verifica se existe um usuário autenticado na sessão atual.

```javascript
const isAuthenticated = await invoke("is_authenticated");
```

### Retorno

```text
true
```

ou

```text
false
```

## Obter sessão atual

Retorna os dados da sessão atualmente autenticada.

```javascript
const currentSession = await invoke("current_session");
```

### Retorno

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

## Logout

Encerra a sessão atual do usuário.

```javascript
await invoke("logout");
```

---

# 👤 Gestão de Usuários

## Buscar usuário por ID

Busca um usuário utilizando seu ID.

A senha **não é incluída no retorno**.

```javascript
const user = await invoke("get_user", {
  id: 1
});
```

## Listar todos os usuários

Retorna todos os usuários cadastrados.

```javascript
const users = await invoke("list_users");
```

---

# 🏢 Gestão de Instituições

> **⚠️ Atenção:** Os comandos desta seção requerem que o usuário esteja autenticado.

## Criar instituição

O `cnpj` é validado e formatado automaticamente pelo backend.

Tipos aceitos:

* `Publica`
* `Privada`

```javascript
const institution = await invoke("create_institution", {
  institution: {
    id: null,
    name: "Prefeitura de Quixada",
    cnpj: "11.222.333/0001-81",
    institution_type: "Publica",
    telephone: "(88) 99999-9999",
    location: "Quixada - CE"
  }
});
```

## Atualizar instituição

```javascript
const updated = await invoke("update_institution", {
  institution: {
    id: 1,
    name: "Prefeitura Municipal de Quixada",
    cnpj: "11222333000181",
    institution_type: "Publica",
    telephone: "(88) 98888-8888",
    location: "Centro - Quixada - CE"
  }
});
```

## Listar instituições

Retorna todas as instituições cadastradas.

```javascript
const institutions = await invoke("list_institutions");
```

## Buscar instituição por ID

```javascript
const institution = await invoke("get_institution", {
  id: 1
});
```

## Excluir instituição

Não é possível excluir uma instituição que possua contratos vinculados.

```javascript
await invoke("delete_institution", {
  id: 1
});
```

---

# 📄 Gestão de Contratos

> **⚠️ Atenção:** Os comandos desta seção requerem que o usuário esteja autenticado.

Os valores financeiros devem ser enviados em **centavos**.

Por exemplo:

```text
15000000 = R$ 150.000,00
```

As datas devem seguir o padrão ISO:

```text
YYYY-MM-DD
```

## Criar contrato

```javascript
const contract = await invoke("create_contract", {
  data: {
    institution_id: 1,
    total_value_cents: 15000000,
    start_date: "2026-01-01",
    end_date: "2026-12-31"
  }
});
```

## Atualizar contrato

Contratos com status `Concluido` **não podem ser editados**.

```javascript
const updatedContract = await invoke("update_contract", {
  id: 1,
  data: {
    institution_id: 1,
    total_value_cents: 20000000,
    start_date: "2026-01-01",
    end_date: "2027-01-31"
  }
});
```

## Listar contratos

Retorna todos os contratos cadastrados.

```javascript
const contracts = await invoke("list_contracts");
```

## Listar contratos por instituição

Retorna todos os contratos vinculados a uma instituição específica.

```javascript
const contracts = await invoke(
  "list_contracts_by_institution",
  {
    institution_id: 1
  }
);
```

## Buscar contrato por ID

```javascript
const contract = await invoke("get_contract", {
  id: 1
});
```

## Excluir contrato

```javascript
await invoke("delete_contract", {
  id: 1
});
```

---

# 🧪 Fluxo recomendado para testes

Como instituições e contratos exigem autenticação, recomenda-se executar os testes nesta ordem.

### 1. Criar usuário

```javascript
await invoke("register_user", {
  name: "Joao",
  email: "joao@email.com",
  password: "123456"
});
```

### 2. Fazer login

```javascript
await invoke("login", {
  email: "joao@email.com",
  password: "123456"
});
```

### 3. Criar instituição

```javascript
await invoke("create_institution", {
  institution: {
    id: null,
    name: "Prefeitura de Quixada",
    cnpj: "11.222.333/0001-81",
    institution_type: "Publica",
    telephone: "(88) 99999-9999",
    location: "Quixada - CE"
  }
});
```

### 4. Listar instituições

```javascript
await invoke("list_institutions");
```

### 5. Criar contrato

Utilize o `id` da instituição criada anteriormente.

```javascript
await invoke("create_contract", {
  data: {
    institution_id: 1,
    total_value_cents: 15000000,
    start_date: "2026-01-01",
    end_date: "2026-12-31"
  }
});
```

### 6. Listar contratos

```javascript
await invoke("list_contracts");
```

### 7. Buscar contratos da instituição

```javascript
await invoke("list_contracts_by_institution", {
  institution_id: 1
});
```

### 8. Buscar contrato específico

```javascript
await invoke("get_contract", {
  id: 1
});
```

### 9. Atualizar contrato

```javascript
await invoke("update_contract", {
  id: 1,
  data: {
    institution_id: 1,
    total_value_cents: 20000000,
    start_date: "2026-01-01",
    end_date: "2027-01-31"
  }
});
```

### 10. Atualizar instituição

```javascript
await invoke("update_institution", {
  institution: {
    id: 1,
    name: "Prefeitura Municipal de Quixada",
    cnpj: "11222333000181",
    institution_type: "Publica",
    telephone: "(88) 98888-8888",
    location: "Centro - Quixada - CE"
  }
});
```

### 11. Excluir contrato

```javascript
await invoke("delete_contract", {
  id: 1
});
```

### 12. Excluir instituição

Depois de excluir os contratos vinculados:

```javascript
await invoke("delete_institution", {
  id: 1
});
```

### 13. Fazer logout

```javascript
await invoke("logout");
```

---


---

# 🧱 Tecnologias

* **Tauri** — comunicação IPC e integração com o desktop
* **Rust** — backend
* **SQLite** — banco de dados local
* **React/Vue/etc.** — frontend
* **JavaScript/TypeScript** — comunicação com os comandos IPC
