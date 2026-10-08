# Guia de Testes Manuais - Backend CoopVale

Este documento contém o passo a passo para testar as regras de negócio e a API do backend da aplicação **CoopVale** diretamente pelo console do desenvolvedor no **Tauri**.

## 1. 🚀 Subindo o App e Preparando o Banco

Antes de começar, vamos garantir que o banco de dados esteja limpo e que o Tauri não fique reiniciando a cada alteração no banco.

Execute no seu terminal:

```bash
cd ~/IdeaProjects/CoopVale/ProjetoCoopVale/backend/CoopVale/src-tauri

echo "coopvale.db*" >> .taurignore  # Evita rebuild a cada escrita no banco

cargo check

cd ..

rm -f src-tauri/coopvale.db  # Começa do zero, ids a partir de 1

npm run tauri dev
```

> **Aviso:** Quando a janela do app abrir, aperte `F12` e vá na aba **Console**.
>
> Se o app reiniciar sozinho no meio do teste, suba a aplicação utilizando:
>
> ```bash
> npm run tauri dev -- --no-watch
> ```

## 2. ⚙️ Preparação do Console

No Console do F12, cole a função auxiliar abaixo para facilitar as chamadas aos comandos do Tauri:

```javascript
const invoke = window.__TAURI_INTERNALS__.invoke;

const t = async (cmd, args = {}) => {
  try {
    const r = await invoke(cmd, args);
    console.log("OK  ", cmd, r);
    return r;
  } catch (e) {
    console.error("ERRO", cmd, e);
  }
};
```

## 3. 👤 Usuário e Login

Vamos testar a criação de usuários, proteção de rotas e limites de login.

```javascript
await t("register_user", {
  name: "Admin",
  email: "admin@coopvale.com",
  password: "Senha@123"
});

await t("register_user", {
  name: "Admin",
  email: "admin@coopvale.com",
  password: "Senha@123"
}); // ERRO ESPERADO: e-mail duplicado

await t("list_users");
await t("get_user", { id: 1 });
await t("authenticate_user", {
  email: "admin@coopvale.com",
  password: "Senha@123"
});

// Bloqueio sem login
await t("list_products"); // ERRO ESPERADO: Acesso negado

// Login correto
await t("login", {
  email: "admin@coopvale.com",
  password: "Senha@123"
});

await t("is_authenticated"); // Esperado: true
await t("current_session");
```

### 🔐 Notas de Segurança

* O login tem limite de **5 tentativas falhas** e bloqueia por **5 minutos**. Se for testar senha errada, faça no máximo 2 ou 3 vezes:

```javascript
await t("login", {
  email: "admin@coopvale.com",
  password: "errada"
});
```

* Confira na saída do `list_users` se aparece o hash da senha. Se aparecer, é uma falha de segurança. Nesse caso, coloque `#[serde(skip_serializing)]` nesse campo da struct `User` no Rust.

## 4. 🏫 Instituição

Teste de CRUD básico para instituições. O ID deve ser `null` durante a criação.

```javascript
await t("create_institution", {
  institution: {
    id: null,
    name: "Escola Municipal",
    cnpj: "12345678000190",
    institution_type: "Publica",
    telephone: "88999990000",
    location: "Quixadá"
  }
});

await t("list_institutions");

await t("get_institution", {
  id: 1
});

await t("update_institution", {
  institution: {
    id: 1,
    name: "Escola Municipal Nova",
    cnpj: "12345678000190",
    institution_type: "Publica",
    telephone: null,
    location: "Quixadá"
  }
});
```

## 5. 📦 Produtos

Cadastro, edição, inativação e validações de produtos.

### Criação

```javascript
await t("create_product", {
  data: {
    name: "Leite",
    measurement_unit: "L",
    category: "Laticínios",
    reference_price_cents: 599
  }
});

await t("create_product", {
  data: {
    name: "Tomate",
    measurement_unit: "kg",
    category: "Hortifruti",
    reference_price_cents: 450
  }
});

await t("create_product", {
  data: {
    name: "Ovos",
    measurement_unit: "dúzia",
    category: "Granja",
    reference_price_cents: 1200
  }
});
```

### Consulta

```javascript
await t("list_products");
await t("get_product", { id: 1 });
```

### Atualização

O produto de ID `2` deve retornar atualizado para `"Tomate Italiano"` com preço de `520` centavos.

```javascript
await t("update_product", {
  id: 2,
  data: {
    name: "Tomate Italiano",
    measurement_unit: "kg",
    category: "Hortifruti",
    reference_price_cents: 520
  }
});
```

### Desativação

```javascript
await t("deactivate_product", { id: 3 });

await t("deactivate_product", { id: 3 });
// ERRO ESPERADO: já está desativado
```

### Validações

Os comandos abaixo devem retornar erros:

