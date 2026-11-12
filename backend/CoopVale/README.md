# Guia de Testes Manuais — Backend CoopVale

Este documento apresenta o passo a passo para testar as regras de negócio e os comandos do backend da aplicação **CoopVale**, diretamente pelo console do desenvolvedor do Tauri.

## 1. 🚀 Subindo o App e Preparando o Banco

Antes de começar, vamos garantir que o banco de dados esteja limpo e que o Tauri não fique reiniciando a cada alteração no banco.

Execute no terminal:

```bash
cd ~/IdeaProjects/CoopVale/ProjetoCoopVale/backend/CoopVale/src-tauri

echo "coopvale.db*" >> .taurignore

cargo check

cd ..

rm -f src-tauri/coopvale.db

npm run tauri dev
```

> **Aviso:** Quando a janela do aplicativo abrir, pressione `F12` e acesse a aba **Console**.
>
> Se o aplicativo reiniciar sozinho durante os testes, execute:
>
> ```bash
> npm run tauri dev -- --no-watch
> ```

## 2. ⚙️ Preparação do Console

No console aberto com `F12`, cole a função auxiliar abaixo para facilitar as chamadas aos comandos do Tauri:

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

Vamos testar a criação de usuários, a proteção dos comandos e os limites de tentativas de login.

### Cadastro e autenticação

```javascript
await t("register_user", {
  name: "Admin",
  email: "admin@coopvale.com",
  password: "Senha@123"
});
```

Teste o cadastro duplicado. O comando deve retornar um erro:

```javascript
await t("register_user", {
  name: "Admin",
  email: "admin@coopvale.com",
  password: "Senha@123"
});
```

Consulte os usuários e teste a autenticação:

```javascript
await t("list_users");

await t("get_user", {
  id: 1
});

await t("authenticate_user", {
  email: "admin@coopvale.com",
  password: "Senha@123"
});
```

### Proteção dos comandos

Sem fazer login, tente acessar os produtos:

```javascript
await t("list_products");
```

**Resultado esperado:** erro de acesso negado.

Faça login:

```javascript
await t("login", {
  email: "admin@coopvale.com",
  password: "Senha@123"
});
```

Verifique a autenticação e a sessão:

```javascript
await t("is_authenticated");

await t("current_session");
```

O resultado de `is_authenticated` deve ser `true`.

### 🔐 Notas de Segurança

O login possui limite de **5 tentativas falhas**, com bloqueio de **5 minutos**. Para testar uma senha incorreta, faça poucas tentativas:

```javascript
await t("login", {
  email: "admin@coopvale.com",
  password: "errada"
});
```

Confira também se a saída de `list_users` expõe o hash da senha. Caso isso aconteça, verifique a serialização do modelo `User` no Rust e considere utilizar `#[serde(skip_serializing)]` no campo da senha.

## 4. 🏫 Instituições

Teste as operações de cadastro, consulta e atualização de instituições.

### Cadastro

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
```

### Consulta

```javascript
await t("list_institutions");

await t("get_institution", {
  id: 1
});
```

### Atualização

```javascript
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

Esta seção contempla o cadastro, a consulta, a atualização, a desativação e as validações dos produtos.

### Cadastro

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

await t("get_product", {
  id: 1
});
```

### Atualização

Atualize o produto de ID `2` para `"Tomate Italiano"`, com preço de referência de 520 centavos:

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
await t("deactivate_product", {
  id: 3
});
```

Tente desativar o mesmo produto novamente:

```javascript
await t("deactivate_product", {
  id: 3
});
```

**Resultado esperado:** erro indicando que o produto já está desativado.

### Validações

Os exemplos abaixo devem retornar erros.

**Nome vazio ou inválido:**

```javascript
await t("create_product", {
  data: {
    name: "  ",
    measurement_unit: "kg",
    category: "X",
    reference_price_cents: 100
  }
});
```

**Preço zerado:**

```javascript
await t("create_product", {
  data: {
    name: "X",
    measurement_unit: "kg",
    category: "X",
    reference_price_cents: 0
  }
});
```

## 6. 📄 Contratos

Nesta etapa, vamos testar o cadastro, a consulta e a atualização dos contratos.

