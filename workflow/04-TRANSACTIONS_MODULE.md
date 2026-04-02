# Módulo de Transações e Histórico (TypeORM)

## 📌 Objetivo
Estruturar o armazenamento das requisições de pagamento. Essas transações jamais podem ser deletadas e precisam rastrear de forma infalível a `idempotency_key` para não processarmos a mesma compra duas vezes no mundo síncrono.

---

## 💻 1. Criação da Entidade `Transaction`

A IA implementadora criará a entidade em `src/transactions/entities/transaction.entity.ts`.

### Mapeamento Obrigatório:
* **id**: `uuid` (PK)
* **userId**: Relacionamento `@ManyToOne(() => User)` referenciando `users.id`
* **amount**: `numeric` (10, 2) - Valor positivo da transação.
* **status**: `varchar` - ('APPROVED', 'REJECTED', 'FRAUD_DETECTED')
* **idempotencyKey**: `varchar` - **MUITO CRÍTICO**: Deve possuir restrição `@Column({ unique: true, name: 'idempotency_key' })`.
* **createdAt**: `timestamp`

---

## 🔒 2. DTO de Entrada
A rota `POST /transactions` deve interceptar os dados via `CreateTransactionDto`.

**Validação Obrigatória:**
* `userId`: `@IsUUID()` e `@IsNotEmpty()`
* `amount`: `@IsNumber()` e `@IsPositive()` (Não rodamos valores nulos nem negativos)
* Diferencial: O Header `Idempotency-Key` e os mecanismos de captura em `Headers()` no Controller da API.

---

## 🚨 3. Tratamento de Exceções de Idempotência do Banco
Como a tabela possui um `UNIQUE INDEX` em `idempotency_key`, se uma requisição de retry idêntica bater no gateway da AWS e chegar até o Container, o "Insert" quebrará via banco.

**O que a IA deve programar:**
* Um `ExceptionFilter` (filtro global ou do módulo) que captura a restrição unificada do postgres (Error Code: `23505`).
* Se código = `23505`, retornar ao cliente HTTP status `409 Conflict` ou `200 OK` silenciado, dizendo: `{ "status": "transaction already processed" }`. Isso quebra o retry-loop e é uma blindagem formidável em sistemas financeiros.