```javascript
await t("create_product", {
  data: {
    name: "  ",
    measurement_unit: "kg",
    category: "X",
    reference_price_cents: 100
  }
});
// ERRO: nome vazio/inválido

await t("create_product", {
  data: {
    name: "X",
    measurement_unit: "kg",
    category: "X",
    reference_price_cents: 0
  }
});
// ERRO: preço zerado
```

## 6. 📄 Contratos

```javascript
await t("create_contract", {
  data: {
    institution_id: 1,
    total_value_cents: 500000,
    start_date: "2026-10-01",
    end_date: "2026-12-31"
  }
});

await t("create_contract", {
  data: {
    institution_id: 1,
    total_value_cents: 200000,
    start_date: "2026-09-01",
    end_date: "2026-10-20"
  }
});

await t("list_contracts");

await t("get_contract", {
  id: 1
});

await t("get_contract", {
  id: 999
});
// Esperado: null

await t("list_contracts_by_institution", {
  institutionId: 1
});

await t("update_contract", {
  id: 1,
  data: {
    institution_id: 1,
    total_value_cents: 600000,
    start_date: "2026-10-01",
    end_date: "2026-12-31"
  }
});
```

## 7. 🛒 Itens de Contrato

Nesta etapa, os produtos são vinculados aos contratos criados.

```javascript
const leite = await t("get_product", { id: 1 });
const tomate = await t("get_product", { id: 2 });
const ovos = await t("get_product", { id: 3 }); // Produto desativado

await t("create_contract_item", {
  data: {
    contract_id: 1,
    product: leite,
    item_qtd: 100,
    delivered_qtd: 0,
    unit_price: 599
  }
});

await t("create_contract_item", {
  data: {
    contract_id: 1,
    product: tomate,
    item_qtd: 50,
    delivered_qtd: 0,
    unit_price: 520
  }
});

await t("list_contract_items");

await t("list_contract_items_by_contract", {
  contractId: 1
});

await t("get_contract_item", {
  id: 1
});

await t("update_contract_item", {
  id: 1,
  data: {
    contract_id: 1,
    product: leite,
    item_qtd: 120,
    delivered_qtd: 0,
    unit_price: 599
  }
});
```

### Validações

Os comandos abaixo devem retornar erros:

```javascript
await t("create_contract_item", {
  data: {
    contract_id: 1,
    product: leite,
    item_qtd: 10,
    delivered_qtd: 5,
    unit_price: 599
  }
});
// ERRO: registre as entregas depois

await t("create_contract_item", {
  data: {
    contract_id: 1,
    product: ovos,
    item_qtd: 10,
    delivered_qtd: 0,
    unit_price: 1200
  }
});
// ERRO: produto desativado

await t("create_contract_item", {
  data: {
    contract_id: 1,
    product: leite,
    item_qtd: 0,
    delivered_qtd: 0,
    unit_price: 599
  }
});
// ERRO: qtd deve ser > 0

await t("create_contract_item", {
  data: {
    contract_id: 999,
    product: leite,
    item_qtd: 10,
    delivered_qtd: 0,
    unit_price: 599
  }
});
// ERRO: contrato não encontrado

await t("update_contract_item", {
  id: 1,
  data: {
    contract_id: 1,
    product: leite,
    item_qtd: 120,
    delivered_qtd: 10,
    unit_price: 599
  }
});
// ERRO: quantidade entregue só muda por entrega
```

## 8. 🚚 Entregas

Os comentários indicam o valor esperado de `delivered_qtd` do item após cada passo.

### Criação

```javascript
await t("create_delivery", {
  data: {
    contract_item_id: 1,
    solicited_quantity: 40,
    delivered_qtd: 40,
    delivery_date: "2026-10-08",
    note: "Primeira"
  }
});

await t("get_contract_item", { id: 1 });
// Esperado: 40

await t("create_delivery", {
  data: {
    contract_item_id: 1,
    solicited_quantity: 30,
    delivered_qtd: 30,
    delivery_date: "2026-10-09",
    note: "Segunda"
  }
});

await t("get_contract_item", { id: 1 });
// Esperado: 70
```

### Consulta

```javascript
await t("list_deliveries");

await t("list_deliveries_by_contract", {
  contractId: 1
});

await t("get_delivery", {
  id: 1
});
```

### Atualização

Editar a primeira entrega de `40` para `35`.

```javascript
await t("update_delivery", {
  id: 1,
  data: {
    contract_item_id: 1,
    solicited_quantity: 40,
    delivered_qtd: 35,
    delivery_date: "2026-10-08",
    note: "Ajustada"
  }
});

await t("get_contract_item", { id: 1 });
// Esperado: 65
```

### Movimentação

Mover a entrega 2 para o item 2.

```javascript
await t("update_delivery", {
  id: 2,
  data: {
    contract_item_id: 2,
    solicited_quantity: 30,
    delivered_qtd: 30,
    delivery_date: "2026-10-09",
    note: "Movida"
  }
});

await t("list_contract_items_by_contract", {
  contractId: 1
});
// Esperado: item 1 = 35, item 2 = 30
```