### Cadastro

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
```

### Consulta

```javascript
await t("list_contracts");

await t("get_contract", {
  id: 1
});
```

Teste um contrato inexistente:

```javascript
await t("get_contract", {
  id: 999
});
```

**Resultado esperado:** `null`, conforme o comportamento descrito no guia.

Consulte os contratos de uma instituição:

```javascript
await t("list_contracts_by_institution", {
  institutionId: 1
});
```

### Atualização

```javascript
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

## 7. 💰 Pagamentos

Esta seção permite testar o cadastro e o gerenciamento de pagamentos vinculados a contratos.

**Pré-requisitos:**
- O usuário deve estar autenticado.
- Deve existir um contrato cadastrado.
- O contrato deve possuir saldo disponível para o pagamento.

### 7.1. Consultar contratos existentes

Antes de cadastrar um pagamento, consulte os contratos disponíveis:

```javascript
await t("list_contracts");
```

Utilize o `id` de um contrato retornado. Nos exemplos abaixo, será utilizado o ID `1`. Substitua-o pelo identificador correto caso seja diferente.

Se não houver contrato, cadastre uma instituição e um contrato utilizando os exemplos da seção anterior.

### 7.2. Cadastrar um pagamento

O valor deve ser informado em centavos. Por exemplo, `30000` corresponde a **R$ 300,00**.

```javascript
await t("create_payment", {
  data: {
    contract_id: 1,
    amount_cents: 30000,
    payment_date: "2026-10-29",
    note: "Pagamento de teste"
  }
});
```

Guarde o `id` retornado pelo cadastro, pois ele será utilizado nas consultas, na atualização e na exclusão.

### 7.3. Consultar pagamentos

**Listar todos os pagamentos:**

```javascript
await t("list_payments");
```

**Listar os pagamentos de um contrato específico:**

```javascript
await t("list_payments_by_contract", {
  contractId: 1
});
```

**Consultar um pagamento pelo ID:**

```javascript
await t("get_payment", {
  id: 1
});
```

Substitua o ID `1` pelo identificador do pagamento que deseja consultar.

### 7.4. Consultar o saldo do contrato

```javascript
await t("get_contract_balance", {
  contractId: 1
});
```

A resposta deve incluir:

- Valor total do contrato.
- Valor total pago.
- Saldo restante.

Os valores monetários são representados em centavos.

### 7.5. Atualizar um pagamento

O exemplo abaixo altera o valor do pagamento para **R$ 350,00**:

```javascript
await t("update_payment", {
  id: 1,
  data: {
    contract_id: 1,
    amount_cents: 35000,
    payment_date: "2026-10-29",
    note: "Pagamento atualizado"
  }
});
```

Utilize o ID do pagamento que deseja atualizar.

### 7.6. Excluir um pagamento

```javascript
await t("delete_payment", {
  id: 1
});
```

Utilize o ID do pagamento que deseja excluir.

### 7.7. Testar validações

Os exemplos abaixo devem retornar erros caso as regras de validação estejam funcionando corretamente.

**Pagamento com valor zero:**

```javascript
await t("create_payment", {
  data: {
    contract_id: 1,
    amount_cents: 0,
    payment_date: "2026-10-29",
    note: "Teste de valor zero"
  }
});
```

**Pagamento superior ao saldo restante do contrato:**

```javascript
await t("create_payment", {
  data: {
    contract_id: 1,
    amount_cents: 999999999,
    payment_date: "2026-10-29",
    note: "Teste acima do saldo"
  }
});
```

### 7.8. Observações sobre os argumentos

- Argumentos simples, como `contractId`, devem utilizar o nome esperado pelo comando JavaScript.
- Os campos dentro do objeto `data` utilizam nomes como `contract_id`, `amount_cents` e `payment_date`.
- As regras de negócio e validação dos pagamentos estão em `src-tauri/src/payment/service.rs`.
- Os comandos disponíveis estão em `src-tauri/src/payment/commands.rs`.

## 8. 🛒 Itens de Contrato

Nesta etapa, os produtos são vinculados aos contratos criados.

### Cadastro

Recupere os produtos que serão utilizados nos testes:

