# Módulo de Usuários e Tipagem Segura (TypeORM)

## 📌 Objetivo
Modelar o coração financeiro: A tabela `USERS`. Ela abrigará o limite global do cartão e o limite consumido, essenciais para as transações futuras.

---

## 💻 1. Criação da Entidade / Tabela `User`

A IA implementadora deverá criar a entidade TypeORM `User` no diretório: `src/users/entities/user.entity.ts`.

### Mapeamento Obrigatório:
* **id**: `uuid` (PrimaryGeneratedColumn('uuid'))
* **status**: `varchar` -> Deve possuir valor 'ACTIVE' ou 'BLOCKED'.
* **creditLimit**: `numeric` (precisão 10, escala 2) - Nome no DB: `credit_limit`
* **usedLimit**: `numeric` (precisão 10, escala 2) com default 0 - Nome no DB: `used_limit`
* **createdAt**: `timestamp` (CreateDateColumn)

**Código de Exemplo Esperado:**
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: string;

  @Column({ name: 'credit_limit', type: 'numeric', precision: 10, scale: 2 })
  creditLimit: number;

  @Column({ name: 'used_limit', type: 'numeric', precision: 10, scale: 2, default: 0 })
  usedLimit: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

---

## 🔒 2. Data Transfer Objects (DTO)
A IA deve construir a validação robusta para caso haja a necessidade de uma rota "Criar Usuário":
* `CreateUserDto` com validação estrita usando `@IsNumber()`, `@Min(0)` para `creditLimit` e validações nativas do `class-validator`.

---

## 🧠 3. Comportamento do Repository
Nenhum processamento de regra de negócio (atualização de saldo) deve ocorrer aqui nos métodos padrões. O service de usuário servirá exclusivamente para Consultar Perfil ou Consultar Saldo em tempo real (`GET /users/:id`). A lógica de deduzir saldo ficará centralizada na rota da transação.
