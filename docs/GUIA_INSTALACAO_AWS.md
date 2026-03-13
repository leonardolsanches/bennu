# Bennu Finance - Guia de Instalação e Configuração AWS

**Documento técnico para setup do ambiente de produção**
**Versão: 1.0 | Fevereiro 2026**

---

## 1. Pré-requisitos

| Item | Requisito |
|------|-----------|
| AWS CLI | >= 2.x configurado com perfil IAM Admin |
| Docker | >= 24.x |
| PostgreSQL Client | >= 14.x (psql) |
| Node.js | Não aplicável (backend Python) |
| Python | >= 3.11 |
| Domínio | Registrado e apontável para Route 53 |

---

## 2. Estrutura do ZIP Entregue

```
bennu-finance.zip
├── app/                    # Código-fonte da aplicação
│   ├── auth/               # Módulo de autenticação
│   ├── middleware/          # Middlewares
│   ├── models/             # Modelos SQLAlchemy
│   ├── routes/             # Endpoints API
│   ├── services/           # Lógica de negócio
│   ├── static/             # Assets (CSS, JS, imagens)
│   ├── templates/          # Templates Jinja2
│   ├── database.py         # Conexão com banco
│   └── main.py             # Entry point
├── pyproject.toml          # Dependências Python
├── Dockerfile              # Imagem Docker (criar conforme seção 4)
├── .env.example            # Template de variáveis de ambiente
├── sql/
│   └── create_database.sql # Script completo de criação do banco
└── GUIA_INSTALACAO_AWS.md  # Este documento
```

---

## 3. Infraestrutura AWS - Provisionamento

### 3.1 VPC e Rede

```bash
# Criar VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=bennu-vpc}]'

# Subnets Públicas (2 AZs para ALB)
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.1.0/24 --availability-zone us-east-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=bennu-public-1a}]'
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.2.0/24 --availability-zone us-east-1b --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=bennu-public-1b}]'

# Subnets Privadas (para RDS e ECS)
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.3.0/24 --availability-zone us-east-1a --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=bennu-private-1a}]'
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.4.0/24 --availability-zone us-east-1b --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=bennu-private-1b}]'

# Internet Gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=bennu-igw}]'
aws ec2 attach-internet-gateway --internet-gateway-id <IGW_ID> --vpc-id <VPC_ID>

# NAT Gateway (para subnets privadas acessarem internet)
aws ec2 allocate-address --domain vpc
aws ec2 create-nat-gateway --subnet-id <PUBLIC_SUBNET_1A_ID> --allocation-id <EIP_ALLOC_ID>

# Route Tables
# Pública: 0.0.0.0/0 → IGW
# Privada: 0.0.0.0/0 → NAT Gateway
```

### 3.2 Security Groups

```bash
# SG para ALB (porta 80/443 aberta ao mundo)
aws ec2 create-security-group --group-name bennu-alb-sg --description "ALB Security Group" --vpc-id <VPC_ID>
aws ec2 authorize-security-group-ingress --group-id <ALB_SG_ID> --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id <ALB_SG_ID> --protocol tcp --port 443 --cidr 0.0.0.0/0

# SG para ECS (porta 5000 apenas do ALB)
aws ec2 create-security-group --group-name bennu-ecs-sg --description "ECS Security Group" --vpc-id <VPC_ID>
aws ec2 authorize-security-group-ingress --group-id <ECS_SG_ID> --protocol tcp --port 5000 --source-group <ALB_SG_ID>

# SG para RDS (porta 5432 apenas do ECS)
aws ec2 create-security-group --group-name bennu-rds-sg --description "RDS Security Group" --vpc-id <VPC_ID>
aws ec2 authorize-security-group-ingress --group-id <RDS_SG_ID> --protocol tcp --port 5432 --source-group <ECS_SG_ID>
```

---

## 4. Banco de Dados (RDS PostgreSQL)