```javascript
const leite = await t("get_product", {
  id: 1
});

const tomate = await t("get_product", {
  id: 2
});

const ovos = await t("get_product", {
  id: 3
}); // Produto desativado
```

Cadastre o leite no contrato:

```javascript
await t("create_contract_item", {
  data: {
    contract_id: 1,
    product: leite,
    item_qtd: 100,
    delivered_qtd: 0,
    unit_price: 599
  }
});
```

Cadastre o tomate:

```javascript
await t("create_contract_item", {
  data: {
    contract_id: 1,
    product: tomate,
    item_qtd: 50,
    delivered_qtd: 0,
    unit_price: 520
  }
});
```

### Consulta

```javascript
await t("list_contract_items");

await t("list_contract_items_by_contract", {
  contractId: 1
});

await t("get_contract_item", {
  id: 1
});
```

### Atualização

```javascript
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

Os exemplos abaixo devem retornar erros.

**Quantidade entregue informada diretamente no cadastro:**

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
```

**Resultado esperado:** a quantidade entregue deve ser registrada por meio de uma entrega.

**Cadastro de produto desativado:**

```javascript
await t("create_contract_item", {
  data: {
    contract_id: 1,
    product: ovos,
    item_qtd: 10,
    delivered_qtd: 0,
    unit_price: 1200
  }
});
```

**Quantidade igual a zero:**

```javascript
await t("create_contract_item", {
  data: {
    contract_id: 1,
    product: leite,
    item_qtd: 0,
    delivered_qtd: 0,
    unit_price: 599
  }
});
```

**Contrato inexistente:**

```javascript
await t("create_contract_item", {
  data: {
    contract_id: 999,
    product: leite,
    item_qtd: 10,
    delivered_qtd: 0,
    unit_price: 599
  }
});
```

**Alteração direta da quantidade entregue:**

```javascript
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
```

**Resultado esperado:** a quantidade entregue só pode ser alterada por meio do fluxo de entregas.

## 9. 🚚 Entregas

Os exemplos a seguir demonstram como cadastrar, consultar, atualizar e excluir entregas.

Os comentários indicam a quantidade esperada após cada operação.

### 9.1. Cadastro

Registre a primeira entrega:

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

await t("get_contract_item", {
  id: 1
});
// Esperado: delivered_qtd = 40
```

Registre a segunda entrega:

```javascript
await t("create_delivery", {
  data: {
    contract_item_id: 1,
    solicited_quantity: 30,
    delivered_qtd: 30,
    delivery_date: "2026-10-09",
    note: "Segunda"
  }
});

await t("get_contract_item", {
  id: 1
});
// Esperado: delivered_qtd = 70
```

### 9.2. Consulta

```javascript
await t("list_deliveries");

await t("list_deliveries_by_contract", {
  contractId: 1
});

await t("get_delivery", {
  id: 1
});
```

### 9.3. Atualização

Edite a primeira entrega, alterando a quantidade entregue de `40` para `35`:

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

await t("get_contract_item", {
  id: 1
});
// Esperado: delivered_qtd = 65
```

### 9.4. Movimentação

Mova a segunda entrega para o item de contrato de ID `2`:

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
```

**Resultado esperado:**
- Item `1`: quantidade entregue igual a `35`.
- Item `2`: quantidade entregue igual a `30`.

### 9.5. Exclusão

```javascript
await t("delete_delivery", {
  id: 2
});

await t("get_contract_item", {
  id: 2
});
// Esperado: delivered_qtd = 0
```

### 9.6. Validações

Os exemplos abaixo devem retornar erros.

**Quantidade entregue superior à solicitada:**

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
```

**Quantidade superior ao saldo do contrato:**

```javascript
await t("create_delivery", {
  data: {
    contract_item_id: 1,
    solicited_quantity: 500,
    delivered_qtd: 500,
    delivery_date: "2026-10-10",
    note: ""
  }
});
```

**Quantidade entregue igual a zero:**

```javascript
await t("create_delivery", {
  data: {
    contract_item_id: 1,
    solicited_quantity: 10,
    delivered_qtd: 0,
    delivery_date: "2026-10-10",
    note: ""
  }
});
```

**Item de contrato inexistente:**

