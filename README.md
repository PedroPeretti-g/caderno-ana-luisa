# Caderno Ana Luisa Peretti (demonstração)

Aplicativo instalável (PWA) de demonstração para um escritório de arquitetura: agenda de ordens de serviço com status e lista de verificação, fotos de obra com anotação, relatório em PDF e acompanhamento de projetos (etapas, programa de necessidades e honorários).

Os dados são fictícios. Tudo o que você altera fica salvo só no aparelho em que está usando. Depois da primeira abertura, o app funciona sem internet.

## Como instalar

- **Android (Chrome):** menu ⋮ > Instalar app.
- **iPhone (Safari):** Compartilhar > Adicionar à Tela de Início.
- **Computador (Chrome ou Edge):** ícone de instalar na barra de endereço.

## Como atualizar

1. Edite os arquivos (por exemplo `index.html`).
2. Em `sw.js`, aumente o número da constante `CACHE` (de `caderno-al-v2` para `caderno-al-v3`, e assim por diante).
3. Faça commit e push na `main`. O GitHub Pages publica em um ou dois minutos.
4. Nos aparelhos, o app atualiza na abertura seguinte à publicação (às vezes na segunda abertura).

## Como publicar no GitHub Pages

1. Crie um repositório **público** (o GitHub Pages gratuito exige repositório público) e envie estes arquivos para a raiz da branch `main`.
2. Em Settings > Pages, escolha Source: Deploy from a branch, Branch: `main`, pasta `/ (root)`.
3. O endereço será `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Todos os caminhos são relativos, então funciona em subpasta.

## Estrutura

Todos os arquivos ficam na mesma pasta (a raiz do repositório):

- `index.html`: o app inteiro.
- `manifest.webmanifest` e `sw.js`: instalação e modo sem internet.
- `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`: ícones.
- `manrope-latin-wght-normal.woff2` e `newsreader-latin-wght-normal.woff2`: fontes locais.
- `b1.jpg` a `r3.jpg`: ilustrações de exemplo.
- `jspdf.umd.min.js`: biblioteca de PDF.

## Créditos e licenças

- Demonstração criada por Pedro Peretti.
- Imagens de exemplo: ilustrações genéricas criadas para esta demonstração. Nenhuma foto do escritório está incluída; os nomes dos projetos vêm do portfólio público dele.
- Inspiração visual: conceito de app Elune, da New Minds (newminds.studio/elune-app). Nenhum arquivo, texto ou imagem deles foi copiado.
- Tipografia: Manrope e Newsreader, licença SIL Open Font License 1.1 (arquivos de licença em `fonts/`).
- Geração de PDF: jsPDF, licença MIT (em `vendor/`).
