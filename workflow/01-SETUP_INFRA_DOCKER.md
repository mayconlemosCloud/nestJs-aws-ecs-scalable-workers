# Arquitetura e Estrutura Docker (PostgreSQL + Redis)

## 📌 Objetivo
Iniciar o projeto usando **Docker Compose** para garantir homogeneidade entre desenvolvimento local e a infraestrutura que existirá em produção (usando serviços equivalentes como RDS e ElastiCache na AWS).

---

## 💻 1. Arquivo `docker-compose.yml`

A IA implementadora **deve criar** na raiz do projeto o arquivo `docker-compose.yml` contendo os seguintes serviços. É imperativo que os `healthchecks` estejam definidos para que as dependências inicializem na ordem correta.

```yaml
version: '3.8'

services:
  # === Banco de Dados Relacional (PostgreSQL) ===
  postgres:
    image: postgres:15-alpine
    container_name: authorizer_db
    restart: always
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: root
      POSTGRES_DB: authorizer
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U root -d authorizer"]
      interval: 10s
      timeout: 5s
      retries: 5

  # === Cache em Memória Rápida (Redis) ===
  redis:
    image: redis:7-alpine
    container_name: authorizer_redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # === Aplicação NestJS (Desenvolvimento) ===
  # A IA deverá gerar a API mapeada aqui para que tudo rode sob a mesma rede Docker.
  api:
    build: 
      context: ./api
      target: development
    container_name: authorizer_api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://root:root@postgres:5432/authorizer
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./api:/usr/src/app
      # Protege a pasta 'node_modules' de ser sobrescrita pelo volume host
      - /usr/src/app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  pgdata:
  redisdata:
```

---

## 🔄 2. Instruções para a IA

1. Crie este arquivo no root path do Workspace.
2. Certifique-se de que a API consumirá nativamente as variáveis de ambiente `DATABASE_URL` e `REDIS_URL`.
3. Para validar localmente o funcionamento, bastará rodar o comando:
   `docker-compose up --build`
