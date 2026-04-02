# Observabilidade Estruturada para Microsserviços 

## 📌 Objetivo
Um sistema de milhares de requests/segundo rodando em 50 instâncias (containers/Fargate) é impossível de debugar pelo log convencional de texto. Precisamos rastrear individualmente as requests.

---

## 📊 1. Substituição de Logger pelo PINO e JSON Format
A IA implementadora deverá remover o Logger padrao do NestJs (ConsoleLogger).

**Passos:**
1. Importar no root (`main.ts` e `app.module.ts`) o `LoggerModule` da biblioteca `nestjs-pino`.
2. Configurar o output como puro JSON em produção.

```typescript
// app.module.ts
import { LoggerModule } from 'nestjs-pino';

// ... (imports)
LoggerModule.forRoot({
  pinoHttp: {
    transport: process.env.NODE_ENV !== 'production' 
      ? { target: 'pino-pretty' } // Bonito p/ Localhost
      : undefined, // JSON Otimizado p/ Datadog/Cloudwatch
  },
})
```

---

## 🆔 2. Correlation ID / RequestTrace ID
No meio dos logs do pino, precisamos injetar um identificador global da requisição.
* A IA deve construir um middleware, ou aproveitar a injeção do `pino-http` que insere o identificador `req.id` em todos os outputs gerados via log.
* Dessa forma, se uma requisição der Timeout, o DevOps busca no CloudWatch pelo id `{ "reqId": "1234-xyz" }` e vai ler desde o Log do "Iniciando Transacao de U$5" até "Falha de BD".

---

## 🩺 3. Healthcheck da Aplicação (Obrigatório AWS)
Adicionar biblioteca `@nestjs/terminus` e expor uma rota `/health`.
* Esse endpoint nunca deve pedir autenticação e só deverá retornar status HTTP 200 `{ "status": "ok" }`.
* Na AWS as LoadBalancers enviarão ping aqui a cada 10 segundos. Instâncias que travarem retornarão 500 ou time-out e o ECS a substituirá automaticamente.
