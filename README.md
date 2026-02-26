Gerador de Thumb — Arquitetura em 3 Camadas
===========================================

Este projeto segue a arquitetura de 3 camadas descrita em `AGENTS.md`:

- **Camada 1 — Diretiva (`directives/`)**: documentos em Markdown que explicam *o que fazer* (objetivo, entradas, saídas, ferramentas e edge cases).
- **Camada 2 — Orquestração (LLM / você)**: lê as diretivas, decide quais scripts executar em qual ordem e atualiza as diretivas conforme aprende.
- **Camada 3 — Execução (`execution/`)**: scripts Python determinísticos que fazem o trabalho de fato (chamadas de API, processamento de imagens, arquivos etc.).

## Estrutura inicial

- **`.tmp/`**: arquivos intermediários/temporários (podem ser apagados a qualquer momento).
- **`execution/`**: scripts Python determinísticos.
  - `generate_thumbnail.py`: esqueleto de script para geração de thumbs.
- **`directives/`**: SOPs em Markdown.
  - `gerador_de_thumb.md`: diretiva principal para geração de thumbnails.
- **`requirements.txt`**: dependências Python do projeto.
- **`.env`**: variáveis de ambiente (chaves de API, configurações etc. — não commitável em repositórios).

## Como evoluir o projeto

1. **Atualize a diretiva** em `directives/gerador_de_thumb.md` com mais detalhes (novos casos de uso, limites de API, formatos de entrada/saída).
2. **Implemente/ajuste scripts** em `execution/` conforme as necessidades descritas na diretiva.
3. **Use a pasta `.tmp/`** apenas para arquivos intermediários que podem ser regenerados.
4. **Mantenha segredos no `.env`** e, se usar Git, garanta que `.env`, `credentials.json` e `token.json` estejam no `.gitignore`.

## Requisitos mínimos (Python)

Instale as dependências:

```bash
pip install -r requirements.txt
```

Depois, o fluxo típico será:

1. Ler a diretiva em `directives/gerador_de_thumb.md`.
2. Ajustar parâmetros/variáveis de ambiente conforme necessário.
3. Executar o script em `execution/generate_thumbnail.py` (ou outros scripts que forem sendo criados).

