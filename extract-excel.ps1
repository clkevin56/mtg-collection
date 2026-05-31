Import-Module ImportExcel

# Fichier qui garde la liste des editions deja importees
$trackFile = "$PSScriptRoot\imported-sets.json"
$outputFile = "$PSScriptRoot\excel-cards-new.json"

$imported = @{}
if (Test-Path $trackFile) {
    try {
        $obj = Get-Content $trackFile -Encoding UTF8 | ConvertFrom-Json
        $obj.PSObject.Properties | ForEach-Object { $imported[$_.Name] = $true }
    } catch {}
}

# === MAPPING fichier -> feuille -> code set ===
$sheetMap = [ordered]@{
    'Classique M.xlsx' = [ordered]@{
        'Unlimited'='2ED'; 'Fourth Edition'='4ED'; '5th Edition'='5ED'
        'Classic 6th édition'='6ED'; '7 core set'='7ED'; 'Core Set 8'='8ED'
        '9th'='9ED'; 'M10'='M10'; '10em édition core set'='10E'
        'M11'='M11'; 'M12'='M12'; 'M13'='M13'; 'M14'='M14'; 'M15'='M15'
        'Magic Origins'='ORI'; 'M19'='M19'; 'M20'='M20'; 'M21'='M21'
    }
    'Commander.xlsx' = [ordered]@{
        'Model'='SKIP'
        'Commander kamigawa'='NEC'; 'Commander rue de cadenia'='NCC'
        'Commander anthology'='CMA'; 'Zendikar commander'='ZNC'
        'Commander 2018'='C18'; 'Commander, Kaldheim'='KHC'
        'Commander Legend'='CMR'; 'Commander 2021'='C21'
        'Commander dungeons dragons'='AFC'; 'Innistrad Commander'='MIC'
        'Commander 2013'='C13'; 'Commander 2020'='C20'
        'Comander dungeons and dragon'='CLB'; 'Commander'='CMD'
        'Commander 2019'='C19'; 'Commander innistrad noce ecarla'='VOC'
        'Commander 2014'='C14'; 'Magic commander'='CMM'
        'Commander 2015'='C15'; 'Commander anthology 2'='CM2'
        'Commander mythique'='CMM2'; 'Commander New Capenna'='NCC2'
        'Commander dungeon dragon'='CLB2'; 'Commander Dominaria uni'='DMC'
    }
    'DUEL.xlsx' = [ordered]@{
        'Model'='SKIP'
        'speed vs cunning'='DDN'; 'Blessed vs Cursed'='DDR'
        'Duel Sorrin vs Tibalt'='DDK'; 'Duel Garruk vs Lilliana'='DDD'
        'Elspeth vs Tezerret'='DDF'; 'Knight vs Dragon'='DDG'
        'Nissa vs Ob Nixilis'='DDQ'; 'Jace vs Chandra'='DD1'
        'Phyrexian vs the coalition'='DDE'; 'Divine vs Demonic'='DDC'
        'Jace vs Vraska'='DDM'; 'Heroes vs Monster'='DDL'
        'Venser vs Koth'='DDI'; 'Ajani vs Nicol Bolas'='DDH'
        'Elspeth vs Kiora'='DDO'; 'Elves vs Gobelin'='EVG'
        'Zendikar vs eldrazi'='DDP'
    }
    'Master.xlsx' = [ordered]@{
        'Modern Master 2015'='MM2'; 'Eternal masters'='EMA'
        'Double Master'='2XM'; 'Modern Master 2017'='MM3'
        'Modern Master '='MMA'; 'Double master 2022'='2X2'
        'Ultimate master'='UMA'
    }
    '4 Discorde...Sombreland.xlsx' = [ordered]@{
        'Dissencion, discorde'='DIS'; 'Pacte des guildes'='GPT'
        'Ravnica, la cité des guildes'='RAV'; "Vision de l'avenir"='FUT'
        'Chaos Planaire'='PLC'; 'Spirale temporelle'='TSP'
        'Lèveciel'='MOR'; 'Lorwin'='LRW'; 'Couche ciel'='EVE'; 'Sombreland'='SHM'
    }
    '5 Rennaissance...Innistrad.xlsx' = [ordered]@{
        "Rennaissance d'Alara"='ALA'; 'Conflux'='CON'; "Eclat d'Alara"='ARB'
        "L'ascension des Eldrazi"='ROE'; 'Worlwake'='WWK'; 'Zendikar'='ZEN'
        'Nouvelle Phyrexia'='NPH'; 'Lees cicatrices de Mirrodin'='SOM'
        'Avacyne ressuscité'='AVR'; 'Obscur Ascension'='DKA'; 'Innistrad'='ISD'
    }
    '8 Ikoria...Les rue de la nouvelle.xlsx' = [ordered]@{
        'Ikoria, la terre des behemots'='IKO'; 'Rennaissance de Zendikar'='ZNR'
        'Kaldheim'='KHM'; "Strixhaven, l'académie des mage"='STX'
        'Dungeons & Dragon'='AFR'; 'Innistrad, chasse de minuit'='MID'
        'Innistrad, noce écarlate'='VOW'; 'Kamigawa'='NEO'
        'Les rues de la nouvelle capenna'='SNC'
    }
    '10 Meutre.xlsx' = [ordered]@{
        'Meurtre au manoir'='MKM'; 'Bloomburrow'='BLB'; 'Model (2)'='SKIP'
    }
    # === AJOUTER DE NOUVEAUX FICHIERS ICI ===
    # 'NouveauFichier.xlsx' = [ordered]@{ 'Nom de feuille' = 'CODE' }
}

