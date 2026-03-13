from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Image, HRFlowable, ListFlowable, ListItem
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Circle, Polygon
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics import renderPDF
from reportlab.pdfgen import canvas
from io import BytesIO
import os

BLUE_DARK = HexColor("#1a365d")
BLUE_MED = HexColor("#2b6cb0")
BLUE_LIGHT = HexColor("#bee3f8")
BLUE_PALE = HexColor("#ebf8ff")
ORANGE = HexColor("#ed8936")
ORANGE_LIGHT = HexColor("#feebc8")
GREEN = HexColor("#38a169")
GREEN_LIGHT = HexColor("#c6f6d5")
RED = HexColor("#e53e3e")
RED_LIGHT = HexColor("#fed7d7")
GRAY_DARK = HexColor("#2d3748")
GRAY_MED = HexColor("#718096")
GRAY_LIGHT = HexColor("#e2e8f0")
GRAY_PALE = HexColor("#f7fafc")
WHITE = white
BLACK = black

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm

styles = getSampleStyleSheet()

def s(name, **kw):
    base = kw.pop('parent', 'Normal')
    return ParagraphStyle(name, parent=styles[base], **kw)

S_COVER_TITLE = s('CoverTitle', parent='Title', fontSize=32, textColor=WHITE, alignment=TA_CENTER, leading=40, spaceAfter=10)
S_COVER_SUB = s('CoverSub', fontSize=14, textColor=HexColor("#bee3f8"), alignment=TA_CENTER, leading=20, spaceAfter=6)
S_COVER_VER = s('CoverVer', fontSize=11, textColor=HexColor("#90cdf4"), alignment=TA_CENTER, leading=16)

S_CH_TITLE = s('ChTitle', parent='Heading1', fontSize=22, textColor=BLUE_DARK, spaceBefore=20, spaceAfter=12, leading=28, borderWidth=0)
S_SEC_TITLE = s('SecTitle', parent='Heading2', fontSize=16, textColor=BLUE_MED, spaceBefore=14, spaceAfter=8, leading=22)
S_SUBSEC = s('SubSec', parent='Heading3', fontSize=13, textColor=GRAY_DARK, spaceBefore=10, spaceAfter=6, leading=18)

S_BODY = s('Body', fontSize=10, textColor=GRAY_DARK, alignment=TA_JUSTIFY, leading=15, spaceAfter=6)
S_BODY_BOLD = s('BodyBold', fontSize=10, textColor=GRAY_DARK, alignment=TA_JUSTIFY, leading=15, spaceAfter=6, fontName='Helvetica-Bold')
S_NOTE = s('Note', fontSize=9, textColor=BLUE_MED, leading=13, spaceAfter=4, leftIndent=10, borderPadding=6)
S_WARN = s('Warn', fontSize=9, textColor=RED, leading=13, spaceAfter=4, leftIndent=10)
S_CODE = s('Code', fontName='Courier', fontSize=8, textColor=GRAY_DARK, leading=11, spaceAfter=4, leftIndent=6, backColor=GRAY_PALE)
S_CAPTION = s('Caption', fontSize=8, textColor=GRAY_MED, alignment=TA_CENTER, spaceAfter=10, leading=11)
S_TOC = s('TOC', fontSize=11, textColor=GRAY_DARK, leading=20, spaceBefore=2, spaceAfter=2)
S_TOC_SUB = s('TOCSub', fontSize=10, textColor=GRAY_MED, leading=18, leftIndent=20)
S_FOOTER = s('Footer', fontSize=8, textColor=GRAY_MED, alignment=TA_CENTER)
S_TBL_H = s('TblH', fontSize=9, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_CENTER, leading=12)
S_TBL_C = s('TblC', fontSize=9, textColor=GRAY_DARK, leading=12, alignment=TA_LEFT)

chapter_num = [0]

def chapter(title):
    chapter_num[0] += 1
    return Paragraph(f"{chapter_num[0]}. {title}", S_CH_TITLE)

def section(title, num=""):
    return Paragraph(f"{num} {title}" if num else title, S_SEC_TITLE)

def subsec(title):
    return Paragraph(title, S_SUBSEC)

def body(text):
    return Paragraph(text, S_BODY)

def bold_body(text):
    return Paragraph(text, S_BODY_BOLD)

def note(text):
    return Paragraph(f"<b>NOTA:</b> {text}", S_NOTE)

def warn(text):
    return Paragraph(f"<b>IMPORTANTE:</b> {text}", S_WARN)

def tip(text):
    return Paragraph(f"<b>DICA:</b> {text}", S_NOTE)

def code_block(lines):
    elems = []
    for l in lines:
        l_safe = l.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        elems.append(Paragraph(l_safe, S_CODE))
    return elems

def caption(text):
    return Paragraph(text, S_CAPTION)

def hr():
    return HRFlowable(width="100%", thickness=1, color=GRAY_LIGHT, spaceAfter=10, spaceBefore=5)

def spacer(h=0.3):
    return Spacer(1, h * cm)

def make_table(headers, rows, col_widths=None):
    data = [[Paragraph(h, S_TBL_H) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), S_TBL_C) for c in row])
    
    if col_widths is None:
        available = PAGE_W - 2 * MARGIN
        col_widths = [available / len(headers)] * len(headers)
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), BLUE_DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_LIGHT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        bg = GRAY_PALE if i % 2 == 0 else WHITE
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def info_box(title, text, color=BLUE_LIGHT, border=BLUE_MED):
    data = [[Paragraph(f"<b>{title}</b>", ParagraphStyle('bx_t', fontSize=10, textColor=border, fontName='Helvetica-Bold', leading=14)),],
            [Paragraph(text, ParagraphStyle('bx_b', fontSize=9, textColor=GRAY_DARK, leading=13))]]
    t = Table(data, colWidths=[PAGE_W - 2 * MARGIN - 10])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), color),
        ('BOX', (0, 0), (-1, -1), 1.5, border),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    return t

def checklist_table(items):
    data = []
    for item in items:
        data.append([Paragraph("&#9744;", ParagraphStyle('chk', fontSize=14, leading=16)),
                      Paragraph(item, S_TBL_C)])
    t = Table(data, colWidths=[1.2*cm, PAGE_W - 2*MARGIN - 1.5*cm])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, GRAY_LIGHT),
    ]))
    return t

def draw_arch_diagram():
    d = Drawing(480, 340)
    
    d.add(Rect(0, 0, 480, 340, fillColor=HexColor("#f0f5ff"), strokeColor=BLUE_MED, strokeWidth=1.5, rx=8))
    d.add(String(200, 320, "Arquitetura AWS - Bennu Finance", fontSize=12, fontName='Helvetica-Bold', fillColor=BLUE_DARK))
    
    def box(x, y, w, h, label, sub="", color=BLUE_LIGHT, border=BLUE_MED):
        d.add(Rect(x, y, w, h, fillColor=color, strokeColor=border, strokeWidth=1, rx=4))
        d.add(String(x + w/2 - len(label)*3, y + h/2 + 4 - (6 if sub else 0), label, fontSize=9, fontName='Helvetica-Bold', fillColor=BLUE_DARK))
        if sub:
            d.add(String(x + w/2 - len(sub)*2.8, y + h/2 - 10, sub, fontSize=7, fillColor=GRAY_MED))
    
    def arrow(x1, y1, x2, y2):
        d.add(Line(x1, y1, x2, y2, strokeColor=GRAY_MED, strokeWidth=1.5))
        d.add(Polygon(points=[x2, y2, x2-4, y2+6, x2+4, y2+6], fillColor=GRAY_MED, strokeColor=GRAY_MED))
    
    box(30, 270, 90, 35, "Route 53", "DNS", HexColor("#e6fffa"), HexColor("#319795"))
    box(155, 270, 90, 35, "CloudFront", "CDN", HexColor("#e6fffa"), HexColor("#319795"))
    box(280, 270, 90, 35, "ALB", "Load Balancer", HexColor("#e6fffa"), HexColor("#319795"))
    
    arrow(120, 287, 155, 287)
    arrow(245, 287, 280, 287)
    
    d.add(Rect(180, 165, 220, 80, fillColor=ORANGE_LIGHT, strokeColor=ORANGE, strokeWidth=1, rx=4))
    d.add(String(240, 225, "ECS Fargate", fontSize=10, fontName='Helvetica-Bold', fillColor=HexColor("#c05621")))
    box(195, 175, 80, 35, "Task 1", "FastAPI", HexColor("#fefcbf"), ORANGE)
    box(305, 175, 80, 35, "Task 2", "FastAPI", HexColor("#fefcbf"), ORANGE)
    
    arrow(325, 270, 290, 245)
    
    d.add(Rect(180, 60, 220, 70, fillColor=GREEN_LIGHT, strokeColor=GREEN, strokeWidth=1, rx=4))
    d.add(String(230, 110, "Amazon RDS", fontSize=10, fontName='Helvetica-Bold', fillColor=HexColor("#276749")))
    d.add(String(210, 92, "PostgreSQL 15.x (Multi-AZ)", fontSize=8, fillColor=GRAY_MED))
    box(200, 68, 70, 25, "Primario", "", HexColor("#c6f6d5"), GREEN)
    box(310, 68, 70, 25, "Standby", "", HexColor("#c6f6d5"), GREEN)
    arrow(270, 80, 310, 80)
    
    arrow(290, 165, 290, 130)
    
    box(20, 60, 90, 35, "Cognito", "Auth Google", HexColor("#e9d8fd"), HexColor("#805ad5"))
    box(20, 165, 90, 35, "S3", "Backups", HexColor("#feebc8"), ORANGE)
    box(410, 165, 60, 35, "CW Logs", "Monitor", RED_LIGHT, RED)
    box(410, 60, 60, 35, "Secrets", "Manager", HexColor("#e9d8fd"), HexColor("#805ad5"))
    
    d.add(Rect(5, 5, 470, 30, fillColor=BLUE_PALE, strokeColor=None))
    d.add(String(120, 14, "VPC 10.0.0.0/16  |  Subnets Publicas + Privadas  |  Security Groups", fontSize=8, fillColor=GRAY_MED))
    
    return d