### 4.1 Criar Instância RDS

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name bennu-db-subnet \
  --db-subnet-group-description "Bennu DB Subnets" \
  --subnet-ids <PRIVATE_SUBNET_1A_ID> <PRIVATE_SUBNET_1B_ID>

aws rds create-db-instance \
  --db-instance-identifier bennu-finance-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username bennu_admin \
  --master-user-password '<SENHA_FORTE>' \
  --allocated-storage 50 \
  --storage-type gp3 \
  --multi-az \
  --db-subnet-group-name bennu-db-subnet \
  --vpc-security-group-ids <RDS_SG_ID> \
  --db-name bennu_finance \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --no-publicly-accessible \
  --storage-encrypted
```

### 4.2 Criar Schema

```bash
# Obter endpoint do RDS
aws rds describe-db-instances --db-instance-identifier bennu-finance-db \
  --query 'DBInstances[0].Endpoint.Address' --output text

# Executar script de criação (via bastion host ou VPN)
psql -h <RDS_ENDPOINT> -U bennu_admin -d bennu_finance -f sql/create_database.sql
```

### 4.3 Migração de Dados (se aplicável)

```bash
# Exportar dados do ambiente atual
pg_dump -h <ORIGEM_HOST> -U <ORIGEM_USER> -d <ORIGEM_DB> \
  --data-only --no-owner --no-privileges -f dados_export.sql

# Importar no RDS
psql -h <RDS_ENDPOINT> -U bennu_admin -d bennu_finance -f dados_export.sql
```

---

## 5. Containerização (Docker)

### 5.1 Dockerfile

Criar na raiz do projeto:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir .

COPY app/ ./app/

EXPOSE 5000

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "4"]
```

### 5.2 Build e Push para ECR

```bash
# Criar repositório ECR
aws ecr create-repository --repository-name bennu-finance --image-scanning-configuration scanOnPush=true

# Login no ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build e Push
docker build -t bennu-finance .
docker tag bennu-finance:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bennu-finance:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bennu-finance:latest
```

---

## 6. Variáveis de Ambiente

### 6.1 Secrets Manager

```bash
aws secretsmanager create-secret \
  --name bennu-finance/production \
  --secret-string '{
    "DATABASE_URL": "postgresql://bennu_admin:<SENHA>@<RDS_ENDPOINT>:5432/bennu_finance",
    "SESSION_SECRET": "<GERAR_COM_openssl_rand_-hex_32>",
    "COGNITO_CLIENT_ID": "<COGNITO_CLIENT_ID>",
    "COGNITO_CLIENT_SECRET": "<COGNITO_CLIENT_SECRET>",
    "COGNITO_DOMAIN": "<COGNITO_DOMAIN>",
    "COGNITO_USER_POOL_ID": "<USER_POOL_ID>",
    "GOOGLE_CLIENT_ID": "<GOOGLE_CLIENT_ID>",
    "GOOGLE_CLIENT_SECRET": "<GOOGLE_CLIENT_SECRET>"
  }'
```

### 6.2 Variáveis Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Chave para assinatura de sessões | `openssl rand -hex 32` |
| `REPLIT_DEPLOYMENT` | Flag de produção | `1` |
| `ISSUER_URL` | URL do provedor OIDC (Cognito) | `https://cognito-idp.us-east-1.amazonaws.com/<POOL_ID>` |
| `COGNITO_CLIENT_ID` | Client ID do Cognito App | — |
| `COGNITO_CLIENT_SECRET` | Client Secret do Cognito App | — |
| `COGNITO_DOMAIN` | Domínio do Cognito | `bennu.auth.us-east-1.amazoncognito.com` |

---

## 7. ECS Fargate - Deploy

### 7.1 IAM Roles

```bash
# Task Execution Role (para ECS puxar imagem e ler secrets)
aws iam create-role --role-name bennu-ecs-execution-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name bennu-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Adicionar permissão para Secrets Manager
aws iam put-role-policy --role-name bennu-ecs-execution-role \
  --policy-name SecretsAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:bennu-finance/*"
    }]
  }'
```

### 7.2 Task Definition

