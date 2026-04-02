# Antifraude no Cache e Proteções de Escala (Redis)

## 📌 Objetivo
Proteção massiva na camada Front End Backend antes que pacotes fraudulentos consumam conexões pesadas da camada de banco de dados (RDS). Atende à Regra 3 (Rejeitar se múltiplas em curto intervalo).

---

## 🏃 1. Regra Básica Antifraude (Redis Lock no Tempo)

A IA implementadora deve injetar um interceptador (`NestInterceptor`) ou rodar este trecho de código no inicio do `TransactionsService`.

**A Regra:** Se um cliente/bot disparar 3 compras do mesmo usuário no mesmo 1 segundo, apenas uma pode seguir! Roteadores comuns perdem e emitem fraude.

**Técnica: Usar chave Set-If-Not-Exists (`SETNX`) com Expiração no Redis.**

```typescript
// Implementação base para a IA em Typescript com IoRedis:

const lockKey = `antifraud:user:${userId}`;
// Tenta "Setar" a chave, com validade de 2 segundos. O "NX" previne sobrescrever!
const isFirstRequest = await redis.set(lockKey, "LOCKED", "EX", 2, "NX");

if (!isFirstRequest) {
   // FRAUDE! A chave já existia nos últimos 2 segundos.
   throw new HttpException('Ato suspeito. Múltiplas transações simultâneas não permitidas.', HttpStatus.TOO_MANY_REQUESTS);
}
// Se chegou aqui, bloqueou pelos próximos 2 segundos e podemos ir no PGSQL aprovar.
```

---

## 🛡️ 2. Rate Limiting de IP
Para prevenir tráfego bruto por conta de DDoS ou brute-force, a IA deverá configurar o `@nestjs/throttler`.
* Ligar o módulo Throttler importando via `ThrottlerModule.forRootAsync`.
* Configurar limite de `TTL: 60` segundos limitando para `100 requisições` por IP global.
* Isso blinda todo o microsserviço no nível OSI/Application antes de bater na lógica do redis.