### Exclusão

```javascript
await t("delete_delivery", {
  id: 2
});

await t("get_contract_item", {
  id: 2
});
// Esperado: 0
```

### Validações

Os comandos abaixo devem retornar erros:

```javascript
await t("create_delivery", {
  data: {
    contract_item_id: 1,
    solicited_quantity: 10,
    delivered_qtd: 20,
    delivery_date: "2026-10-10",
    note: ""
  }
});
// ERRO: entregue excede a solicitada

await t("create_delivery", {
  data: {
    contract_item_id: 1,
    solicited_quantity: 500,
    delivered_qtd: 500,
    delivery_date: "2026-10-10",
    note: ""
  }
});
// ERRO: excede o saldo do contrato

await t("create_delivery", {
  data: {
    contract_item_id: 1,
    solicited_quantity: 10,
    delivered_qtd: 0,
    delivery_date: "2026-10-10",
    note: ""
  }
});
// ERRO: entregue deve ser > 0

await t("create_delivery", {
  data: {
    contract_item_id: 999,
    solicited_quantity: 10,
    delivered_qtd: 10,
    delivery_date: "2026-10-10",
    note: ""
  }
});
// ERRO: item não encontrado

await t("delete_delivery", {
  id: 999
});
```

## 9. ✅ Contrato Concluído

Vamos simular a conclusão do contrato diretamente no banco de dados para testar os bloqueios da API.

Deixe o app rodando e abra outro terminal:

```bash
cd ~/IdeaProjects/CoopVale/ProjetoCoopVale/backend/CoopVale/src-tauri

sqlite3 coopvale.db "UPDATE contrato SET status = 'Concluido' WHERE id = 1;"
```

> Se o comando `sqlite3` não estiver instalado:
>
> ```bash
> sudo apt install sqlite3
> ```

Após a atualização no banco, volte ao Console do navegador.

**Todos os comandos abaixo devem retornar erro:**

```javascript
await t("create_contract_item", {
  data: {
    contract_id: 1,
    product: leite,
    item_qtd: 10,
    delivered_qtd: 0,
    unit_price: 599
  }
});

await t("update_contract_item", {
  id: 1,
  data: {
    contract_id: 1,
    product: leite,
    item_qtd: 130,
    delivered_qtd: 35,
    unit_price: 599
  }
});

await t("delete_contract_item", {
  id: 1
});

await t("create_delivery", {
  data: {
    contract_item_id: 1,
    solicited_quantity: 5,
    delivered_qtd: 5,
    delivery_date: "2026-10-11",
    note: ""
  }
});

await t("update_delivery", {
  id: 1,
  data: {
    contract_item_id: 1,
    solicited_quantity: 40,
    delivered_qtd: 30,
    delivery_date: "2026-10-08",
    note: ""
  }
});

await t("delete_delivery", {
  id: 1
});
```

## 10. 🧹 Limpeza e Validação de Chaves Estrangeiras (FKs)

Reabra o contrato alterando o status no banco, caso contrário os deletes continuarão bloqueados:

```bash
sqlite3 coopvale.db "UPDATE contrato SET status = 'EmAndamento' WHERE id = 1;"
```

Agora teste a limpeza dos dados no Console:

```javascript
await t("delete_delivery", { id: 1 });

await t("delete_contract_item", { id: 1 });
await t("delete_contract_item", { id: 2 });

await t("delete_contract", { id: 1 });
await t("delete_contract", { id: 2 });

await t("delete_institution", { id: 1 });

await t("logout");

await t("list_products");
// ERRO ESPERADO: Acesso negado
```

## 🔍 Dicas Finais de Validação

### 1. ON DELETE CASCADE

Antes de apagar tudo, tente executar um `delete_contract_item` do item `1` enquanto a entrega `1` ainda existir, e um `delete_contract` enquanto houver itens vinculados.

Isso permitirá verificar o comportamento do banco.

Caso os registros sejam apagados em cascata sem nenhuma validação ou aviso, é recomendado tratar esse comportamento no *service*.

### 2. Foreign Keys Ativas

Para confirmar se as chaves estrangeiras estão sendo validadas pelo SQLite, execute:

```bash
grep -n "foreign_keys" src-tauri/src/db.rs
```

Se não aparecer:

```sql
PRAGMA foreign_keys = ON
```

o SQLite poderá aceitar cadastros com referências inexistentes, como:

```javascript
institution_id: 999
```

Para validar, tente executar:

```javascript
await t("create_contract", {
  data: {
    institution_id: 999,
    total_value_cents: 500000,
    start_date: "2026-10-01",
    end_date: "2026-12-31"
  }
});
```

O comando deve obrigatoriamente falhar caso a validação das FKs esteja funcionando corretamente.

---

> 💡 **Suporte:** Se algum passo retornar um erro diferente do esperado, copie a saída completa do Console (objeto do erro) e revise a lógica do *service* no Rust.