```json
{
  "family": "bennu-finance",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/bennu-ecs-execution-role",
  "containerDefinitions": [{
    "name": "bennu-finance",
    "image": "<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bennu-finance:latest",
    "portMappings": [{
      "containerPort": 5000,
      "protocol": "tcp"
    }],
    "secrets": [
      {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:bennu-finance/production:DATABASE_URL::"},
      {"name": "SESSION_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:bennu-finance/production:SESSION_SECRET::"},
      {"name": "COGNITO_CLIENT_ID", "valueFrom": "arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:bennu-finance/production:COGNITO_CLIENT_ID::"},
      {"name": "COGNITO_CLIENT_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:bennu-finance/production:COGNITO_CLIENT_SECRET::"},
      {"name": "COGNITO_DOMAIN", "valueFrom": "arn:aws:secretsmanager:us-east-1:<ACCOUNT_ID>:secret:bennu-finance/production:COGNITO_DOMAIN::"}
    ],
    "environment": [
      {"name": "REPLIT_DEPLOYMENT", "value": "1"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/bennu-finance",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:5000/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    }
  }]
}
```

```bash
# Criar log group
aws logs create-log-group --log-group-name /ecs/bennu-finance

# Registrar task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

### 7.3 ALB + Target Group

```bash
# Criar ALB
aws elbv2 create-load-balancer \
  --name bennu-alb \
  --subnets <PUBLIC_SUBNET_1A_ID> <PUBLIC_SUBNET_1B_ID> \
  --security-groups <ALB_SG_ID> \
  --scheme internet-facing \
  --type application

# Target Group
aws elbv2 create-target-group \
  --name bennu-tg \
  --protocol HTTP \
  --port 5000 \
  --vpc-id <VPC_ID> \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2

# Listener HTTPS (requer certificado ACM)
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<ACM_CERT_ARN> \
  --default-actions Type=forward,TargetGroupArn=<TG_ARN>

# Listener HTTP → Redirect HTTPS
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

### 7.4 Criar Cluster e Service

```bash
# Cluster ECS
aws ecs create-cluster --cluster-name bennu-cluster

# Service
aws ecs create-service \
  --cluster bennu-cluster \
  --service-name bennu-finance-service \
  --task-definition bennu-finance \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<PRIVATE_SUBNET_1A_ID>,<PRIVATE_SUBNET_1B_ID>],securityGroups=[<ECS_SG_ID>],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=<TG_ARN>,containerName=bennu-finance,containerPort=5000" \
  --health-check-grace-period-seconds 120
```

---

## 8. Cognito - Autenticação Google

### 8.1 Criar User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name bennu-finance-pool \
  --auto-verified-attributes email \
  --schema '[{"Name":"email","Required":true,"Mutable":true}]'

# Criar domínio
aws cognito-idp create-user-pool-domain \
  --user-pool-id <POOL_ID> \
  --domain bennu-finance

# Criar App Client
aws cognito-idp create-user-pool-client \
  --user-pool-id <POOL_ID> \
  --client-name bennu-web \
  --generate-secret \
  --supported-identity-providers Google \
  --callback-urls '["https://<SEU_DOMINIO>/auth/callback"]' \
  --logout-urls '["https://<SEU_DOMINIO>/"]' \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client
```

### 8.2 Configurar Google como Identity Provider

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto → APIs & Services → Credentials
3. Crie OAuth 2.0 Client ID (tipo Web Application)
4. Origens autorizadas: `https://<SEU_DOMINIO>`
5. URIs de redirecionamento: `https://bennu-finance.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

```bash
aws cognito-idp create-identity-provider \
  --user-pool-id <POOL_ID> \
  --provider-name Google \
  --provider-type Google \
  --provider-details '{
    "client_id": "<GOOGLE_CLIENT_ID>",
    "client_secret": "<GOOGLE_CLIENT_SECRET>",
    "authorize_scopes": "openid email profile"
  }' \
  --attribute-mapping '{"email":"email","name":"name"}'