function Clean-Name($name) {
    $name = [string]$name
    $name = $name -replace '\s+[\d][\d\s\*]*$', ''
    return $name.Trim()
}

function Get-BlockSize($sheet) {
    for ($r = 2; $r -le [Math]::Min(5, $sheet.Dimension.Rows); $r++) {
        $v1 = $sheet.Cells[$r, 1].Value
        if ($null -eq $v1 -or [string]::IsNullOrWhiteSpace($v1)) { continue }
        $v4 = $sheet.Cells[$r, 4].Value
        if ($null -ne $v4 -and $v4 -is [string] -and ([string]$v4).Length -gt 2) { return 3 }
        return 4
    }
    return 4
}

function Extract-Sheet($sheet, $setCode) {
    $cards = @()
    if ($null -eq $sheet -or $null -eq $sheet.Dimension) { return $cards }
    $rows = $sheet.Dimension.Rows
    $cols = $sheet.Dimension.Columns
    $blockSize = Get-BlockSize $sheet
    $blockStarts = @()
    for ($b = 1; ($b + 1) -le $cols; $b += $blockSize) { $blockStarts += $b }
    for ($r = 1; $r -le $rows; $r++) {
        foreach ($bs in $blockStarts) {
            $col2 = $bs + 1
            $nameVal = $sheet.Cells[$r, $bs].Value
            $qtyVal  = $sheet.Cells[$r, $col2].Value
            if ($null -eq $nameVal -or [string]::IsNullOrWhiteSpace($nameVal)) { continue }
            $nameStr = [string]$nameVal
            if ($nameStr -match '^CARTES|^TOTAL|^Jeton|^Emblème|^Token|^\d+[\.,]') { continue }
            if ($null -ne $qtyVal -and ($qtyVal -is [double] -or $qtyVal -is [int]) -and $qtyVal -ge 1) {
                $clean = Clean-Name $nameStr
                if ($clean.Length -gt 0) {
                    $cards += [PSCustomObject]@{ name = $clean; set = $setCode; qty = [int][Math]::Floor($qtyVal) }
                }
            }
        }
    }
    return $cards
}

# === EXTRACTION (uniquement les editions pas encore importees) ===
$newCards = @()
$basePath = 'C:\Users\clkev\OneDrive\Desktop\Carte magic\'
$newSets = @{}

foreach ($fileName in $sheetMap.Keys) {
    $filePath = $basePath + $fileName
    if (-not (Test-Path $filePath)) { Write-Host "[MANQUANT] $filePath"; continue }
    try {
        $pkg = Open-ExcelPackage $filePath
        foreach ($sheetName in $sheetMap[$fileName].Keys) {
            $setCode = $sheetMap[$fileName][$sheetName]
            if ($setCode -eq 'SKIP') { continue }
            if ($imported.ContainsKey($setCode)) {
                Write-Host "  [DEJA IMPORTE] $setCode ($sheetName)"
                continue
            }
            $sheet = $pkg.Workbook.Worksheets[$sheetName]
            if ($null -eq $sheet) { continue }
            $cards = Extract-Sheet $sheet $setCode
            if ($cards.Count -gt 0) {
                Write-Host "  [NOUVEAU] $sheetName ($setCode): $($cards.Count) cartes"
                $newCards += $cards
                $newSets[$setCode] = $true
            }
        }
        Close-ExcelPackage $pkg -NoSave
    } catch {
        Write-Host "ERREUR $fileName : $_"
    }
}

if ($newCards.Count -eq 0) {
    Write-Host "`nAucune nouvelle carte a importer. Toutes les editions sont deja dans imported-sets.json."
    Write-Host "Pour re-importer une edition, supprime son code dans $trackFile"
} else {
    # Sauvegarder les nouvelles cartes
    $json = $newCards | ConvertTo-Json -Depth 3
    [System.IO.File]::WriteAllText($outputFile, $json, [System.Text.Encoding]::UTF8)

    # Mettre a jour le fichier de suivi
    foreach ($code in $newSets.Keys) { $imported[$code] = $true }
    $importedJson = $imported | ConvertTo-Json
    [System.IO.File]::WriteAllText($trackFile, $importedJson, [System.Text.Encoding]::UTF8)

    Write-Host "`n=== RESULTAT ==="
    Write-Host "$($newCards.Count) nouvelles cartes extraites"
    Write-Host "Fichier genere: $outputFile"
    Write-Host "Importe ce fichier sur le site (glisser-deposer dans la zone Excel)"
    Write-Host "Les editions traitees ont ete enregistrees dans imported-sets.json"
}
