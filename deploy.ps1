    ONTRAR O ZIP ────────────────────────────────────
    Write-Host ""
    Write-Host "[PASSO 1] Procurando ZIP do Replit..." -ForegroundColor Yellow
    
    # Procurar ZIP mais recente em Downloads e pasta Bennu
    $zips = @()
    $zips += Get-ChildItem "$pastaDownload\*.zip" -ErrorAction SilentlyContinue
    $zips += Get-ChildItem "$pastaBennu\*.zip" -ErrorAction SilentlyContinue
    $zips = $zips | Sort-Object LastWriteTime -Descending
    
    if ($zips.Count -eq 0) {
        Write-Host ""
        Write-Host "[AVISO] Nenhum ZIP encontrado em:" -ForegroundColor Yellow
        Write-Host "  - $pastaDownload" -ForegroundColor Gray
        Write-Host "  - $pastaBennu" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Passos para baixar o ZIP do Replit:" -ForegroundColor Cyan
        Write-Host "  1. Abra o Replit no browser" -ForegroundColor Gray
        Write-Host "  2. Menu (3 pontos) -> Download as ZIP" -ForegroundColor Gray
        Write-Host "  3. Salve em Downloads ou em '$pastaBennu'" -ForegroundColor Gray
        Write-Host "  4. Rode este script novamente" -ForegroundColor Gray
        Write-Host ""
        $zipPath = Read-Host "Ou informe o caminho completo do ZIP manualmente (Enter para sair)"
        if ($zipPath -eq "") { exit 0 }
        if (!(Test-Path $zipPath)) {
            Write-Host "[ERRO] Arquivo nao encontrado: $zipPath" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[INFO] ZIPs encontrados:" -ForegroundColor Green
        for ($i = 0; $i -lt [Math]::Min($zips.Count, 5); $i++) {
            Write-Host "  [$i] $($zips[$i].FullName)  ($($zips[$i].LastWriteTime.ToString('dd/MM/yyyy HH:mm')))" -ForegroundColor Gray
        }
        Write-Host ""
        $escolha = Read-Host "Qual ZIP usar? (Enter = mais recente [0])"
        if ($escolha -eq "") { $escolha = "0" }
        $zipPath = $zips[[int]$escolha].FullName
    }
    
    Write-Host "[OK] Usando ZIP: $zipPath" -ForegroundColor Green
    
    # ─── PASSO 2: GARANTIR REPOSITORIO LOCAL ────────────────────────
    Write-Host ""
    Write-Host "[PASSO 2] Verificando repositorio local..." -ForegroundColor Yellow
    
    if (!(Test-Path $repoPath)) {
        Write-Host "[INFO] Clonando repositorio Bitbucket..." -ForegroundColor Yellow
        git clone --branch $branch $repoUrl $repoPath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERRO] Falha no clone. Verifique credenciais." -ForegroundColor Red
            Write-Host "DICA: Crie um App Password em https://bitbucket.org/account/settings/app-passwords/" -ForegroundColor Cyan
            exit 1
        }
    }
    
    Set-Location $repoPath
    
    # Verificar e configurar remote origin se necessario
    $remoteUrl = git remote get-url origin 2>$null
    if ($LASTEXITCODE -ne 0 -or !$remoteUrl) {
        Write-Host "[INFO] Remote 'origin' nao configurado. Adicionando..." -ForegroundColor Yellow
        git remote add origin $repoUrl
        Write-Host "[OK] Remote adicionado: $repoUrl" -ForegroundColor Green
    } elseif ($remoteUrl -ne $repoUrl) {
        Write-Host "[INFO] Atualizando URL do remote origin..." -ForegroundColor Yellow
        git remote set-url origin $repoUrl
        Write-Host "[OK] Remote atualizado: $repoUrl" -ForegroundColor Green
    }
    
    git fetch origin --quiet 2>$null
    Write-Host "[OK] Repositorio: $repoPath" -ForegroundColor Green
    
    # Salvar arquivos de infraestrutura antes de sobrescrever
    Write-Host ""
    Write-Host "[PASSO 3] Salvando arquivos de infraestrutura..." -ForegroundColor Yellow
    $tmpInfra = [System.IO.Path]::GetTempPath() + "bennu_infra_" + [System.Guid]::NewGuid().ToString("N").Substring(0,8)
    New-Item -ItemType Directory -Path $tmpInfra -Force | Out-Null
    
    foreach ($arq in $arquivosInfra) {
        if (Test-Path "$repoPath\$arq") {
            Copy-Item "$repoPath\$arq" "$tmpInfra\" -Force
            Write-Host "  [backup] $arq" -ForegroundColor Gray
        }
    }
    Write-Host "[OK] Infraestrutura salva em backup temporario" -ForegroundColor Green
    
    # ─── PASSO 4: EXTRAIR ZIP ────────────────────────────────────────
    Write-Host ""
    Write-Host "[PASSO 4] Extraindo ZIP..." -ForegroundColor Yellow
    
    $tmpExtract = [System.IO.Path]::GetTempPath() + "bennu_zip_" + [System.Guid]::NewGuid().ToString("N").Substring(0,8)
    Expand-Archive -Path $zipPath -DestinationPath $tmpExtract -Force
    Write-Host "[OK] ZIP extraido em: $tmpExtract" -ForegroundColor Green
    
    # Detectar estrutura do ZIP (pode ter subpasta ou nao)
    $subpastas = Get-ChildItem $tmpExtract -Directory
    $raizCodigo = $tmpExtract
    
    if ($subpastas.Count -eq 1) {
        $possivel = $subpastas[0].FullName
        # Se a subpasta tem app/ ou pyproject.toml, ela eh a raiz
        if ((Test-Path "$possivel\app") -or (Test-Path "$possivel\pyproject.toml")) {
            $raizCodigo = $possivel
            Write-Host "[INFO] Codigo detectado em subpasta: $($subpastas[0].Name)" -ForegroundColor Gray
        }
    }
    
    Write-Host "[OK] Raiz do codigo: $raizCodigo" -ForegroundColor Green
    
    # Verificar se tem app/main.py
    if (!(Test-Path "$raizCodigo\app\main.py")) {
        Write-Host "[ERRO] app\main.py nao encontrado no ZIP. Estrutura incorreta." -ForegroundColor Red
        Write-Host "Conteudo encontrado:" -ForegroundColor Yellow
        Get-ChildItem $raizCodigo | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        Remove-Item $tmpExtract -Recurse -Force -ErrorAction SilentlyContinue
        exit 1
    }
    
    # ─── PASSO 5: COPIAR CODIGO PARA O REPOSITORIO ──────────────────
    Write-Host ""
    Write-Host "[PASSO 5] Copiando codigo novo para o repositorio..." -ForegroundColor Yellow
    
    # Arquivos/pastas a copiar do ZIP (codigo da aplicacao)
    $itensParaCopiar = @("app", "pyproject.toml", "requirements.txt", "sql", "deploy.ps1")
    
    foreach ($item in $itensParaCopiar) {
        $origem = "$raizCodigo\$item"
        $destino = "$repoPath\$item"
        if (Test-Path $origem) {
            if (Test-Path $destino) {
                Remove-Item $destino -Recurse -Force -ErrorAction SilentlyContinue
            }
            Copy-Item $origem $destino -Recurse -Force
            Write-Host "  [copiado] $item" -ForegroundColor Gray
        }
    }
    Write-Host "[OK] Codigo copiado com sucesso" -ForegroundColor Green
    
    # ─── PASSO 6: RESTAURAR INFRAESTRUTURA ──────────────────────────
    Write-Host ""
    Write-Host "[PASSO 6] Restaurando arquivos de infraestrutura..." -ForegroundColor Yellow
    
    foreach ($arq in $arquivosInfra) {
        if (Test-Path "$tmpInfra\$arq") {
            Copy-Item "$tmpInfra\$arq" "$repoPath\$arq" -Force
            Write-Host "  [restaurado] $arq" -ForegroundColor Gray
        }
    }
    
    # Garantir que arquivos essenciais existem (do backup antigo se necessario)
    $infraSource = "D:\Agile AI Experts\Bennu\bennu-finance-bitbucket"
    foreach ($arq in @("Dockerfile", "deploy.sh", "bitbucket-pipelines.yml")) {
        if (!(Test-Path "$repoPath\$arq") -and (Test-Path "$infraSource\$arq")) {
            Copy-Item "$infraSource\$arq" "$repoPath\$arq" -Force
            Write-Host "  [adicionado do backup] $arq" -ForegroundColor DarkYellow
        }
    }
    
    Write-Host "[OK] Infraestrutura restaurada" -ForegroundColor Green
    
    # Limpar temporarios
    Remove-Item $tmpExtract -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item $tmpInfra -Recurse -Force -ErrorAction SilentlyContinue
    
    # ─── PASSO 7: SINCRONIZAR COM REMOTO (evita push rejeitado) ─────
    Write-Host ""
    Write-Host "[PASSO 7] Sincronizando com Bitbucket remoto..." -ForegroundColor Yellow
    
    git fetch origin --quiet 2>$null
    
    # Verificar se ha commits remotos que ainda nao temos
    $aheadBehind = git rev-list --left-right --count "origin/$branch...HEAD" 2>$null
    if ($aheadBehind) {
        $partes = $aheadBehind -split "\s+"
        $behind = [int]$partes[0]
        if ($behind -gt 0) {
            Write-Host "[INFO] Repositorio remoto tem $behind commit(s) mais recentes. Fazendo rebase..." -ForegroundColor Yellow
            git stash --quiet 2>$null
            git pull origin $branch --rebase --quiet
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[AVISO] Rebase com conflito. Resolva manualmente e rode 'git rebase --continue'." -ForegroundColor Red
                git stash pop --quiet 2>$null
                exit 1
            }
            git stash pop --quiet 2>$null
            Write-Host "[OK] Sincronizado com sucesso" -ForegroundColor Green
        } else {
            Write-Host "[OK] Repositorio local esta atualizado" -ForegroundColor Green
        }
    } else {
        Write-Host "[OK] Sincronizacao verificada" -ForegroundColor Green
    }
    
    # ─── PASSO 8: GIT COMMIT E PUSH ─────────────────────────────────
    Write-Host ""
    Write-Host "[PASSO 8] Preparando commit..." -ForegroundColor Yellow
    
    $gitStatus = git status --short
    if ($gitStatus) {
        Write-Host "[INFO] Arquivos alterados:" -ForegroundColor Yellow
        git status --short | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        Write-Host ""
        $message = Read-Host "Mensagem do commit (Enter para mensagem automatica)"
        if ($message -eq "") {
            $dataHora = Get-Date -Format "yyyy-MM-dd HH:mm"
            $message = "deploy: atualizacao via ZIP Replit $dataHora"
        }
        git add .
        git commit -m $message
        Write-Host ""
        Write-Host "[INFO] Enviando para Bitbucket (branch: $branch)..." -ForegroundColor Yellow
        git push origin $branch
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[OK] Push realizado! Pipeline iniciada automaticamente." -ForegroundColor Green
            Write-Host "[INFO] Acompanhe em: https://bitbucket.org/bennubr/bennu-finance/pipelines" -ForegroundColor Cyan
            Write-Host "[INFO] App em: https://bennu-finance.bennuapp.com.br/" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "[ERRO] Falha no push." -ForegroundColor Red
            Write-Host "DICA: Configure App Password em https://bitbucket.org/account/settings/app-passwords/" -ForegroundColor Cyan
            Write-Host "      Username: bennubr  |  Permissao: Repositories -> Read + Write" -ForegroundColor Gray
        }
    } else {
        Write-Host "[INFO] Nenhuma alteracao detectada. Nada a commitar." -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "===================================" -ForegroundColor Green
    Write-Host " PROCESSO CONCLUIDO" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    Write-Host ""
    Read-Host "Pressione Enter para fechar"
    