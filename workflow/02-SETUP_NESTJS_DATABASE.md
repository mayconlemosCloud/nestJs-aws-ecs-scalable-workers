# Criação do Projeto e Conexões Principais no NestJS

## 📌 Objetivo
Criar o esqueleto base de microsserviço utilizando **NestJS** e injetar as bibliotecas core necessárias para performance (TypeORM) e infra (Redis, Throttler).

---

## 💻 1. Inicializando o Projeto

A IA deverá executar o seguinte CLI dentro da pasta raiz para instanciar a API em TypeScript estrito:

```bash
npx @nestjs/cli new api --strict --skip-git --package-manager npm
```

---

## 📚 2. Instalação de Bibliotecas Obrigatórias

Exigimos as seguintes stacks para viabilizar as features de escala:

```bash
cd api

# Banco de Dados (ORM)
npm install @nestjs/typeorm typeorm pg

# Redis para Cache e AntiFraude
npm install ioredis

# Rate Limiting (Prevenção DDoS)
npm install @nestjs/throttler

# Observabilidade (Logs JSON + Performance)
npm install nestjs-pino pino-http

# Validação e DTOs
npm install class-validator class-transformer
```

---

## ⚙️ 3. Configuração do Core Module (`app.module.ts`)

O módulo raiz da aplicação deverá importar de forma orquestrada as conexões com o DB e o Redis lendo o `@nestjs/config`.

**Instruções para a IA no código:**
1. Importe o `TypeOrmModule.forRootAsync`.
2. Configure a `DATABASE_URL` usando dados externos (do Docker/Env).
3. Habilite `synchronize: false` para ambientes que não sejam de desenvolvimento dev, mas pode instanciar `synchronize: true` num primeiro passo do teste local.
4. Adicione o provedor do `ioredis` em um módulo de cache global puro (não use middlewares genéricos de cache REST, queremos acesso ao cliente Redis nativo para usar `SETNX`).
5. Execute api para verificar se está funcionando e gere um log de sucesso. Além execute a api com o comando `npm run start:dev` e verifique se está funcionando e chame a rota GET /health e gere um log de sucesso.
