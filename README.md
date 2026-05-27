# WebGIS Viewer

Visualizador geográfico interativo desenvolvido com **HTML, CSS, JavaScript** e **Leaflet.js**, para exploração das camadas **CAR** (Cadastro Ambiental Rural) e **Estado** (limites municipais) no Brasil.

**Demo online:** [https://pedronetoeng10.github.io/f2wPgm/](https://pedronetoeng10.github.io/f2wPgm/)

> Após o primeiro push, ative em **Settings → Pages → Source: GitHub Actions** (ou branch `main` / root).

---

## Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| **Basemaps** | OpenStreetMap, Esri World Imagery, CartoDB Dark Matter |
| **Camadas temáticas** | CAR (polígonos verdes) e Estado (bordas municipais azuis) |
| **Popups** | Atributos das feições ao clicar |
| **Legenda** | Controle de opacidade por camada |
| **Ferramentas** | Geolocalização, medição de distância, minimapa, tela cheia |
| **Responsivo** | Layout adaptado para desktop, tablet e mobile |

---

## Estrutura do projeto

```text
f2wPgm/
├── index.html          # Página principal
├── style.css           # Estilos e layout responsivo
├── script.js           # Lógica do mapa e carregamento GeoJSON
├── README.md
├── .nojekyll           # Necessário para GitHub Pages servir data/
├── start_server.bat    # Servidor local (Windows)
├── server.py           # Servidor Python (desenvolvimento)
├── server.js           # Servidor Node.js (desenvolvimento)
├── package.json
└── data/
    ├── CAR.geojson
    ├── CAR.qmd
    ├── estado.geojson
    └── estado.qmd
```

---

## Uso online (GitHub Pages)

Acesse diretamente:

```text
https://pedronetoeng10.github.io/f2wPgm/
```

Os GeoJSON são carregados via `fetch()` com caminhos relativos (`data/CAR.geojson`, `data/estado.geojson`).

---

## Desenvolvimento local

Navegadores bloqueiam `fetch()` em arquivos abertos pelo Explorer (`file://`). Use um servidor local:

### Opção 1 — Duplo clique (Windows)

1. Execute **`start_server.bat`**
2. Acesse **http://localhost:3000**

### Opção 2 — Python

```bash
python server.py
```

### Opção 3 — Node.js

```bash
npm install
npm start
```

---

## Deploy no GitHub Pages

1. Envie o projeto para o repositório [pedronetoeng10/f2wPgm](https://github.com/pedronetoeng10/f2wPgm)
2. Em **Settings → Pages**, configure:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
3. Aguarde 1–3 minutos e acesse a URL pública

### Atualizar o site

```bash
git add .
git commit -m "Atualização do WebGIS"
git push
```

---

## Camadas

| Camada | Arquivo | Feições | Estilo |
|--------|---------|---------|--------|
| **CAR** | `data/CAR.geojson` | ~3.639 | Polígonos verdes semi-transparentes |
| **Estado** | `data/estado.geojson` | ~144 | Borda azul, preenchimento transparente |

Arquivos `.qmd` contêm metadados QGIS; a simbologia visual usa estilos definidos no código.

---

## Performance

- GeoJSON carregados em blocos (camada CAR)
- Popups sob demanda (lazy) na camada CAR
- Renderer Canvas para melhor desempenho com muitos polígonos
- Estado carregado primeiro para `fitBounds` imediato

> **Dica:** mantenha os GeoJSON abaixo de ~10 MB por arquivo para melhor experiência no GitHub Pages.

---

## Solução de problemas

| Problema | Solução |
|----------|---------|
| Tela de aviso ao abrir HTML direto | Use `start_server.bat` ou a URL do GitHub Pages |
| Falha ao carregar camadas | Verifique pasta `data/`, recarregue (F5) e abra o console (F12) |
| GitHub Pages sem camadas | Confirme que `data/*.geojson` foram enviados ao repositório |
| Porta 3000 em uso | `set PORT=3001` antes de iniciar o servidor |
| Mapa em branco | Verifique conexão com internet (basemaps via CDN) |

---

## Tecnologias

- [Leaflet.js 1.9.4](https://leafletjs.com/)
- OpenStreetMap / Esri / CARTO (tiles)
- GeoJSON + metadados QGIS (QMD)

---

## Licença

Projeto acadêmico — Pós-graduação. Dados geográficos conforme fontes originais dos arquivos GeoJSON.