def draw_flow_diagram():
    d = Drawing(480, 180)
    
    colors = [HexColor("#319795"), BLUE_MED, ORANGE, GREEN, HexColor("#805ad5")]
    labels = ["1. Provisionar\nInfra AWS", "2. Criar Banco\nRDS + Schema", "3. Build Docker\n+ Push ECR", "4. Deploy ECS\nFargate", "5. Cognito\n+ DNS + SSL"]
    
    for i, (label, color) in enumerate(zip(labels, colors)):
        x = 10 + i * 96
        d.add(Rect(x, 60, 82, 60, fillColor=color, strokeColor=None, rx=6))
        lines = label.split("\n")
        d.add(String(x + 41 - len(lines[0])*3, 100, lines[0], fontSize=8, fontName='Helvetica-Bold', fillColor=WHITE))
        d.add(String(x + 41 - len(lines[1])*3, 86, lines[1], fontSize=7, fillColor=HexColor("#e2e8f0")))
        d.add(Circle(x + 41, 140, 14, fillColor=WHITE, strokeColor=color, strokeWidth=2))
        d.add(String(x + 38, 134, str(i+1), fontSize=12, fontName='Helvetica-Bold', fillColor=color))
        if i < 4:
            d.add(Line(x + 82, 90, x + 96, 90, strokeColor=GRAY_MED, strokeWidth=1.5))
            d.add(Polygon(points=[x+96, 90, x+91, 94, x+91, 86], fillColor=GRAY_MED))
    
    d.add(String(130, 30, "Tempo estimado: 3 a 5 horas para profissional experiente", fontSize=9, fillColor=GRAY_MED))
    
    return d

def draw_sg_diagram():
    d = Drawing(460, 140)
    
    def sg_box(x, y, w, h, title, rules, color, border):
        d.add(Rect(x, y, w, h, fillColor=color, strokeColor=border, strokeWidth=1.5, rx=4))
        d.add(String(x + 8, y + h - 16, title, fontSize=9, fontName='Helvetica-Bold', fillColor=border))
        for i, rule in enumerate(rules):
            d.add(String(x + 8, y + h - 30 - i*12, rule, fontSize=7, fillColor=GRAY_DARK))
    
    sg_box(5, 10, 140, 120, "SG: ALB", ["IN: 80/443 (0.0.0.0/0)", "OUT: 5000 (ECS SG)"], BLUE_PALE, BLUE_MED)
    sg_box(165, 10, 140, 120, "SG: ECS", ["IN: 5000 (ALB SG)", "OUT: 5432 (RDS SG)", "OUT: 443 (Internet)"], ORANGE_LIGHT, ORANGE)
    sg_box(325, 10, 130, 120, "SG: RDS", ["IN: 5432 (ECS SG)", "OUT: Nenhuma"], GREEN_LIGHT, GREEN)
    
    d.add(Line(145, 70, 165, 70, strokeColor=GRAY_MED, strokeWidth=1.5))
    d.add(Polygon(points=[165, 70, 160, 74, 160, 66], fillColor=GRAY_MED))
    d.add(Line(305, 70, 325, 70, strokeColor=GRAY_MED, strokeWidth=1.5))
    d.add(Polygon(points=[325, 70, 320, 74, 320, 66], fillColor=GRAY_MED))
    
    return d

def draw_cost_chart():
    d = Drawing(400, 200)
    
    bc = VerticalBarChart()
    bc.x = 60
    bc.y = 40
    bc.height = 130
    bc.width = 300
    bc.data = [[150, 140, 25, 20, 10, 3]]
    bc.categoryAxis.categoryNames = ['ECS\nFargate', 'RDS\nPostgres', 'ALB', 'Cloud\nWatch', 'Cloud\nFront', 'S3+R53']
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = 160
    bc.valueAxis.valueStep = 40
    bc.valueAxis.labels.fontSize = 7
    bc.categoryAxis.labels.fontSize = 7
    bc.bars[0].fillColor = BLUE_MED
    bc.bars[0].strokeColor = None
    bc.barWidth = 30
    bc.groupSpacing = 15
    
    d.add(bc)
    d.add(String(100, 185, "Estimativa de Custos Mensais AWS (USD)", fontSize=10, fontName='Helvetica-Bold', fillColor=GRAY_DARK))
    d.add(String(310, 40, "Total: ~$350/mes", fontSize=9, fontName='Helvetica-Bold', fillColor=ORANGE))
    
    return d

def numbered_steps(steps):
    elems = []
    for i, step in enumerate(steps, 1):
        data = [[Paragraph(f"<b>{i}</b>", ParagraphStyle('sn', fontSize=11, textColor=WHITE, alignment=TA_CENTER, fontName='Helvetica-Bold')),
                 Paragraph(step, ParagraphStyle('st', fontSize=9.5, textColor=GRAY_DARK, leading=14))]]
        t = Table(data, colWidths=[0.9*cm, PAGE_W - 2*MARGIN - 1.2*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), BLUE_MED),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (1,0), (1,0), 10),
        ]))
        elems.append(t)
        elems.append(spacer(0.15))
    return elems

