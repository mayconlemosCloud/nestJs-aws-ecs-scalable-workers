# Instruções de Implementação e Arquitetura: Authorizer API (NestJS + AWS ECS)

Este documento foi desenhado para servir como **Guia Diretor para Agentes Ia / Desenvolvedores**. Ele contém todos os requisitos, escolhas arquiteturais detalhadas, regras de negócio em código e quais bibliotecas usar para a construção de um autorizador de transações bancárias síncrono de alta escala.

O workflow agrupa o ambiente de *Desenvolvimento e Containerização em uma única fase*, focando na agilidade e testabilidade.

---

## 🚀 Fase 1: Fundação do Sistema em Container (NestJS + Postgres + Redis)

Nesta etapa o foco é construir o serviço rodando 100% via Docker de forma local, simulando os componentes que existirão de forma gerenciada na nuvem. Nenhuma camada de código da aplicação deve depender de arquivos locais, e não teremos nenhum processamento assíncrono (sem kafka, rabbitmq, etc).

### 1️⃣ Infraestrutura Base (Docker)
**O que fazer:** Criar o arquivo `docker-compose.yml` que contenha:
1. `postgres:15-alpine`: Banco de dados principal.
2. `redis:7-alpine`: Cache ultrarrápido para controle de rate limit e prevenção de fraudes.
3. `api`: Containerizando a nossa própria aplicação em desenvolvimento.
* **Por quê:** Usar Docker desde o dia zero para o banco e para a aplicação garante que não teremos dependências de SO e resolve problemas clássicos de "na minha máquina funciona". 

### 2️⃣ Estrutura de Bibliotecas e Setup do NestJS
**O que fazer:** Iniciar a API (`nest new api`) configurando *strict typescript*.
* **Bibliotecas a instalar/usar:**
  * **Banco (ORM):** `@nestjs/typeorm typeorm pg`. *Por que:* O TypeORM permite mesclar facilidade de models (para inserts comuns) e Queries Nativas (que usaremos para os *updates atômicos* essenciais de performance).
  * **Rate Limiting:** `@nestjs/throttler` (configurado com driver redis).
  * **Cache rápido:** `ioredis` (Não usar cache-manager genérico, usar `ioredis` puro para comandos como `SETNX`).
  * **Observabilidade:** `nestjs-pino` e `pino-http`. *Por que:* Aplicações de alta escala vão colapsar o terminal/CloudWatch se os logs não forem formato JSON. Com ele, o log ganha campos precisos (`{"level": 30, "msg": "approved", "correlationId": "xyz"}`).

### 3️⃣ Modelagem Fixa do Banco de Dados (PostgreSQL)
A IA implementadora deve criar as seguintes tabelas e regras:
* **Tabela `users`**:
  * `id` (UUID, PK)
  * `status` (VARCHAR/ENUM - valores: 'ACTIVE', 'BLOCKED')
  * `credit_limit` (DECIMAL / NUMERIC 10,2)
  * `used_limit` (DECIMAL / NUMERIC 10,2, DEFAULT 0)
* **Tabela `transactions`**:
  * `id` (UUID, PK)
  * `user_id` (UUID, Relacionamento ref `users`)
  * `amount` (NUMERIC 10,2)
  * `status` (VARCHAR: 'APPROVED', 'REJECTED', 'FRAUD')
  * `idempotency_key` (VARCHAR, UNIQUE) -> Isso é **vital**.
  * `created_at` (TIMESTAMP)

### 4️⃣ O Core do Negócio: Regra de Autorização Síncrona 🧠 (CRÍTICO)

O gargalo em um autorizador síncrono é quando 2 transações do mesmo cartão batem no mesmo milissegundo. Nunca podemos aprovar transações se a soma ultrapassar o limite.

* **O ERRO clichê:** Fazer `SELECT saldo`, calcular na memória, e depois fazer `UPDATE`. (Gera Race Condition).
* **A SOLUÇÃO OBRIGATÓRIA (Update Atômico nas camadas de Repositório):**
A IA deverá rodar a seguinte instrução SQL através do `.query` no TypeORM, garantindo trava transacional exclusiva no ato da gravação sem sobrecarregar a *connection pool* na leitura:

```sql
UPDATE users 
SET used_limit = used_limit + :amount 
WHERE id = :id 
  AND status = 'ACTIVE' 
  AND (credit_limit - used_limit) >= :amount 
RETURNING id, used_limit;
```

**Como a IA implementadora deve desenhar o Service:**
1. Recebe a requisição (POST `/transactions`).
2. Roda a Query Atômica acima.
3. Se a query voltar `rowCount: 0`, significa que **ou usuário não existe, ou está bloqueado, ou não tem limite**. Se voltar dados, a transação coube!
4. Dá `INSERT` na tabela `transactions` com o resultado ('APPROVED' ou 'REJECTED'). 

### 5️⃣ Sistema Antifraude e Rate Limiting (Acesso de Memória)
**O que fazer:** A IA deverá injetar uma camada (Interceptor ou primeira checagem no Service) usando o **Redis** nativo ANTES de bater no banco de dados.

* **Regra Anti-Rajada (Fraude):** Evitar clonagem de botão ou ataque rápido. Usar o Redis com o comando `SETNX`:
  * A IA executa: `client.set("throttle:card:" + userId, "1", "EX", 2, "NX")`. 
  * Se o Redis retornar `0`, significa que já rodou há menos de 2 segundos. **Negar compra instantaneamente.**

### 6️⃣ Idempotência (Idempotency-Key)
O chamador deve enviar um Header `Idempotency-Key` único por transação.
* **O que fazer:** Gravar essa key no banco na tabela `transactions` dentro da constraint UNIQUE.
* **Tratamento:** A IA precisa implementar um `Exception Filter` no NestJS que intercepte erros de constraint única (Código Postgres `23505`). Se esse erro bater, a API deverá responder com `409 Conflict` imediatamente para evitar processamento duplicado, com a mensagem: "Transação já processada".


---

## ☁️ Fase 2: Escala Elástica na AWS (Preparação Fargate e Load Balancer)

Na Fase de consolidação e entrega do projeto, a IA deverá gerar diretrizes e uma estrutura conteinerizada focada puramente na nuvem:

### 1️⃣ Otimização Avançada do Build Docker
* O Dockerfile gerado precisa ser um **Multi-Stage Build**.
* Somente os binários da pasta `dist/` e pacotes em `node_modules` com a flag `npm ci --production` devem ir pra imagem final. Reduzir a superfície de ataque é vital.

### 2️⃣ Adaptações Mínimas de Código para Alta Disponibilidade
Para que o sistema escale em múltiplos pods (`AWS ECS / FargateTasks`), a IA necessita implementar no NestJS:
1. **Health Check Endpoint:** (`GET /health`) utilizando a bilbioteca `@nestjs/terminus` para injetar validações simples de conectividade (o banco responde? o redis responde?). O AWS ALB ("Load Balancer") usará esse endpoint para rotear tráfego apenas nas máquinas saudáveis.
2. **Graceful Shutdown:** Ativar `app.enableShutdownHooks()` no NestJS. Essencial! Se o AWS Auto Scaling decidir matar um container que está ocioso, a aplicação precisa ouvir o evento SIGTERM e terminar requests de autorização já trafegando de forma tranquila antes de sair, senão clientes perderão a transação.

### 3️⃣ Padrão Recomendado de Infra AWS
A IA deverá construir/documentar a infra assim:
* **Load Balancer:** AWS ALB roteando HTTP nativo.
* **Compute:** ECS com AWS Fargate (Task definitions distribuindo 2 vCPU e 4GB Ram por worker).
* **Database Pooler:** Como o autorizador gera múltiplos containers batendo concorrentemente no Postgres, usar **PgBouncer** no RDS Proxymode para aliviar as conexões na "thread" principal do postgres.

> [!WARNING]
> O código final precisa ser altamente modular (`UsersModule`, `TransactionsModule`, `RedisModule`). Nenhuma regra de infra pode poluir o repositório (`Controller` não deve validar DTO e sim delegar isso pro Nest Validator pipeline; Services não devem conhecer SQL puro se não estritamente no repositório).
