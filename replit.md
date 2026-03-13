# Bennu Finance - Memorial Descritivo

## Overview

Bennu Finance is a comprehensive multi-company financial management system designed to track revenues, expenses, and budgets. It generates detailed financial reports with complex categorization support, offering complete financial control, integrated management and accounting reports, versioned budgetary planning, cash flow analysis, tax management, and full auditing. The project's vision is to optimize financial operations across multiple entities, providing deep insights and robust control for informed decision-making and significant market potential.

## User Preferences

- Comunicação em linguagem simples e direta
- Interface otimizada para telas 1920x1080
- Layouts ultra-compactos para minimizar rolagem
- Botões de ação padronizados (azul para editar, vermelho para excluir)
- Ícone Excel verde (#217346) padronizado

## System Architecture

Bennu Finance employs a Python FastAPI backend with a PostgreSQL database. The frontend utilizes server-side rendering with Jinja2 and vanilla JavaScript, enhanced by Bootstrap 5 for UI components and Chart.js for interactive visualizations. The architecture follows a RESTful API pattern with Pydantic validation and SQLAlchemy 2.0 using the Repository pattern. Authentication is handled via OAuth 2.0 / OpenID Connect with cookie-based sessions.

### Key Features

- **Financial Management**: Revenue and expense tracking, dual categorization (Accounting/Managerial), intelligent transaction disaggregation, progressive auto-completion.
- **Reporting**: Hierarchical P&L statements (Accounting and Consolidated with Actual vs. Budget analysis), monthly cash flow projections, real-time cash control, accounts payable/receivable. Contas a Receber report uses zoom 75% (`transform: scale(0.75); width: 133.33%`) with frozen-header layout: body scroll disabled via `body.contas-receber-page { overflow: hidden; height: 100vh }`, title/filters/summary cards fixed at top, table in flex:1 card with `overflow: auto`, thead `position: sticky; top:0` and tfoot `position: sticky; bottom:0` — only data rows scroll. Ordered by `numero_nota_fiscal ASC NULLS LAST` (lexicographic), secondary by `data_vencimento DESC`. 14 columns: Emissão NF, Cliente, Comp.Cont., Comp.Ger., NF, Valor Bruto, IRPJ, CSLL/PIS/COFINS (grouped sum), ISS, Outros Descontos, Valor Líquido, PDF, Recebimento, Valor Recebido. Filters include `tipo_data` (Comp. Contábil / Comp. Gerencial) which controls both which competência column is used for filtering AND which data is returned. Tax percentages shown in column headers when uniform via `<span class="th-label">`, PDF link column with XSS-safe URL validation, totals row in tfoot, client-side Excel export via SheetJS matching displayed columns. Backend `get_contas_a_receber` accepts `tipo_data=contabil|gerencial` query param to filter by `competencia_ano_contabil`/`competencia_mes_contabil` or `competencia_ano_gerencial`/`competencia_mes_gerencial` respectively. Contas a Pagar report uses same zoom 75% layout with 15 columns in order: Data Pgto, Data Emissão, Fornecedor, Nº Documento, Conta Contábil, Centro de Custo, Competência, Descrição, Valor Bruto, INSS, IRRF, ISS, CSLL/PIS/COFINS, Juros e Multas, Total a Pagar. Tax columns (INSS/IRRF/ISS/CSLL) fetched in batch from child split transactions (tipo_filho='split', nome LIKE 'Retenção%') grouped by parent_id. Juros e Multas shown as placeholder (future form field). Backend joins CategoriaContabil and CentroCusto for name resolution. Excel export via SheetJS with same 15 columns + totals row.
- **Budgetary Planning**: Versioning with draft/publish workflow, manual monthly distribution, budget vs. actual comparison.
- **Master Data Management**: Companies, Clients, Suppliers, Accounting/Managerial Categories, Cost Centers, Projects, Products/Services, Bank Accounts, Credit Cards, Taxes.
- **Administration**: Comprehensive audit system, data backup/restore with cascade-aware cleanup (admin-backup page), Excel export functionality across all screens.
- **Unified Forms**: Create/edit forms for receitas and despesas are unified — `nova_receita.html`/`nova_despesa.html` handle both creation and editing modes via a `transacao_id` template variable. JS controllers (`nova_receita.js`, `nova_despesa.js`) detect edit mode via hidden `#transacao-id` field and switch between POST (create) and PUT (edit). Both JS files use IIFE pattern with guard flags (`window.NovaReceitaControllerDefined`/`window.NovaDespesaControllerDefined`) to prevent redeclaration errors on double-load. Legacy `editar_receita.html`/`editar_despesa.html` templates archived to `archived/legacy_templates/`.
- **Currency Mask**: The `valor` field in receita/despesa forms uses `type="text"` with a JS currency mask — on blur formats to Brazilian style (e.g., `50.000,00`), on focus shows raw number for editing. `parseCurrencyInput()` and `formatCurrencyInput()` methods handle conversion between display format and numeric values.

### Technical Stack

- **Backend**: Python (>= 3.11), FastAPI (>= 0.117.1), SQLAlchemy (>= 2.0.43), Pydantic (>= 2.11.9), Uvicorn (>= 0.36.0), Authlib (>= 1.6.4), psycopg2-binary (>= 2.9.10), Jinja2 (>= 3.1.6), openpyxl (>= 3.1.5).
- **Frontend**: JavaScript/HTML/CSS (ES6+), Chart.js, SheetJS (XLSX), Font Awesome, Bootstrap 5.
- **Database**: PostgreSQL (Minimum 14.x, Recommended 15.x or 16.x).

## External Dependencies

-   **AWS Services**:
    -   **ECS Fargate**: For application container hosting.
    -   **RDS PostgreSQL**: Managed database service.
    -   **ALB (Application Load Balancer)**: For traffic distribution.
    -   **Route 53**: DNS management.
    -   **CloudFront**: CDN for static assets.
    -   **S3**: For backups and file storage.
    -   **Cognito**: For Google-based authentication.
    -   **CloudWatch**: For logging and monitoring.
    -   **Secrets Manager**: For credential management.
    -   **ACM (AWS Certificate Manager)**: For SSL certificates.
    -   **VPC (Virtual Private Cloud)**: For isolated network infrastructure.
-   **Google Cloud Console**: For configuring Google OAuth 2.0 credentials and enabling Google+ API for authentication via AWS Cognito.