def page_header_footer(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.setFillColor(GRAY_MED)
    canvas_obj.drawString(MARGIN, PAGE_H - 1.2*cm, "Bennu Finance - Guia de Instalacao e Configuracao AWS")
    canvas_obj.drawRightString(PAGE_W - MARGIN, PAGE_H - 1.2*cm, "Documento Tecnico v1.0")
    canvas_obj.setStrokeColor(GRAY_LIGHT)
    canvas_obj.line(MARGIN, PAGE_H - 1.4*cm, PAGE_W - MARGIN, PAGE_H - 1.4*cm)
    canvas_obj.drawCentredString(PAGE_W / 2, 1*cm, f"Pagina {doc.page}")
    canvas_obj.line(MARGIN, 1.5*cm, PAGE_W - MARGIN, 1.5*cm)
    canvas_obj.restoreState()

def first_page(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFillColor(BLUE_DARK)
    canvas_obj.rect(0, 0, PAGE_W, PAGE_H, fill=1)
    canvas_obj.setFillColor(HexColor("#2a4365"))
    canvas_obj.rect(0, PAGE_H * 0.35, PAGE_W, PAGE_H * 0.65, fill=1)
    for i in range(5):
        canvas_obj.setStrokeColor(HexColor("#2c5282"))
        canvas_obj.setLineWidth(0.3)
        canvas_obj.line(0, PAGE_H * 0.35 + i * 40, PAGE_W, PAGE_H * 0.35 + i * 40 + 100)
    canvas_obj.setFillColor(ORANGE)
    canvas_obj.rect(PAGE_W * 0.1, PAGE_H * 0.52, PAGE_W * 0.8, 3, fill=1)
    canvas_obj.restoreState()

def build_pdf():
    filename = "Bennu_Finance_Guia_AWS.pdf"
    doc = SimpleDocTemplate(
        filename, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=2.2*cm, bottomMargin=2*cm
    )
    
    story = []
    
    story.append(Spacer(1, 6*cm))
    story.append(Paragraph("BENNU FINANCE", S_COVER_TITLE))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Guia de Instalacao e Configuracao AWS", S_COVER_SUB))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("Documento Tecnico para Setup do Ambiente de Producao", S_COVER_VER))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("Versao 1.0  |  Fevereiro 2026", S_COVER_VER))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("Classificacao: Uso Interno - Equipe de TI", S_COVER_VER))
    
    story.append(PageBreak())
    
    story.append(Paragraph("Sumario", ParagraphStyle('TocTitle', fontSize=22, textColor=BLUE_DARK, fontName='Helvetica-Bold', spaceAfter=20)))
    story.append(hr())
    
    toc_items = [
        ("1.", "Introducao e Objetivo"),
        ("2.", "Pre-requisitos"),
        ("3.", "Visao Geral da Arquitetura"),
        ("4.", "Etapa 1 - Provisionamento da Infraestrutura"),
        ("5.", "Etapa 2 - Banco de Dados (RDS PostgreSQL)"),
        ("6.", "Etapa 3 - Containerizacao (Docker + ECR)"),
        ("7.", "Etapa 4 - Deploy (ECS Fargate + ALB)"),
        ("8.", "Etapa 5 - Autenticacao (Cognito + Google)"),
        ("9.", "Etapa 6 - DNS, SSL e CDN"),
        ("10.", "Variaveis de Ambiente e Secrets"),
        ("11.", "Monitoramento e Alarmes"),
        ("12.", "Backup e Restore"),
        ("13.", "Deploy de Novas Versoes"),
        ("14.", "Checklist de Validacao"),
        ("15.", "Troubleshooting"),
        ("16.", "Estimativa de Custos"),
        ("17.", "Referencias e Links Uteis"),
        ("18.", "Glossario"),
    ]
    for num, title in toc_items:
        story.append(Paragraph(f"<b>{num}</b>  {title}", S_TOC))
    
    story.append(PageBreak())
    
    # === CAPITULO 1 ===
    story.append(chapter("Introducao e Objetivo"))
    story.append(hr())
    story.append(body("Este documento orienta a equipe tecnica responsavel pela implantacao do sistema <b>Bennu Finance</b> em ambiente de producao na <b>Amazon Web Services (AWS)</b>. Ele foi elaborado como complemento ao pacote ZIP contendo o codigo-fonte da aplicacao."))
    story.append(spacer())
    story.append(body("O guia cobre todas as etapas necessarias, desde o provisionamento da infraestrutura ate a validacao final do sistema em producao. Cada etapa esta detalhada com comandos prontos para execucao, diagramas explicativos e notas de contexto para facilitar o entendimento."))
    story.append(spacer())
    story.append(info_box("Sobre o Bennu Finance",
        "Sistema de gestao financeira multi-empresa desenvolvido em Python (FastAPI) com banco PostgreSQL. "
        "Oferece controle de receitas/despesas, categorizacao dual (contabil e gerencial com subcategorias), "
        "planejamento orcamentario, relatorios P&amp;L, Cash Flow e Cash Control. Interface web otimizada "
        "para telas 1920x1080 com renderizacao server-side (Jinja2 + Bootstrap 5)."))
    story.append(spacer())
    story.append(subsec("Fluxo Geral de Implantacao"))
    story.append(body("A implantacao segue 5 etapas principais, executadas em sequencia:"))
    story.append(spacer(0.3))
    story.append(draw_flow_diagram())
    story.append(caption("Figura 1 - Fluxo sequencial das etapas de implantacao"))
    
    story.append(spacer())
    story.append(info_box("Publico-Alvo",
        "Profissional de TI com conhecimento basico em AWS (console ou CLI), Docker e PostgreSQL. "
        "Nao e necessario conhecimento do codigo-fonte da aplicacao para executar este guia.",
        GREEN_LIGHT, GREEN))
    
    story.append(PageBreak())
    
    # === CAPITULO 2 ===
    story.append(chapter("Pre-requisitos"))
    story.append(hr())
    story.append(body("Antes de iniciar, assegure-se de que as ferramentas abaixo estejam instaladas e configuradas na estacao de trabalho que sera usada para executar os comandos:"))
    story.append(spacer())
    
    story.append(make_table(
        ["Ferramenta", "Versao Minima", "Finalidade", "Como Verificar"],
        [
            ["AWS CLI", ">= 2.x", "Comandos de provisionamento AWS", "aws --version"],
            ["Docker", ">= 24.x", "Build da imagem do container", "docker --version"],
            ["psql (PostgreSQL Client)", ">= 14.x", "Execucao do script SQL no RDS", "psql --version"],
            ["Python", ">= 3.11", "Runtime da aplicacao (testes locais)", "python --version"],
            ["Git", ">= 2.x", "Controle de versao (opcional)", "git --version"],
        ],
        [3*cm, 2.5*cm, 5*cm, 4*cm]
    ))
    story.append(caption("Tabela 1 - Ferramentas necessarias e versoes minimas"))
    
    story.append(spacer())
    story.append(subsec("Credenciais AWS"))
    story.append(body("O perfil IAM utilizado deve possuir permissoes para os seguintes servicos:"))
    story.append(spacer(0.2))
    cols = [
        ["EC2 / VPC", "Criar VPC, subnets, security groups, internet gateway, NAT gateway"],
        ["RDS", "Criar instancias PostgreSQL, subnet groups, snapshots"],
        ["ECS", "Criar clusters, task definitions, services"],
        ["ECR", "Criar repositorios, push de imagens Docker"],
        ["ELB", "Criar Application Load Balancers, target groups, listeners"],
        ["Cognito", "Criar user pools, identity providers, app clients"],
        ["S3", "Criar buckets para backups"],
        ["CloudWatch", "Criar log groups, alarmes, metricas"],
        ["ACM", "Solicitar certificados SSL"],
        ["Route 53", "Gerenciar hosted zones e registros DNS"],
        ["Secrets Manager", "Criar e gerenciar secrets"],
        ["IAM", "Criar roles e policies para ECS"],
    ]
    story.append(make_table(["Servico AWS", "Permissoes Necessarias"], cols, [4*cm, 11*cm]))
    story.append(caption("Tabela 2 - Permissoes IAM necessarias por servico"))
    
    story.append(spacer())
    story.append(warn("Nunca utilize a conta root da AWS para operacoes diarias. Crie um usuario IAM dedicado com as permissoes acima e habilite MFA (autenticacao multi-fator)."))
    
    story.append(spacer())
    story.append(subsec("Estrutura do Pacote ZIP"))
    story.append(body("O ZIP entregue contem a seguinte estrutura de diretorios:"))
    story.append(spacer(0.2))
    for line in code_block([
        "bennu-finance.zip",
        "  app/                     # Codigo-fonte da aplicacao",
        "    auth/                  # Modulo de autenticacao OAuth/OIDC",
        "    middleware/            # Middlewares (auditoria, sessoes)",
        "    models/                # Modelos SQLAlchemy (50+ tabelas)",
        "    routes/                # Endpoints da API (FastAPI)",
        "    services/              # Logica de negocio",
        "    static/                # Assets (CSS, JS, imagens)",
        "    templates/             # Templates Jinja2 (HTML)",
        "    database.py            # Configuracao de conexao ao banco",
        "    main.py                # Entry point da aplicacao",
        "  sql/",
        "    create_database.sql    # Script completo de criacao do banco",
        "  pyproject.toml           # Dependencias Python",
        "  GUIA_INSTALACAO_AWS.md   # Versao texto deste guia",
        "  MEMORIAL_DESCRITIVO.md   # Documentacao funcional completa",
    ]):
        story.append(line)
    
    story.append(PageBreak())
    
    # === CAPITULO 3 ===
    story.append(chapter("Visao Geral da Arquitetura"))
    story.append(hr())
    story.append(body("O diagrama abaixo ilustra a arquitetura completa do sistema na AWS. Cada componente sera provisionado nas etapas seguintes deste guia."))
    story.append(spacer())
    story.append(draw_arch_diagram())
    story.append(caption("Figura 2 - Arquitetura completa do Bennu Finance na AWS"))
    story.append(spacer())
    
    story.append(subsec("Descricao dos Componentes"))
    story.append(make_table(
        ["Componente", "Servico AWS", "Funcao"],
        [
            ["DNS", "Route 53", "Resolucao do dominio para o CloudFront/ALB"],
            ["CDN", "CloudFront", "Cache e distribuicao de assets estaticos (CSS, JS, imagens)"],
            ["Load Balancer", "ALB", "Distribui trafego entre tasks ECS, SSL termination"],
            ["Aplicacao", "ECS Fargate", "Executa containers Docker com FastAPI (sem gerenciar servidores)"],
            ["Banco de Dados", "RDS PostgreSQL", "Banco gerenciado Multi-AZ com backup automatico"],
            ["Autenticacao", "Cognito", "Login Google via OAuth 2.0 / OpenID Connect"],
            ["Backups", "S3", "Armazenamento de backups manuais e exportacoes"],
            ["Monitoramento", "CloudWatch", "Logs da aplicacao, metricas de CPU/memoria, alarmes"],
            ["Credenciais", "Secrets Manager", "Armazenamento seguro de senhas e chaves de API"],
        ],
        [3*cm, 3*cm, 9*cm]
    ))
    story.append(caption("Tabela 3 - Componentes da arquitetura e suas funcoes"))
    
    story.append(spacer())
    story.append(subsec("Diagrama de Security Groups"))
    story.append(body("Os Security Groups controlam o trafego de rede entre os componentes. Funcionam como firewalls virtuais:"))
    story.append(spacer(0.3))
    story.append(draw_sg_diagram())
    story.append(caption("Figura 3 - Fluxo de trafego entre Security Groups"))
    story.append(spacer())
    story.append(note("O principio de <b>menor privilegio</b> e aplicado: cada componente so aceita conexoes do componente anterior na cadeia. O banco de dados (RDS) nunca e acessivel diretamente da internet."))
    
    story.append(PageBreak())
    
    # === CAPITULO 4 ===
    story.append(chapter("Etapa 1 - Provisionamento da Infraestrutura"))
    story.append(hr())
    story.append(body("Nesta etapa, criaremos a rede virtual (VPC), subnets, gateways e security groups que formam a base da infraestrutura."))
    story.append(spacer())
    
    story.append(info_box("O que e uma VPC?",
        "VPC (Virtual Private Cloud) e uma rede virtual isolada dentro da AWS. Pense nela como a 'rede interna' "
        "do seu datacenter, mas na nuvem. Dentro da VPC, criamos subnets (sub-redes) publicas e privadas "
        "para separar componentes que precisam ou nao de acesso direto a internet.",
        BLUE_PALE, BLUE_MED))
    
    story.append(spacer())
    story.append(subsec("4.1 Criar a VPC"))
    for line in code_block([
        "# Criar a VPC com bloco CIDR 10.0.0.0/16 (65.536 IPs disponiveis)",
        "aws ec2 create-vpc \\",
        "  --cidr-block 10.0.0.0/16 \\",
        "  --tag-specifications \\",
        "    'ResourceType=vpc,Tags=[{Key=Name,Value=bennu-vpc}]'",
        "",
        "# ANOTE o VpcId retornado (formato: vpc-0abc123def456789)",
    ]):
        story.append(line)
    story.append(tip("Anote todos os IDs retornados pelos comandos (VPC ID, Subnet IDs, etc). Voce precisara deles nas etapas seguintes."))
    
    story.append(spacer())
    story.append(subsec("4.2 Criar Subnets"))
    story.append(body("Precisamos de 4 subnets em 2 zonas de disponibilidade (AZs) diferentes para alta disponibilidade:"))
    story.append(spacer(0.2))
    story.append(make_table(
        ["Subnet", "CIDR", "AZ", "Tipo", "Uso"],
        [
            ["bennu-public-1a", "10.0.1.0/24", "us-east-1a", "Publica", "ALB, NAT Gateway"],
            ["bennu-public-1b", "10.0.2.0/24", "us-east-1b", "Publica", "ALB (redundancia)"],
            ["bennu-private-1a", "10.0.3.0/24", "us-east-1a", "Privada", "ECS, RDS"],
            ["bennu-private-1b", "10.0.4.0/24", "us-east-1b", "Privada", "ECS, RDS (redundancia)"],
        ],
        [3.2*cm, 2.5*cm, 2.5*cm, 2*cm, 4.5*cm]
    ))
    story.append(caption("Tabela 4 - Configuracao das subnets"))
    story.append(spacer(0.2))
    for line in code_block([
        "# Subnets Publicas",
        "aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.1.0/24 \\",
        "  --availability-zone us-east-1a \\",
        "  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=bennu-public-1a}]'",
        "",
        "aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.2.0/24 \\",
        "  --availability-zone us-east-1b \\",
        "  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=bennu-public-1b}]'",
        "",
        "# Subnets Privadas",
        "aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.3.0/24 \\",
        "  --availability-zone us-east-1a \\",
        "  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=bennu-private-1a}]'",
        "",
        "aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.4.0/24 \\",
        "  --availability-zone us-east-1b \\",
        "  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=bennu-private-1b}]'",
    ]):
        story.append(line)
    
    story.append(spacer())
    story.append(subsec("4.3 Internet Gateway e NAT Gateway"))
    story.append(info_box("Internet Gateway vs NAT Gateway",
        "<b>Internet Gateway (IGW)</b>: Permite que recursos em subnets publicas acessem e sejam acessados pela internet. "
        "Exemplo: o ALB precisa receber trafego de usuarios.<br/><br/>"
        "<b>NAT Gateway</b>: Permite que recursos em subnets privadas acessem a internet (para baixar atualizacoes, etc) "
        "sem serem acessiveis de fora. Exemplo: tasks ECS precisam baixar imagens Docker do ECR.",
        ORANGE_LIGHT, ORANGE))
    story.append(spacer(0.2))
    for line in code_block([
        "# Internet Gateway",
        "aws ec2 create-internet-gateway \\",
        "  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=bennu-igw}]'",
        "aws ec2 attach-internet-gateway --internet-gateway-id <IGW_ID> --vpc-id <VPC_ID>",
        "",
        "# Elastic IP para o NAT Gateway",
        "aws ec2 allocate-address --domain vpc",
        "",
        "# NAT Gateway (na subnet publica)",
        "aws ec2 create-nat-gateway --subnet-id <PUBLIC_SUBNET_1A_ID> \\",
        "  --allocation-id <EIP_ALLOC_ID>",
    ]):
        story.append(line)
    
    story.append(spacer())
    story.append(subsec("4.4 Route Tables"))
    story.append(body("Configure as tabelas de rotas para direcionar o trafego corretamente:"))
    story.append(spacer(0.2))
    story.append(make_table(
        ["Route Table", "Destino", "Alvo", "Subnets Associadas"],
        [
            ["bennu-public-rt", "0.0.0.0/0", "Internet Gateway", "bennu-public-1a, bennu-public-1b"],
            ["bennu-private-rt", "0.0.0.0/0", "NAT Gateway", "bennu-private-1a, bennu-private-1b"],
        ],
        [3.5*cm, 2.5*cm, 3.5*cm, 5.5*cm]
    ))
    story.append(caption("Tabela 5 - Configuracao das Route Tables"))
    
    story.append(spacer())
    story.append(subsec("4.5 Security Groups"))
    story.append(body("Crie os 3 security groups conforme o diagrama da Figura 3:"))
    story.append(spacer(0.2))
    for line in code_block([
        "# SG para ALB (acesso publico nas portas 80 e 443)",
        "aws ec2 create-security-group --group-name bennu-alb-sg \\",
        "  --description 'ALB Security Group' --vpc-id <VPC_ID>",
        "aws ec2 authorize-security-group-ingress --group-id <ALB_SG_ID> \\",
        "  --protocol tcp --port 80 --cidr 0.0.0.0/0",
        "aws ec2 authorize-security-group-ingress --group-id <ALB_SG_ID> \\",
        "  --protocol tcp --port 443 --cidr 0.0.0.0/0",
        "",
        "# SG para ECS (acesso apenas do ALB na porta 5000)",
        "aws ec2 create-security-group --group-name bennu-ecs-sg \\",
        "  --description 'ECS Security Group' --vpc-id <VPC_ID>",
        "aws ec2 authorize-security-group-ingress --group-id <ECS_SG_ID> \\",
        "  --protocol tcp --port 5000 --source-group <ALB_SG_ID>",
        "",
        "# SG para RDS (acesso apenas do ECS na porta 5432)",
        "aws ec2 create-security-group --group-name bennu-rds-sg \\",
        "  --description 'RDS Security Group' --vpc-id <VPC_ID>",
        "aws ec2 authorize-security-group-ingress --group-id <RDS_SG_ID> \\",
        "  --protocol tcp --port 5432 --source-group <ECS_SG_ID>",
    ]):
        story.append(line)
    
    story.append(PageBreak())
    
    # === CAPITULO 5 ===
    story.append(chapter("Etapa 2 - Banco de Dados (RDS PostgreSQL)"))
    story.append(hr())
    story.append(body("O Amazon RDS gerencia o banco de dados PostgreSQL automaticamente, incluindo backups, patches de seguranca e failover Multi-AZ."))
    story.append(spacer())
    
    story.append(info_box("O que e Multi-AZ?",
        "Multi-AZ significa que a AWS mantem uma copia sincronizada do banco em outra zona de disponibilidade. "
        "Se a zona principal falhar, o failover e automatico (geralmente em menos de 60 segundos). "
        "Voce nao precisa fazer nada - a AWS cuida de tudo.",
        GREEN_LIGHT, GREEN))
    
    story.append(spacer())
    story.append(subsec("5.1 Criar Subnet Group"))
    for line in code_block([
        "aws rds create-db-subnet-group \\",
        "  --db-subnet-group-name bennu-db-subnet \\",
        "  --db-subnet-group-description 'Bennu DB Subnets' \\",
        "  --subnet-ids <PRIVATE_SUBNET_1A_ID> <PRIVATE_SUBNET_1B_ID>",
    ]):
        story.append(line)
    
    story.append(spacer())
    story.append(subsec("5.2 Criar Instancia RDS"))
    for line in code_block([
        "aws rds create-db-instance \\",
        "  --db-instance-identifier bennu-finance-db \\",
        "  --db-instance-class db.t3.medium \\",
        "  --engine postgres --engine-version 15.4 \\",
        "  --master-username bennu_admin \\",
        "  --master-user-password '<SENHA_FORTE_AQUI>' \\",
        "  --allocated-storage 50 --storage-type gp3 \\",
        "  --multi-az \\",
        "  --db-subnet-group-name bennu-db-subnet \\",
        "  --vpc-security-group-ids <RDS_SG_ID> \\",
        "  --db-name bennu_finance \\",
        "  --backup-retention-period 7 \\",
        "  --preferred-backup-window '03:00-04:00' \\",
        "  --no-publicly-accessible \\",
        "  --storage-encrypted",
    ]):
        story.append(line)
    story.append(spacer(0.2))
    story.append(warn("Use uma senha forte (minimo 16 caracteres, com maiusculas, minusculas, numeros e simbolos). Esta senha sera armazenada no Secrets Manager na Etapa 10."))
    story.append(note("A criacao do RDS leva de 5 a 15 minutos. Aguarde o status mudar para 'available' antes de prosseguir."))
    
    story.append(spacer())
    story.append(subsec("5.3 Executar Script SQL"))
    story.append(body("Apos o RDS estar disponivel, execute o script de criacao do banco. Como o RDS esta em subnet privada, voce precisara de um <b>bastion host</b> ou <b>VPN</b> para acessa-lo:"))
    story.append(spacer(0.2))
    for line in code_block([
        "# Obter o endpoint do RDS",
        "aws rds describe-db-instances \\",
        "  --db-instance-identifier bennu-finance-db \\",
        "  --query 'DBInstances[0].Endpoint.Address' --output text",
        "",
        "# Executar script de criacao (via bastion host ou VPN)",
        "psql -h <RDS_ENDPOINT> -U bennu_admin -d bennu_finance \\",
        "  -f sql/create_database.sql",
    ]):
        story.append(line)
    
    story.append(spacer())
    story.append(subsec("5.4 Migrar Dados Existentes (Opcional)"))
    story.append(body("Se houver dados no ambiente atual que precisam ser migrados:"))
    story.append(spacer(0.2))
    for line in code_block([
        "# Exportar dados do ambiente de origem",
        "pg_dump -h <HOST_ORIGEM> -U <USER_ORIGEM> -d <DB_ORIGEM> \\",
        "  --data-only --no-owner --no-privileges -f dados_export.sql",
        "",
        "# Importar no RDS de producao",
        "psql -h <RDS_ENDPOINT> -U bennu_admin -d bennu_finance \\",
        "  -f dados_export.sql",
    ]):
        story.append(line)
    story.append(tip("Execute a importacao em horario de baixo uso. Para bancos grandes, considere usar <b>pg_dump</b> com formato custom (-Fc) e <b>pg_restore</b> com paralelismo (-j 4)."))
    
    story.append(PageBreak())
    
    # === CAPITULO 6 ===
    story.append(chapter("Etapa 3 - Containerizacao (Docker + ECR)"))
    story.append(hr())
    story.append(info_box("O que e um Container Docker?",
        "Container e uma forma de empacotar a aplicacao com todas as suas dependencias (Python, bibliotecas, etc) "
        "em uma 'caixa' portatil. Isso garante que a aplicacao rode exatamente igual em qualquer ambiente. "
        "O ECR (Elastic Container Registry) e o 'repositorio' da AWS onde armazenamos essas imagens.",
        BLUE_PALE, BLUE_MED))
    
    story.append(spacer())
    story.append(subsec("6.1 Criar Dockerfile"))
    story.append(body("Crie o arquivo <b>Dockerfile</b> na raiz do projeto com o conteudo abaixo:"))
    story.append(spacer(0.2))
    for line in code_block([
        "FROM python:3.11-slim",
        "",
        "WORKDIR /app",
        "",
        "RUN apt-get update && apt-get install -y --no-install-recommends \\",
        "    libpq-dev gcc && rm -rf /var/lib/apt/lists/*",
        "",
        "COPY pyproject.toml ./",
        "RUN pip install --no-cache-dir .",
        "",
        "COPY app/ ./app/",
        "",
        "EXPOSE 5000",
        "ENV PYTHONUNBUFFERED=1",
        "",
        'CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0",',
        '     "--port", "5000", "--workers", "4"]',
    ]):
        story.append(line)
    
    story.append(spacer())
    story.append(subsec("6.2 Criar Repositorio ECR"))
    for line in code_block([
        "aws ecr create-repository --repository-name bennu-finance \\",
        "  --image-scanning-configuration scanOnPush=true",
    ]):
        story.append(line)
    
    story.append(spacer())
    story.append(subsec("6.3 Build e Push da Imagem"))
    for line in code_block([
        "# Login no ECR",
        "aws ecr get-login-password --region us-east-1 | \\",
        "  docker login --username AWS --password-stdin \\",
        "  <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com",
        "",
        "# Build da imagem",
        "docker build -t bennu-finance .",
        "",
        "# Tag com o endereco ECR",
        "docker tag bennu-finance:latest \\",
        "  <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bennu-finance:latest",
        "",
        "# Push para o ECR",
        "docker push \\",
        "  <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bennu-finance:latest",
    ]):
        story.append(line)
    story.append(tip("O <b>ACCOUNT_ID</b> e o numero de 12 digitos da sua conta AWS. Encontre-o em: aws sts get-caller-identity --query Account"))
    
    story.append(PageBreak())
    
    # === CAPITULO 7 ===
    story.append(chapter("Etapa 4 - Deploy (ECS Fargate + ALB)"))
    story.append(hr())
    story.append(info_box("O que e ECS Fargate?",
        "ECS (Elastic Container Service) executa seus containers Docker. Com <b>Fargate</b>, voce nao precisa "
        "gerenciar servidores - a AWS provisiona e escala a infraestrutura automaticamente. Voce so define "
        "quanto de CPU e memoria cada container precisa.",
        ORANGE_LIGHT, ORANGE))
    
    story.append(spacer())
    story.append(subsec("7.1 Criar IAM Role para ECS"))
    story.append(body("O ECS precisa de permissoes para puxar imagens do ECR e ler secrets:"))
    story.append(spacer(0.2))
    for line in code_block([
        "# Criar Execution Role",
        "aws iam create-role --role-name bennu-ecs-execution-role \\",
        "  --assume-role-policy-document '{",
        '    "Version": "2012-10-17",',
        '    "Statement": [{',
        '      "Effect": "Allow",',
        '      "Principal": {"Service": "ecs-tasks.amazonaws.com"},',
        '      "Action": "sts:AssumeRole"',
        "    }]",
        "  }'",
        "",
        "# Anexar policy padrao do ECS",
        "aws iam attach-role-policy \\",
        "  --role-name bennu-ecs-execution-role \\",
        "  --policy-arn arn:aws:iam::aws:policy/service-role/\\",
        "    AmazonECSTaskExecutionRolePolicy",
        "",
        "# Adicionar acesso ao Secrets Manager",
        "aws iam put-role-policy --role-name bennu-ecs-execution-role \\",
        "  --policy-name SecretsAccess --policy-document '{",
        '    "Version": "2012-10-17",',
        '    "Statement": [{',
        '      "Effect": "Allow",',
        '      "Action": ["secretsmanager:GetSecretValue"],',
        '      "Resource": "arn:aws:secretsmanager:us-east-1:',
        '        <ACCOUNT_ID>:secret:bennu-finance/*"',
        "    }]",
        "  }'",
    ]):
        story.append(line)
    
    story.append(spacer())
    story.append(subsec("7.2 Criar Task Definition"))
    story.append(body("A Task Definition descreve como o container deve ser executado. Crie o arquivo <b>task-definition.json</b>:"))
    story.append(spacer(0.2))
    story.append(make_table(
        ["Parametro", "Valor", "Explicacao"],
        [
            ["cpu", "2048 (2 vCPUs)", "Capacidade de processamento por task"],
            ["memory", "4096 (4 GB)", "Memoria RAM por task"],
            ["containerPort", "5000", "Porta onde o FastAPI escuta"],
            ["desiredCount", "2", "Numero de tasks rodando simultaneamente"],
            ["healthCheck", "/health", "Endpoint que o ALB usa para verificar saude"],
        ],
        [3.5*cm, 3.5*cm, 8*cm]
    ))
    story.append(caption("Tabela 6 - Parametros principais da Task Definition"))
    story.append(spacer(0.2))
    for line in code_block([
        "# Registrar task definition",
        "aws ecs register-task-definition \\",
        "  --cli-input-json file://task-definition.json",
    ]):
        story.append(line)
    story.append(note("O arquivo completo task-definition.json esta documentado no GUIA_INSTALACAO_AWS.md (secao 7.2)."))
    
    story.append(spacer())
    story.append(subsec("7.3 Criar ALB e Target Group"))
    for line in code_block([
        "# Criar Application Load Balancer",
        "aws elbv2 create-load-balancer --name bennu-alb \\",
        "  --subnets <PUBLIC_SUBNET_1A_ID> <PUBLIC_SUBNET_1B_ID> \\",
        "  --security-groups <ALB_SG_ID> \\",
        "  --scheme internet-facing --type application",
        "",
        "# Criar Target Group",
        "aws elbv2 create-target-group --name bennu-tg \\",
        "  --protocol HTTP --port 5000 --vpc-id <VPC_ID> \\",
        "  --target-type ip --health-check-path /health",
        "",
        "# Listener HTTPS (porta 443 com certificado SSL)",
        "aws elbv2 create-listener --load-balancer-arn <ALB_ARN> \\",
        "  --protocol HTTPS --port 443 \\",
        "  --certificates CertificateArn=<ACM_CERT_ARN> \\",
        "  --default-actions Type=forward,TargetGroupArn=<TG_ARN>",
        "",
        "# Listener HTTP (redireciona para HTTPS)",
        "aws elbv2 create-listener --load-balancer-arn <ALB_ARN> \\",
        "  --protocol HTTP --port 80 \\",
        "  --default-actions Type=redirect,RedirectConfig=\\",
        "    '{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'",
    ]):
        story.append(line)
    
    story.append(spacer())
    story.append(subsec("7.4 Criar Cluster e Service"))
    for line in code_block([
        "# Criar cluster ECS",
        "aws ecs create-cluster --cluster-name bennu-cluster",
        "",
        "# Criar service (inicia 2 tasks automaticamente)",
        "aws ecs create-service --cluster bennu-cluster \\",
        "  --service-name bennu-finance-service \\",
        "  --task-definition bennu-finance --desired-count 2 \\",
        "  --launch-type FARGATE \\",
        "  --network-configuration 'awsvpcConfiguration={",
        "    subnets=[<PRIV_SUBNET_1A>,<PRIV_SUBNET_1B>],",
        "    securityGroups=[<ECS_SG_ID>],",
        "    assignPublicIp=DISABLED}' \\",
        "  --load-balancers 'targetGroupArn=<TG_ARN>,",
        "    containerName=bennu-finance,containerPort=5000'",
    ]):
        story.append(line)
    
    story.append(PageBreak())
    
    # === CAPITULO 8 ===
    story.append(chapter("Etapa 5 - Autenticacao (Cognito + Google)"))
    story.append(hr())
    story.append(body("O Bennu Finance utiliza autenticacao via Google. Na AWS, o servico <b>Cognito</b> gerencia todo o fluxo de login."))
    story.append(spacer())
    
    story.append(info_box("Fluxo de Autenticacao",
        "1. Usuario clica em 'Login com Google' no Bennu Finance<br/>"
        "2. Cognito redireciona para a pagina de login do Google<br/>"
        "3. Usuario autoriza com sua conta Google<br/>"
        "4. Google retorna token para o Cognito<br/>"
        "5. Cognito valida e redireciona de volta para a aplicacao com sessao ativa",
        GREEN_LIGHT, GREEN))
    
    story.append(spacer())
    story.append(subsec("8.1 Configurar Google Cloud Console"))
    story.extend(numbered_steps([
        "Acesse <b>console.cloud.google.com</b> e crie um novo projeto (ex: 'Bennu Finance')",
        "Va em <b>APIs &amp; Services &gt; Credentials</b> e clique em <b>Create Credentials &gt; OAuth Client ID</b>",
        "Tipo: <b>Web Application</b>. Nome: 'Bennu Finance'",
        "Em <b>Authorized JavaScript Origins</b>, adicione: https://&lt;SEU_DOMINIO&gt;",
        "Em <b>Authorized Redirect URIs</b>, adicione: https://bennu-finance.auth.us-east-1.amazoncognito.com/oauth2/idpresponse",
        "Anote o <b>Client ID</b> e o <b>Client Secret</b> gerados",
    ]))
    
    story.append(spacer())
    story.append(subsec("8.2 Criar Cognito User Pool"))
    for line in code_block([
        "# Criar User Pool",
        "aws cognito-idp create-user-pool \\",
        "  --pool-name bennu-finance-pool \\",
        "  --auto-verified-attributes email \\",
        "  --schema '[{\"Name\":\"email\",\"Required\":true,\"Mutable\":true}]'",
        "",
        "# Criar dominio do Cognito",
        "aws cognito-idp create-user-pool-domain \\",
        "  --user-pool-id <POOL_ID> --domain bennu-finance",
        "",
        "# Configurar Google como Identity Provider",
        "aws cognito-idp create-identity-provider \\",
        "  --user-pool-id <POOL_ID> --provider-name Google \\",
        "  --provider-type Google --provider-details '{",
        '    "client_id": "<GOOGLE_CLIENT_ID>",',
        '    "client_secret": "<GOOGLE_CLIENT_SECRET>",',
        '    "authorize_scopes": "openid email profile"',
        "  }' --attribute-mapping '{\"email\":\"email\",\"name\":\"name\"}'",
        "",
        "# Criar App Client",
        "aws cognito-idp create-user-pool-client \\",
        "  --user-pool-id <POOL_ID> --client-name bennu-web \\",
        "  --generate-secret \\",
        "  --supported-identity-providers Google \\",
        "  --callback-urls '[\"https://<SEU_DOMINIO>/auth/callback\"]' \\",
        "  --logout-urls '[\"https://<SEU_DOMINIO>/\"]' \\",
        "  --allowed-o-auth-flows code \\",
        "  --allowed-o-auth-scopes 'openid email profile' \\",
        "  --allowed-o-auth-flows-user-pool-client",
    ]):
        story.append(line)
    
    story.append(PageBreak())
    
    # === CAPITULO 9 ===
    story.append(chapter("Etapa 6 - DNS, SSL e CDN"))
    story.append(hr())
    
    story.append(subsec("9.1 Certificado SSL (ACM)"))
    for line in code_block([
        "# Solicitar certificado (validacao via DNS)",
        "aws acm request-certificate \\",
        "  --domain-name <SEU_DOMINIO> \\",
        "  --subject-alternative-names '*.<SEU_DOMINIO>' \\",
        "  --validation-method DNS",
    ]):
        story.append(line)
    story.append(note("Apos solicitar, a AWS fornecera um registro CNAME para validacao. Adicione esse registro no seu DNS e aguarde a validacao (pode levar ate 30 minutos)."))
    
    story.append(spacer())
    story.append(subsec("9.2 DNS (Route 53)"))
    for line in code_block([
        "# Criar registro A apontando para o ALB",
        "aws route53 change-resource-record-sets \\",
        "  --hosted-zone-id <ZONE_ID> \\",
        "  --change-batch '{",
        '    "Changes": [{',
        '      "Action": "CREATE",',
        '      "ResourceRecordSet": {',
        '        "Name": "<SEU_DOMINIO>",',
        '        "Type": "A",',
        '        "AliasTarget": {',
        '          "HostedZoneId": "<ALB_HOSTED_ZONE_ID>",',
        '          "DNSName": "<ALB_DNS_NAME>",',
        '          "EvaluateTargetHealth": true',
        "        }",
        "      }",
        "    }]",
        "  }'",
    ]):
        story.append(line)
    
    story.append(spacer())
    story.append(subsec("9.3 CloudFront (CDN)"))
    story.append(body("Configure o CloudFront para cache de assets estaticos:"))
    story.append(spacer(0.2))
    story.append(make_table(
        ["Behavior", "Path Pattern", "Cache TTL", "Compress"],
        [
            ["Assets estaticos", "/static/*", "30 dias", "Sim (gzip, brotli)"],
            ["Paginas dinamicas", "Default (*)", "Sem cache", "Sim"],
        ],
        [4*cm, 3.5*cm, 3.5*cm, 4*cm]
    ))
    story.append(caption("Tabela 7 - Configuracao de behaviors no CloudFront"))
    
    story.append(PageBreak())
    
    # === CAPITULO 10 ===
    story.append(chapter("Variaveis de Ambiente e Secrets"))
    story.append(hr())
    story.append(body("Todas as credenciais sao armazenadas no <b>AWS Secrets Manager</b> e injetadas automaticamente nos containers ECS:"))
    story.append(spacer())
    
    story.append(make_table(
        ["Variavel", "Descricao", "Exemplo"],
        [
            ["DATABASE_URL", "Connection string PostgreSQL", "postgresql://user:pass@host:5432/db"],
            ["SESSION_SECRET", "Chave de assinatura de sessoes", "Gerar com: openssl rand -hex 32"],
            ["REPLIT_DEPLOYMENT", "Flag de producao", "1"],
            ["ISSUER_URL", "URL do provedor OIDC (Cognito)", "https://cognito-idp.us-east-1.amazonaws.com/<POOL>"],
            ["COGNITO_CLIENT_ID", "Client ID do App Cognito", "(fornecido pela AWS)"],
            ["COGNITO_CLIENT_SECRET", "Client Secret do App", "(fornecido pela AWS)"],
            ["COGNITO_DOMAIN", "Dominio do Cognito", "bennu.auth.us-east-1.amazoncognito.com"],
        ],
        [3.8*cm, 4.5*cm, 6.7*cm]
    ))
    story.append(caption("Tabela 8 - Variaveis de ambiente obrigatorias"))
    
    story.append(spacer())
    for line in code_block([
        "# Criar secret no Secrets Manager",
        "aws secretsmanager create-secret \\",
        "  --name bennu-finance/production \\",
        "  --secret-string '{",
        '    "DATABASE_URL": "postgresql://bennu_admin:<SENHA>@<RDS>:5432/bennu_finance",',
        '    "SESSION_SECRET": "<GERAR_COM_openssl_rand_-hex_32>",',
        '    "COGNITO_CLIENT_ID": "<ID>",',
        '    "COGNITO_CLIENT_SECRET": "<SECRET>",',
        '    "COGNITO_DOMAIN": "<DOMAIN>",',
        '    "COGNITO_USER_POOL_ID": "<POOL_ID>"',
        "  }'",
    ]):
        story.append(line)
    story.append(warn("Nunca salve senhas ou chaves em arquivos de codigo, repositorios Git ou variaveis de ambiente em texto plano. Sempre use o Secrets Manager."))
    
    story.append(PageBreak())
    
    # === CAPITULO 11 ===
    story.append(chapter("Monitoramento e Alarmes"))
    story.append(hr())
    story.append(body("Configure alarmes no CloudWatch para ser notificado sobre problemas:"))
    story.append(spacer())
    
    story.append(make_table(
        ["Alarme", "Metrica", "Threshold", "Acao"],
        [
            ["CPU Alta", "CPUUtilization (ECS)", "> 80% por 10 min", "Notificar equipe via SNS"],
            ["Erros 5xx", "HTTPCode_Target_5XX_Count (ALB)", "> 10 em 5 min", "Notificar equipe via SNS"],
            ["Memoria Alta", "MemoryUtilization (ECS)", "> 85% por 10 min", "Notificar equipe via SNS"],
            ["Conexoes DB", "DatabaseConnections (RDS)", "> 80% max", "Investigar connection leaks"],
            ["Espaco Disco RDS", "FreeStorageSpace (RDS)", "< 5 GB", "Expandir storage"],
        ],
        [3*cm, 5*cm, 3.5*cm, 4*cm]
    ))
    story.append(caption("Tabela 9 - Alarmes recomendados"))
    
    story.append(spacer())
    for line in code_block([
        "# Criar log group para ECS",
        "aws logs create-log-group --log-group-name /ecs/bennu-finance",
        "",
        "# Alarme de CPU alta",
        "aws cloudwatch put-metric-alarm --alarm-name bennu-high-cpu \\",
        "  --metric-name CPUUtilization --namespace AWS/ECS \\",
        "  --statistic Average --period 300 --threshold 80 \\",
        "  --comparison-operator GreaterThanThreshold \\",
        "  --evaluation-periods 2 \\",
        "  --dimensions Name=ClusterName,Value=bennu-cluster \\",
        "    Name=ServiceName,Value=bennu-finance-service \\",
        "  --alarm-actions <SNS_TOPIC_ARN>",
    ]):
        story.append(line)
    
    story.append(PageBreak())
    
    # === CAPITULO 12 ===
    story.append(chapter("Backup e Restore"))
    story.append(hr())
    
    story.append(make_table(
        ["Tipo", "Frequencia", "Retencao", "Responsavel"],
        [
            ["Automatico RDS", "Diario (03:00-04:00 UTC)", "7 dias", "AWS (automatico)"],
            ["Snapshot Manual", "Antes de atualizacoes", "Indefinida", "Equipe de TI"],
            ["pg_dump Exportacao", "Semanal (recomendado)", "30 dias", "Equipe de TI"],
        ],
        [3.5*cm, 4.5*cm, 3*cm, 4*cm]
    ))
    story.append(caption("Tabela 10 - Politica de backup recomendada"))
    
    story.append(spacer())
    for line in code_block([
        "# Backup manual (snapshot RDS)",
        "aws rds create-db-snapshot \\",
        "  --db-instance-identifier bennu-finance-db \\",
        "  --db-snapshot-identifier bennu-manual-$(date +%Y%m%d)",
        "",
        "# Restore a partir de snapshot",
        "aws rds restore-db-instance-from-db-snapshot \\",
        "  --db-instance-identifier bennu-finance-db-restored \\",
        "  --db-snapshot-identifier <SNAPSHOT_ID> \\",
        "  --db-instance-class db.t3.medium \\",
        "  --db-subnet-group-name bennu-db-subnet \\",
        "  --vpc-security-group-ids <RDS_SG_ID>",
    ]):
        story.append(line)
    
    story.append(PageBreak())
    
    # === CAPITULO 13 ===
    story.append(chapter("Deploy de Novas Versoes"))
    story.append(hr())
    story.append(body("Processo para atualizar a aplicacao em producao:"))
    story.append(spacer())
    story.extend(numbered_steps([
        "<b>Build</b> nova imagem Docker: <font face='Courier' size='9'>docker build -t bennu-finance .</font>",
        "<b>Tag</b> com endereco ECR: <font face='Courier' size='9'>docker tag bennu-finance:latest &lt;ACCOUNT_ID&gt;.dkr.ecr.us-east-1.amazonaws.com/bennu-finance:latest</font>",
        "<b>Push</b> para o ECR: <font face='Courier' size='9'>docker push &lt;ACCOUNT_ID&gt;.dkr.ecr.us-east-1.amazonaws.com/bennu-finance:latest</font>",
        "<b>Force new deployment</b>: <font face='Courier' size='9'>aws ecs update-service --cluster bennu-cluster --service bennu-finance-service --force-new-deployment</font>",
        "<b>Monitorar</b>: <font face='Courier' size='9'>aws ecs wait services-stable --cluster bennu-cluster --services bennu-finance-service</font>",
    ]))
    story.append(spacer())
    story.append(note("O ECS realiza <b>rolling deployment</b> por padrao: inicia novas tasks antes de parar as antigas, garantindo zero downtime durante a atualizacao."))
    
    story.append(PageBreak())
    
    # === CAPITULO 14 ===
    story.append(chapter("Checklist de Validacao"))
    story.append(hr())
    story.append(body("Apos concluir todas as etapas, valide cada item abaixo:"))
    story.append(spacer())
    
    story.append(subsec("Infraestrutura"))
    story.append(checklist_table([
        "VPC criada com 4 subnets (2 publicas, 2 privadas)",
        "Internet Gateway e NAT Gateway funcionando",
        "Security Groups criados com regras corretas",
        "RDS PostgreSQL acessivel pelas tasks ECS",
    ]))
    
    story.append(spacer())
    story.append(subsec("Aplicacao"))
    story.append(checklist_table([
        "Imagem Docker no ECR com build recente",
        "Tasks ECS rodando (desired count = running count)",
        "Health check retornando 200 em /health",
        "Aplicacao respondendo em https://<SEU_DOMINIO>",
    ]))
    
    story.append(spacer())
    story.append(subsec("Seguranca"))
    story.append(checklist_table([
        "Certificado SSL valido (sem avisos no navegador)",
        "HTTP redirecionando para HTTPS",
        "Secrets armazenados no Secrets Manager",
        "RDS nao acessivel publicamente",
        "Login Google funcionando via Cognito",
        "Todas as rotas protegidas exigindo autenticacao",
    ]))
    
    story.append(spacer())
    story.append(subsec("Operacao"))
    story.append(checklist_table([
        "Logs aparecendo no CloudWatch (/ecs/bennu-finance)",
        "Alarmes CloudWatch configurados e testados",
        "Backup automatico RDS verificado",
        "Assets estaticos carregando (CSS, JS, imagens)",
    ]))
    
    story.append(PageBreak())
    
    # === CAPITULO 15 ===
    story.append(chapter("Troubleshooting"))
    story.append(hr())
    story.append(body("Guia rapido para resolver os problemas mais comuns:"))
    story.append(spacer())
    
    problems = [
        ["502 Bad Gateway", "Tasks ECS nao estao rodando ou nao passam no health check",
         "Verificar: aws ecs describe-services --cluster bennu-cluster --services bennu-finance-service. Consultar logs: aws logs tail /ecs/bennu-finance"],
        ["Timeout na conexao com o banco", "Security Group do RDS nao permite acesso do ECS",
         "Verificar se o SG do RDS tem regra de entrada na porta 5432 com source = SG do ECS"],
        ["Login Google nao funciona", "URLs de callback nao conferem",
         "Verificar: 1) Callback URL no Cognito, 2) Redirect URI no Google Console, 3) Dominio do Cognito"],
        ["Assets nao carregam (CSS/JS)", "Cache do CloudFront desatualizado",
         "Executar invalidacao: aws cloudfront create-invalidation --distribution-id <ID> --paths '/static/*'"],
        ["Erro 500 generico", "Erro na aplicacao",
         "Consultar CloudWatch Logs: aws logs tail /ecs/bennu-finance --follow"],
        ["Aplicacao lenta", "CPU ou memoria insuficiente",
         "Verificar metricas no CloudWatch. Considerar: aumentar cpu/memory na task definition ou aumentar desired-count"],
    ]
    
    for prob in problems:
        story.append(subsec(f"Problema: {prob[0]}"))
        story.append(body(f"<b>Causa provavel:</b> {prob[1]}"))
        story.append(body(f"<b>Solucao:</b> {prob[2]}"))
        story.append(spacer(0.3))
    
    story.append(PageBreak())
    
    # === CAPITULO 16 ===
    story.append(chapter("Estimativa de Custos"))
    story.append(hr())
    story.append(body("Estimativa de custos mensais para o ambiente de producao basico:"))
    story.append(spacer())
    story.append(draw_cost_chart())
    story.append(caption("Figura 4 - Distribuicao dos custos mensais por servico AWS"))
    story.append(spacer())
    
    story.append(make_table(
        ["Servico", "Especificacao", "Custo/Mes (USD)"],
        [
            ["ECS Fargate", "2 tasks x 2 vCPU x 4 GB RAM", "~$150"],
            ["RDS PostgreSQL", "db.t3.medium, Multi-AZ, 50 GB gp3", "~$140"],
            ["ALB", "Application Load Balancer", "~$25"],
            ["CloudWatch", "Logs + metricas + alarmes", "~$20"],
            ["CloudFront", "100 GB transferencia/mes", "~$10"],
            ["S3", "50 GB armazenamento", "~$2"],
            ["Route 53", "1 hosted zone", "~$1"],
            ["Cognito", "Ate 1000 MAU", "Gratuito"],
            ["Secrets Manager", "7 secrets", "~$3"],
            ["TOTAL", "", "~$350/mes"],
        ],
        [4*cm, 6*cm, 3*cm]
    ))
    story.append(caption("Tabela 11 - Detalhamento dos custos mensais estimados"))
    story.append(spacer())
    story.append(note("Valores estimados para a regiao us-east-1 (N. Virginia) em fevereiro/2026. Os custos reais podem variar conforme uso. Consulte <b>calculator.aws</b> para estimativas atualizadas."))
    
    story.append(PageBreak())
    
    # === CAPITULO 17 ===
    story.append(chapter("Referencias e Links Uteis"))
    story.append(hr())
    
    refs = [
        ["Documentacao AWS ECS Fargate", "docs.aws.amazon.com/ecs/latest/developerguide/"],
        ["Documentacao AWS RDS PostgreSQL", "docs.aws.amazon.com/AmazonRDS/latest/UserGuide/"],
        ["Guia de VPC e Networking", "docs.aws.amazon.com/vpc/latest/userguide/"],
        ["AWS Cognito Developer Guide", "docs.aws.amazon.com/cognito/latest/developerguide/"],
        ["CloudFront Developer Guide", "docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/"],
        ["AWS Secrets Manager", "docs.aws.amazon.com/secretsmanager/latest/userguide/"],
        ["CloudWatch User Guide", "docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/"],
        ["ACM (Certificate Manager)", "docs.aws.amazon.com/acm/latest/userguide/"],
        ["Route 53 Developer Guide", "docs.aws.amazon.com/Route53/latest/DeveloperGuide/"],
        ["AWS CLI Command Reference", "docs.aws.amazon.com/cli/latest/reference/"],
        ["Docker Documentation", "docs.docker.com/"],
        ["FastAPI Documentation", "fastapi.tiangolo.com/"],
        ["PostgreSQL 15 Documentation", "www.postgresql.org/docs/15/"],
        ["AWS Pricing Calculator", "calculator.aws/"],
        ["Google Cloud Console (OAuth)", "console.cloud.google.com/"],
    ]
    
    story.append(make_table(
        ["Recurso", "URL"],
        refs,
        [6*cm, 9*cm]
    ))
    story.append(caption("Tabela 12 - Links de referencia para consulta"))
    
    story.append(PageBreak())
    
    # === CAPITULO 18 ===
    story.append(chapter("Glossario"))
    story.append(hr())
    
    glossary = [
        ["ALB", "Application Load Balancer - Distribui trafego entre multiplas instancias/containers"],
        ["AZ", "Availability Zone - Datacenter isolado dentro de uma regiao AWS"],
        ["CIDR", "Classless Inter-Domain Routing - Notacao para definir blocos de IPs (ex: 10.0.0.0/16)"],
        ["CDN", "Content Delivery Network - Rede de distribuicao de conteudo para cache global"],
        ["Cognito", "Servico AWS de gerenciamento de identidade e autenticacao de usuarios"],
        ["ECR", "Elastic Container Registry - Repositorio de imagens Docker na AWS"],
        ["ECS", "Elastic Container Service - Servico de orquestracao de containers Docker"],
        ["Fargate", "Modelo serverless do ECS onde a AWS gerencia a infraestrutura de servidores"],
        ["IAM", "Identity and Access Management - Controle de acesso e permissoes na AWS"],
        ["Multi-AZ", "Implantacao em multiplas zonas de disponibilidade para alta disponibilidade"],
        ["NAT Gateway", "Permite que recursos em subnets privadas acessem a internet"],
        ["OIDC", "OpenID Connect - Protocolo de autenticacao baseado em OAuth 2.0"],
        ["RDS", "Relational Database Service - Banco de dados relacional gerenciado pela AWS"],
        ["SG", "Security Group - Firewall virtual que controla trafego de entrada e saida"],
        ["SSL/TLS", "Protocolos de criptografia para comunicacao segura (HTTPS)"],
        ["Task Definition", "Configuracao que define como um container Docker deve ser executado no ECS"],
        ["VPC", "Virtual Private Cloud - Rede virtual isolada na AWS"],
    ]
    
    story.append(make_table(
        ["Termo", "Definicao"],
        glossary,
        [3*cm, 12*cm]
    ))
    story.append(caption("Tabela 13 - Glossario de termos tecnicos"))
    
    story.append(spacer(2))
    story.append(hr())
    story.append(Paragraph("Fim do Documento", ParagraphStyle('end', fontSize=12, textColor=GRAY_MED, alignment=TA_CENTER, fontName='Helvetica-Bold')))
    story.append(Paragraph("Bennu Finance - Guia de Instalacao e Configuracao AWS - v1.0 - Fevereiro 2026", S_CAPTION))
    
    doc.build(story, onFirstPage=first_page, onLaterPages=page_header_footer)
    print(f"PDF gerado com sucesso: {filename}")
    print(f"Tamanho: {os.path.getsize(filename) / 1024:.0f} KB")
    return filename

if __name__ == "__main__":
    build_pdf()