```

---

## 9. DNS e SSL (Route 53 + ACM)

```bash
# Solicitar certificado SSL
aws acm request-certificate \
  --domain-name <SEU_DOMINIO> \
  --subject-alternative-names "*.<SEU_DOMINIO>" \
  --validation-method DNS

# Após validação DNS, criar registro A apontando para ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "<SEU_DOMINIO>",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<ALB_HOSTED_ZONE_ID>",
          "DNSName": "<ALB_DNS_NAME>",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

---

## 10. CloudFront (CDN para assets estáticos)

```bash
# Criar distribuição apontando para o ALB
# Configurar cache para /static/* com TTL longo
# Origin: ALB DNS
# Behaviors:
#   /static/*  → Cache 30 dias, Compress
#   Default(*) → No cache, Forward all headers
```

---

## 11. Monitoramento (CloudWatch)

```bash
# Alarme de CPU alta no ECS
aws cloudwatch put-metric-alarm \
  --alarm-name bennu-high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ClusterName,Value=bennu-cluster Name=ServiceName,Value=bennu-finance-service \
  --alarm-actions <SNS_TOPIC_ARN>

# Alarme de erros 5xx no ALB
aws cloudwatch put-metric-alarm \
  --alarm-name bennu-5xx-errors \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=LoadBalancer,Value=<ALB_FULL_NAME> \
  --alarm-actions <SNS_TOPIC_ARN>
```

---

## 12. Backup e Restore

### RDS Backups Automáticos
- Retenção: 7 dias (configurado na criação)
- Window: 03:00-04:00 UTC

### Backup Manual
```bash
aws rds create-db-snapshot \
  --db-instance-identifier bennu-finance-db \
  --db-snapshot-identifier bennu-manual-$(date +%Y%m%d)
```

### Restore
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier bennu-finance-db-restored \
  --db-snapshot-identifier <SNAPSHOT_ID> \
  --db-instance-class db.t3.medium \
  --db-subnet-group-name bennu-db-subnet \
  --vpc-security-group-ids <RDS_SG_ID>
```

---

## 13. Deploy de Novas Versões

```bash
# 1. Build nova imagem
docker build -t bennu-finance .

# 2. Tag e push
docker tag bennu-finance:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bennu-finance:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bennu-finance:latest

# 3. Force new deployment (usa a imagem :latest atualizada)
aws ecs update-service \
  --cluster bennu-cluster \
  --service bennu-finance-service \
  --force-new-deployment

# 4. Monitorar deploy
aws ecs wait services-stable --cluster bennu-cluster --services bennu-finance-service
```

---

## 14. Checklist de Validação Pós-Deploy

```
[ ] Aplicação respondendo em https://<SEU_DOMINIO>
[ ] Health check retornando 200 em /health
[ ] Login Google funcionando (Cognito redirect)
[ ] Acesso ao banco de dados confirmado (listar empresas)
[ ] Assets estáticos carregando (CSS, JS, imagens)
[ ] Logs aparecendo no CloudWatch
[ ] Alarmes CloudWatch configurados e testados
[ ] Backup RDS automático verificado
[ ] Certificado SSL válido e sem avisos
[ ] Todas as rotas protegidas exigindo autenticação
```

---

## 15. Troubleshooting

| Sintoma | Verificar |
|---------|-----------|
| 502 Bad Gateway | ECS tasks rodando? `aws ecs describe-services --cluster bennu-cluster --services bennu-finance-service` |
| Timeout na conexão DB | Security Group do RDS permite porta 5432 do ECS SG? |
| Login Google falha | Callback URL no Cognito bate com domínio? Google Cloud Console configurado? |
| Assets não carregam | CloudFront invalidado? Paths `/static/` configurados? |
| Lentidão | Verificar CPU/Memory via CloudWatch. Escalar tasks se necessário |
| Erro 500 genérico | Consultar CloudWatch Logs: `/ecs/bennu-finance` |

---

*Documento técnico - Fevereiro 2026 - v1.0*
