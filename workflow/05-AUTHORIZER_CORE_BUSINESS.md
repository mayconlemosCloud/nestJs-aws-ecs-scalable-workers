# O Core Business (Regras Síncronas do Authorizer)

## 📌 Objetivo
Esta é a camada mais valiosa e arriscada. O foco aqui é implementar a regra de Autorização ("Aprova ou Negar transação") garantindo 0% de Race Conditions caso milhares de instâncias chamem o mesmo `userId` no mesmo microssegundo.

---

## 🛑 O Problema das Race Conditions Convencionais
Se a IA implementadora gerar um código assim, a API estará morta e vulnerável a fraude de limites (Não faça isso):
```typescript
// NUNCA FAÇA ASSIM (EXEMPLO DO QUE EVITAR):
const user = await userRepository.findOne({ id });
if (user.creditLimit - user.usedLimit >= amount) {
  user.usedLimit += amount; // <-- OUTRA TAREFA AWS PODE TER ESCRITO AQUI NESSE MEIO TEMPO!
  await userRepository.save(user); // SOBSCREVE O SALDO ESTOURANDO O GASTO.
}
```

---

## 🛠️ A Solução OBRIGATÓRIA: Atualização Atômica Otimista

A IA deverá instanciar em `TransactionsService` a lógica transacional com **Update Condicionado** diretamente via queries TypeORM, deixando o banco de dados enfileirar os pacotes em C sem *locking* de leitura extenso.

**Código Guia de Implementação (`TransactionsService.authorize(...)`):**

```typescript
// 1. O Payload chegou e passou pelos testes do Redis (Antifraude).

// 2. Executamos o UPDATE CONDICIONAL ATÔMICO
const updateQuery = `
  UPDATE users 
  SET used_limit = used_limit + $1 
  WHERE id = $2 
    AND status = 'ACTIVE' 
    AND (credit_limit - used_limit) >= $1 
  RETURNING id, used_limit;
`;

const result = await entityManager.query(updateQuery, [amount, userId]);

let transactionStatus = 'REJECTED';

// 3. Checamos se a operação alterou alguma linha!
if (result && result.length > 0) {
  // APROVADO! O banco confirmou e já removeu o saldo na mesma transação atômica.
  transactionStatus = 'APPROVED';
} else {
  // RECUSADO! Razões múltiplas garantidas pela arquitetura (sem saldo, inativo, id inválido).
  transactionStatus = 'REJECTED';
}

// 4. Inserimos o extrato na tabela transactions.
await entityManager.query(
  `INSERT INTO transactions (id, user_id, amount, status, idempotency_key) VALUES (uuid_generate_v4(), $1, $2, $3, $4)`,
  [userId, amount, transactionStatus, idempotencyKey]
);

return { status: transactionStatus };
```

## 📜 Resumo das Regras Implementadas
- [x] Regra 1: Rejeitar se usuário não existir (Query retorna nulo).
- [x] Regra 2: Rejeitar se valor exceder a diferença (Evidenciado na linha `credit_limit - used_limit >= amount`).
- [x] Regra 4: Rejeitar se usuário bloqueado (Evidenciado por `status = ACTIVE`).
- [x] Regra 5: Aprovar caso contrário.

**Nota para a IA**: Toda operação deve ser encapsulada em transações manuais via DataSource/EntityManager para que um erro na etapa de inserir o recibo possibilite o Rollback no saldo caso ocorra queda da instância ECS.
