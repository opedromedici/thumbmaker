# Diretiva — Gerador de Thumb

## Objetivo

Criar thumbnails (imagens de capa) de forma determinística e reproduzível, a partir de:

- **Entradas principais**:
  - Texto-título e/ou copy da thumb.
  - Dimensões desejadas (ex.: 1280x720).
  - Paleta de cores ou tema (opcional).
  - Caminho(s) de imagem base (opcional).
- **Saídas**:
  - Arquivo(s) de imagem final em `.png` ou `.jpg`, salvos em um diretório definido.
  - Logs/metadata em `.json` (opcional) com parâmetros usados na geração.

## Camada 3 — Scripts de Execução

Scripts vivem em `execution/` e devem ser usados como ferramentas determinísticas:

- **Script principal sugerido**: `execution/generate_thumbnail.py`
  - **Responsabilidade**: receber parâmetros (CLI ou função), carregar configurações do `.env` e gerar uma imagem de thumbnail.
  - **Operações típicas**:
    - Ler variáveis de ambiente (ex.: diretório de saída, cores padrão, fontes padrão).
    - Carregar imagens base (se fornecidas).
    - Renderizar o texto na imagem (usando Pillow).
    - Salvar a thumb em um diretório de saída (por padrão algo como `.tmp/output/`).

Outros scripts podem ser adicionados conforme a necessidade (ex.: `batch_generate_thumbnails.py`).

## Camada 2 — Orquestração (Você / LLM)

Quando for gerar thumbs, siga sempre este fluxo:

1. **Ler esta diretiva** e validar se já existe script adequado em `execution/`.
2. **Preferir usar scripts existentes** em vez de reimplementar lógica manualmente.
3. Se algo falhar:
   - Ler a mensagem de erro e o stack trace.
   - Corrigir o script em `execution/`.
   - Testar novamente.
   - Atualizar esta diretiva com o aprendizado (ex.: limites de API, problemas de fonte, formatos incompatíveis).

## Camada 1 — Entradas e Saídas (SOP)

### Entradas esperadas do usuário

- **Título/copy** da thumb (string).
- **Resolução alvo** (largura x altura, padrão 1280x720).
- **Diretório de saída** (pode vir de variável de ambiente, ex.: `THUMB_OUTPUT_DIR`).
- **Imagem base opcional** (caminho para arquivo).

### Saídas esperadas

- Arquivo de imagem salvo no diretório de saída.
- Nome do arquivo deve ser determinístico a partir de título + timestamp ou UUID.

## Edge Cases a considerar (para evoluções futuras)

- Texto muito longo para caber na thumb.
- Falta de fonte instalada compatível com caracteres especiais.
- Caminho de imagem base inexistente ou corrompida.
- Permissões de escrita no diretório de saída.

Documente aqui qualquer novo edge case encontrado à medida que o sistema evoluir.

