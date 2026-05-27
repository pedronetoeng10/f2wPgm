# Cria e vincula um GitHub Project ao repositório f2wPgm
# Pré-requisito: gh auth login (uma vez)

$ErrorActionPreference = "Stop"
$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
    $gh = "$env:LOCALAPPDATA\Programs\GitHub CLI\gh.exe"
}
if (-not (Test-Path $gh)) {
    Write-Host "Instale o GitHub CLI: winget install GitHub.cli"
    exit 1
}

& $gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Faça login primeiro: gh auth login"
    Write-Host "Depois execute este script novamente."
    exit 1
}

$owner = "pedronetoeng10"
$repo = "f2wPgm"
$title = "WebGIS Viewer - f2wPgm"
$url = "https://pedronetoeng10.github.io/f2wPgm/"

Write-Host "Criando projeto GitHub..."
$created = & $gh project create --owner $owner --title $title --format json | ConvertFrom-Json
$number = $created.number

Write-Host "Vinculando ao repositório $owner/$repo..."
& $gh project link $number --owner $owner --repo $repo

Write-Host "Adicionando itens ao quadro..."
$items = @(
    @{ title = "Site público do WebGIS"; body = "URL: $url" },
    @{ title = "Camada CAR"; body = "Polígonos do Cadastro Ambiental Rural (data/CAR.geojson)" },
    @{ title = "Camada Estado"; body = "Limites municipais (data/estado.geojson)" },
    @{ title = "Deploy GitHub Pages"; body = "Publicado em: $url" }
)

foreach ($item in $items) {
    & $gh project item-create $number --owner $owner --title $item.title --body $item.body
}

Write-Host ""
Write-Host "Projeto criado e vinculado."
Write-Host "Abra: https://github.com/$owner/$repo/projects"
