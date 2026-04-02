# Guia de Nuvem e Alta Escalabilidade na Nuvem da AWS

## 📌 Objetivo
Garantir e blindar a aplicação de modo que, ao invés de rodar uma única porta num servidor isolado, este projeto esteja completamente apto para instanciar Clusters robustos usando balanceamento horizontal.

---

## 🐳 1. O Dockerfile Otimizado Final
O contêiner deve ser absurdamente pequeno. A IA deve gerar um **Multi-stage build**:

```dockerfile
# Estágio de Dependências e Build (Construção)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Estágio de Produção (Run)
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
# Só instala as libs estritas de produção
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
```

---

## 🛑 2. Graceful Shutdown OBRIGATÓRIO (NestJS)
Sistemas distribuídos "somem e aparecem" via Auto Scaling na nuvem. Pior que estourar o limite, seria estourar o limite e a request cair antes de devolver a resposta pro cliente.

A IA implementadora deve modificar o `main.ts` explicitamente ativando os ganchos do SO:
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Crucial para o ECS parar as rotas de aceitarem tráfego 
  // antes de efetivamente desligar os nodes!
  app.enableShutdownHooks();
  await app.listen(3000);
}
bootstrap();
```

---

## ☁️ 3. Componentes Alvo de Deploy Arquitetônico na AWS
A infraestrutura Terraform ou manual para este projeto deverá constar em:
* **Route53 DNS** conectando num **ALB (Application Load Balancer)**: Vai interceptar HTTPS e descarregar no painel o tráfego de ataques básicos. Destribuirá por "Round Robin" entre os milhares de containers.
* **AWS ECS em Fargate**: Instâncias de 1 VCPU 2 RAM para a API (Sobe em questão de 10 segundos ao detectar Pico na métrica de CPU da frota no CloudWatch).
* **Amazon Aurora Serverless (PostgreSQL) + PgBouncer:** NUNCA bater 1.000 requisições criando e abrindo conexões TPC direto pro PostgreSQL. Um Pooler (Aws RDS Proxy / PgBouncer Local) precisa repousar sobre as transações.
* **Amazon ElastiCache (Redis):** Cluster Redis gerenciado para orquestrar as métricas de Throttler e Antifraude com <1ms de latência dentro da rede privada da VPC.
