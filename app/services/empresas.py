"""
Serviço para operações relacionadas a empresas
"""
import json
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

from app.models.empresas import Empresa
from app.models.users import User
from app.models.categorias import CategoriaContabil, CategoriaGerencial, CentroCusto, Projeto
from app.models.auxiliares import (
    ProdutoServico, ContaContabil, ContaBancaria,
    CartaoCredito, Imposto
)
from app.models.clientes import Cliente
from app.models.fornecedores import Fornecedor
from app.models.transacoes import TransacaoFinanceira
from app.models.planejamento import PlanejamentoVersao, LinhaOrcamentaria
from app.models.desmembramento import DesmembramentoTransacao, DesmembramentoItem
from app.models.auditoria import LogAcao, TipoAcao


class EmpresaService:
    """Serviço centralizado para operações de empresas"""
    
    @staticmethod
    def delete_empresa_with_preservation(
        empresa_id: int,
        db: Session,
        current_user: User,
        confirmar: bool = False
    ) -> dict:
        """
        Delete uma empresa preservando dados mestres/auxiliares compartilhados.
        
        COMPORTAMENTO:
        - Dados MESTRES (categorias, produtos, clientes, fornecedores, contas, projetos, cartões):
          empresa_id → NULL (ficam disponíveis para outras empresas)
        - Dados TRANSACIONAIS (transações, planejamento, desmembramentos, faturas):
          Deletados em cascata junto com a empresa
        - Tabelas específicas (empresa_cnpjs, impostos empresa, users):
          Deletadas junto com a empresa
          
        Args:
            empresa_id: ID da empresa a deletar
            db: Sessão do SQLAlchemy
            current_user: Usuário executando a operação
            confirmar: Flag de confirmação (REQUERIDO=True)
            
        Returns:
            Dict com resumo da operação (dados preservados, deletados, etc.)
            
        Raises:
            HTTPException: Se empresa não existe ou confirmação faltando
        """
        
        if not confirmar:
            raise HTTPException(
                status_code=400,
                detail="Operação requer confirmação explícita. Adicione '?confirmar=true'"
            )
        
        # Verificar se empresa existe ANTES de iniciar transação
        empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
        if not empresa:
            raise HTTPException(status_code=404, detail=f"Empresa {empresa_id} não encontrada")
        
        empresa_nome = empresa.nome_fantasia or empresa.razao_social or f"ID {empresa_id}"
        resultado = {
            "empresa_id": empresa_id,
            "empresa_nome": empresa_nome,
            "dados_mestres_preservados": {},
            "dados_transacionais_deletados": {},
            "dados_especificos_deletados": {}
        }
        
        try:
            # ===== TRANSAÇÃO ATÔMICA: TUDO OU NADA =====
            # Se qualquer fase falhar, rollback automático de TODAS as mudanças
            
            # ===== FASE 1: SETAR NULL EM DADOS MESTRES (COMPARTILHADOS) =====
            tabelas_mestres = [
                ("categorias_contabeis", CategoriaContabil),
                ("categorias_gerenciais", CategoriaGerencial),
                ("centros_custo", CentroCusto),
                ("produtos_servicos", ProdutoServico),
                ("contas_contabeis", ContaContabil),
                ("contas_bancarias", ContaBancaria),
                ("cartoes_credito", CartaoCredito),
                ("clientes", Cliente),
                ("fornecedores", Fornecedor),
                ("projetos", Projeto),
            ]
            
            for table_name, model in tabelas_mestres:
                count = db.query(model).filter(model.empresa_id == empresa_id).count()
                if count > 0:
                    db.query(model).filter(model.empresa_id == empresa_id).update(
                        {"empresa_id": None},
                        synchronize_session=False
                    )
                    resultado["dados_mestres_preservados"][table_name] = count
                    print(f"📝 {table_name}: {count} registros preservados (empresa_id → NULL)")
            
            # ===== FASE 2: DELETAR DADOS ESPECÍFICOS DA EMPRESA =====
            # empresa_cnpjs (SQL raw - tabela sem modelo SQLAlchemy)
            count_cnpjs = db.execute(
                text("SELECT COUNT(*) FROM empresa_cnpjs WHERE empresa_id = :empresa_id"),
                {"empresa_id": empresa_id}
            ).scalar()
            if count_cnpjs and count_cnpjs > 0:
                db.execute(
                    text("DELETE FROM empresa_cnpjs WHERE empresa_id = :empresa_id"),
                    {"empresa_id": empresa_id}
                )
                resultado["dados_especificos_deletados"]["empresa_cnpjs"] = count_cnpjs
            
            # Impostos (modelo SQLAlchemy)
            count_impostos = db.query(Imposto).filter(Imposto.empresa_id == empresa_id).count()
            if count_impostos > 0:
                db.query(Imposto).filter(Imposto.empresa_id == empresa_id).delete()
                resultado["dados_especificos_deletados"]["impostos"] = count_impostos
            
            # ===== FASE 2.5: ANULAR REFERÊNCIAS E DELETAR CLASSIFICAÇÕES DE PROJETO =====
            # Primeiro: anular classificacao_id nos projetos que referenciam classificações desta empresa
            count_projetos_nulled = db.execute(
                text("""
                    UPDATE projetos 
                    SET classificacao_id = NULL 
                    WHERE classificacao_id IN (
                        SELECT id FROM projeto_classificacoes WHERE empresa_id = :empresa_id
                    )
                """),
                {"empresa_id": empresa_id}
            ).rowcount
            
            if count_projetos_nulled > 0:
                print(f"🔄 projetos.classificacao_id: {count_projetos_nulled} referências anuladas")
            
            # Depois: deletar as classificações (agora sem FK constraints)
            count_proj_class = db.execute(
                text("SELECT COUNT(*) FROM projeto_classificacoes WHERE empresa_id = :empresa_id"),
                {"empresa_id": empresa_id}
            ).scalar()
            if count_proj_class and count_proj_class > 0:
                db.execute(
                    text("DELETE FROM projeto_classificacoes WHERE empresa_id = :empresa_id"),
                    {"empresa_id": empresa_id}
                )
                resultado["dados_especificos_deletados"]["projeto_classificacoes"] = count_proj_class
                print(f"🗑️ projeto_classificacoes: {count_proj_class} registros deletados")
            
            # ===== FASE 3: DELETAR DADOS TRANSACIONAIS =====
            # NOTA: DesmembramentoItem não tem empresa_id diretamente, será deletado em cascade
            # quando deletarmos DesmembramentoTransacao (relationship com cascade="all, delete-orphan")
            tabelas_transacionais = [
                ("desmembramento_transacoes", DesmembramentoTransacao),  # Deletar primeiro (cascade itens)
                ("linhas_orcamentarias", LinhaOrcamentaria),
                ("planejamento_versoes", PlanejamentoVersao),
                ("transacoes_financeiras", TransacaoFinanceira),
            ]
            
            for table_name, model in tabelas_transacionais:
                count = db.query(model).filter(model.empresa_id == empresa_id).count()
                if count > 0:
                    db.query(model).filter(model.empresa_id == empresa_id).delete()
                    resultado["dados_transacionais_deletados"][table_name] = count
                    print(f"🗑️ {table_name}: {count} registros deletados")
            
            # Deletar faturas e transações de cartão (SQL raw - tabelas sem modelo SQLAlchemy)
            # Primeiro contar
            count_faturas = db.execute(
                text("SELECT COUNT(*) FROM faturas_cartao WHERE empresa_id = :empresa_id"),
                {"empresa_id": empresa_id}
            ).scalar()
            count_transacoes_cartao = db.execute(
                text("SELECT COUNT(*) FROM transacoes_cartao WHERE empresa_id = :empresa_id"),
                {"empresa_id": empresa_id}
            ).scalar()
            
            # Depois deletar
            if count_transacoes_cartao and count_transacoes_cartao > 0:
                db.execute(
                    text("DELETE FROM transacoes_cartao WHERE empresa_id = :empresa_id"),
                    {"empresa_id": empresa_id}
                )
                resultado["dados_transacionais_deletados"]["transacoes_cartao"] = count_transacoes_cartao
            
            if count_faturas and count_faturas > 0:
                db.execute(
                    text("DELETE FROM faturas_cartao WHERE empresa_id = :empresa_id"),
                    {"empresa_id": empresa_id}
                )
                resultado["dados_transacionais_deletados"]["faturas_cartao"] = count_faturas
            
            # ===== FASE 4: SETAR NULL EM USERS DA EMPRESA =====
            count_users = db.query(User).filter(User.empresa_id == empresa_id).count()
            if count_users > 0:
                db.query(User).filter(User.empresa_id == empresa_id).update(
                    {"empresa_id": None},
                    synchronize_session=False
                )
                resultado["dados_mestres_preservados"]["users"] = count_users
                print(f"📝 users: {count_users} usuários preservados (empresa_id → NULL)")
            
            # ===== FASE 5: DELETAR A EMPRESA =====
            db.delete(empresa)
            
            # ===== FASE 6: REGISTRAR AUDITORIA =====
            log = LogAcao(
                user_id=current_user.id,
                acao=TipoAcao.DELETE,
                entidade="empresas",
                entidade_id=empresa_id,
                descricao=f"Deleção de empresa '{empresa_nome}' preservando dados mestres compartilhados",
                dados_antes=json.dumps({"empresa_nome": empresa_nome}),
                dados_depois=json.dumps(resultado)
            )
            db.add(log)
            
            # ===== COMMIT ATÔMICO: TODAS AS 6 FASES DE UMA VEZ =====
            # Se chegou aqui, todas as fases foram bem-sucedidas
            # Commit único garante atomicidade: ou tudo acontece, ou nada acontece
            db.commit()
            print(f"✅ Empresa {empresa_id} deletada com sucesso. Dados mestres preservados!")
            print(f"   📊 Resumo: {len(resultado['dados_mestres_preservados'])} tipos mestres preservados, "
                  f"{len(resultado['dados_transacionais_deletados'])} tipos transacionais deletados")
            
            return resultado
            
        except HTTPException:
            # HTTPException já foi levantada com mensagem apropriada
            db.rollback()
            print(f"❌ Deleção de empresa {empresa_id} abortada: validação falhou")
            raise
        except Exception as e:
            # Qualquer erro = rollback de TODAS as mudanças (atomicidade garantida)
            db.rollback()
            print(f"❌ ERRO durante deleção de empresa {empresa_id}: {str(e)}")
            print(f"   🔄 Rollback executado: nenhuma mudança foi persistida")
            raise HTTPException(status_code=500, detail=f"Erro ao deletar empresa: {str(e)}")