```javascript
await t("create_delivery", {
  data: {
    contract_item_id: 999,
    solicited_quantity: 10,
    delivered_qtd: 10,
    delivery_date: "2026-10-10",
    note: ""
  }
});
```

**Exclusão de entrega inexistente:**

```javascript
await t("delete_delivery", {
  id: 999
});
```

## 10. ✅ Contrato Concluído

Vamos simular a conclusão de um contrato diretamente no banco de dados para testar os bloqueios da aplicação.

Mantenha o aplicativo em execução e abra outro terminal:

```bash
cd ~/IdeaProjects/CoopVale/ProjetoCoopVale/backend/CoopVale/src-tauri

sqlite3 coopvale.db "UPDATE contrato SET status = 'Concluido' WHERE id = 1;"
```

Se o comando `sqlite3` não estiver instalado, execute:

```bash
sudo apt install sqlite3
```

Após atualizar o banco, volte ao console do desenvolvedor.

Os comandos abaixo devem retornar erros, pois o contrato está concluído.

### Cadastro de item

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
```

### Atualização de item

```javascript
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
```

### Exclusão de item

```javascript
await t("delete_contract_item", {
  id: 1
});
```

### Cadastro de entrega

```javascript
await t("create_delivery", {
  data: {
    contract_item_id: 1,
    solicited_quantity: 5,
    delivered_qtd: 5,
    delivery_date: "2026-10-11",
    note: ""
  }
});
```

### Atualização de entrega

```javascript
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
```

### Exclusão de entrega

```javascript
await t("delete_delivery", {
  id: 1
});
```

## 11. 🧹 Limpeza e Validação de Chaves Estrangeiras (FKs)

Antes de realizar a limpeza, reabra o contrato alterando seu status no banco:

```bash
sqlite3 coopvale.db "UPDATE contrato SET status = 'EmAndamento' WHERE id = 1;"
```

Agora, no console do desenvolvedor, execute:

```javascript
await t("delete_delivery", {
  id: 1
});

await t("delete_contract_item", {
  id: 1
});

await t("delete_contract_item", {
  id: 2
});

await t("delete_contract", {
  id: 1
});

await t("delete_contract", {
  id: 2
});

await t("delete_institution", {
  id: 1
});

await t("logout");

await t("list_products");
```

**Resultado esperado:** após o logout, o acesso aos comandos protegidos deve ser negado.

### 11.1. ON DELETE CASCADE

Antes de apagar todos os dados, teste a exclusão de um item de contrato enquanto ainda houver uma entrega vinculada a ele.

Faça o mesmo com um contrato que ainda possua itens vinculados.

Esses testes permitem verificar o comportamento das chaves estrangeiras e das regras de exclusão do banco de dados.

Caso os registros sejam excluídos em cascata sem validação ou aviso, avalie se esse comportamento deve ser tratado na camada de serviço (*service*).

### 11.2. Foreign Keys Ativas

Para verificar se as chaves estrangeiras estão sendo habilitadas no SQLite, execute:

```bash
grep -n "foreign_keys" src-tauri/src/db.rs
```

Verifique a presença de uma instrução equivalente a:

```sql
PRAGMA foreign_keys = ON;
```

Sem essa configuração, o SQLite poderá aceitar referências inválidas, dependendo da configuração da conexão.

Por exemplo, tente cadastrar um contrato associado a uma instituição inexistente:

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

**Resultado esperado:** o cadastro deve falhar se a validação da chave estrangeira estiver ativa e a instituição não existir.

---

## 🔍 Dicas Finais de Validação

- Confirme se os comandos retornam os resultados esperados.
- Verifique se os erros de validação são apresentados corretamente.
- Confira se os pagamentos respeitam o saldo disponível do contrato.
- Verifique se as quantidades entregues são atualizadas após criar, editar ou excluir entregas.
- Confirme se os comandos protegidos exigem autenticação.
- Revise a lógica das camadas `service`, `repository` e `commands` quando algum resultado for diferente do esperado.

> 💡 **Suporte:** Se algum passo retornar um erro inesperado, copie a saída completa do console, incluindo o objeto do erro, e revise a implementação correspondente no Rust.
