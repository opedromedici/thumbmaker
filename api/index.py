"""
Gerador de Thumb — entrypoint Vercel serverless (api/index.py)
FastAPI: análise de referência → geração Gemini → extração de elementos editáveis.
Imagens retornadas como base64 data URLs (sem escrita em disco).
"""

import base64
import json
import os
import re
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Gerador de Thumb API", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# templates.json fica em backend/data/ — acessível pelo sistema de arquivos Vercel
_DATA_DIR = Path(__file__).parent.parent / "backend" / "data"

with open(_DATA_DIR / "templates.json", "r", encoding="utf-8") as _f:
    CATEGORIES = json.load(_f)["categories"]

# ---------------------------------------------------------------------------
# Dados
# ---------------------------------------------------------------------------

OBJECTIVE_CONTEXT: dict[str, str] = {
    "dinheiro":      "Resultado financeiro expressivo. Transmite riqueza, conquista e prova social. Usa números grandes, cifrão em destaque, expressão de surpresa ou orgulho.",
    "promessa":      "Promessa clara e irresistível. Transmite transformação rápida e método comprovado. Usa prazo definido, linguagem direta e certeza.",
    "polemica":      "Choque e curiosidade extrema. Quebre expectativas, revele contradições, provoque indignação positiva. Expressão facial de espanto ou revolta.",
    "erro":          "Alerta e prevenção. A pessoa está cometendo um erro que não sabe. Usa símbolos de proibição, expressão de alerta, contraste forte entre certo e errado.",
    "autoridade":    "Credibilidade e expertise. Postura confiante, provas visuais de resultado. Transmite que essa pessoa é a referência no assunto.",
    "transformacao": "Antes vs depois dramático. Contraste visual máximo entre dois estados. Narrativa de superação visível na composição.",
    "tutorial":      "Clareza e didatismo. Estrutura visual organizada, sensação de aprendizado fácil.",
    "historia":      "Conexão emocional e narrativa pessoal. Expressão autêntica, contexto de jornada real.",
}

# ---------------------------------------------------------------------------
# Gemini helpers
# ---------------------------------------------------------------------------

def _api_key() -> str:
    key = os.getenv("GOOGLE_API_KEY", "")
    if not key:
        raise HTTPException(500, "GOOGLE_API_KEY não configurada")
    return key

def _gen_model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-3-pro-image-preview")

VISION_MODEL = "gemini-2.5-flash"


async def _vision_call(api_key: str, prompt: str, image_bytes: bytes, mime: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{VISION_MODEL}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [
            {"text": prompt},
            {"inline_data": {"mime_type": mime, "data": base64.b64encode(image_bytes).decode()}},
        ]}],
        "generationConfig": {"temperature": 0.1},
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()

    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if "text" in part:
                return part["text"]
    return ""


async def _analyze_reference(api_key: str, ref_bytes: bytes, ref_mime: str) -> dict:
    prompt = """Você é um especialista em design de thumbnails virais para YouTube.

Analise esta thumbnail de referência e extraia o sistema visual completo.
Retorne APENAS JSON válido, sem markdown, sem explicações adicionais.

{
  "typography": {
    "headline_font": "família da fonte principal (ex: Impact, Arial Black, Bebas Neue)",
    "headline_weight": "bold ou normal",
    "text_case": "UPPERCASE ou Mixed Case",
    "has_stroke": true ou false,
    "stroke_thickness": "thin/medium/thick",
    "text_colors": ["#hex1", "#hex2"],
    "stroke_colors": ["#hex"],
    "line_count": número de linhas de texto visíveis,
    "text_shadow": true ou false
  },
  "layout": {
    "person_position": "left/right/center/fullwidth",
    "person_crop": "full-body/torso-up/face-close",
    "person_size": "small/medium/large/dominant",
    "text_zone": "left/right/top/bottom/center-overlay",
    "composition_type": "person-left-text-right/person-right-text-left/person-center-text-overlay/split"
  },
  "colors": {
    "background_main": "#hex ou descrição",
    "background_type": "solid/gradient/scene",
    "accent_1": "#hex",
    "accent_2": "#hex"
  },
  "atmosphere": "Descreva em 2-3 frases o clima visual."
}"""
    text = await _vision_call(api_key, prompt, ref_bytes, ref_mime)
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    return {}


def _build_prompt(objective: str, user_prompt: str, ref_analysis: dict,
                   similarity: int = 60, has_extra: bool = False,
                   has_person: bool = True) -> str:
    ctx = OBJECTIVE_CONTEXT.get(objective, "")

    # Calibrar instrução de fidelidade baseada no nível de similaridade
    if similarity <= 30:
        fidelity_header = "REFERÊNCIA VISUAL — USE COMO INSPIRAÇÃO LEVE:"
        fidelity_rule   = f"Nível {similarity}%: Inspire-se APENAS na atmosfera e mood geral. Crie algo original e diferente — layout, cores e tipografia são livres."
    elif similarity <= 70:
        fidelity_header = "REFERÊNCIA VISUAL — SIGA A ESTRUTURA GERAL:"
        fidelity_rule   = f"Nível {similarity}%: Mantenha layout e composição similares. Adapte cores e tipografia ao conteúdo do criador, mas preserve a hierarquia visual."
    else:
        fidelity_header = "REFERÊNCIA VISUAL — REPLIQUE COM MÁXIMA FIDELIDADE:"
        fidelity_rule   = f"Nível {similarity}%: Reproduza QUASE IDENTICAMENTE. Mesmo layout, mesmas cores, mesma tipografia, mesma composição. A thumbnail deve parecer criada pelo mesmo designer da referência."

    ref_section = ""
    if ref_analysis:
        t   = ref_analysis.get("typography", {})
        l   = ref_analysis.get("layout", {})
        c   = ref_analysis.get("colors", {})
        atm = ref_analysis.get("atmosphere", "")
        ref_section = f"""
═══════════════════════════════════════════
{fidelity_header}
{fidelity_rule}
═══════════════════════════════════════════
TIPOGRAFIA:
- Fonte: {t.get('headline_font','Impact')} | Peso: {t.get('headline_weight','bold')} | Caixa: {t.get('text_case','UPPERCASE')}
- Contorno: {"SIM" if t.get('has_stroke') else "NÃO"} ({t.get('stroke_thickness','medium')})
- Cores texto: {', '.join(t.get('text_colors',['#FFFFFF']))} | Contorno: {', '.join(t.get('stroke_colors',['#000000']))}
- Linhas: {t.get('line_count',2)} | Sombra: {"SIM" if t.get('text_shadow') else "NÃO"}
LAYOUT: {l.get('composition_type','person-right-text-left')} | Pessoa: {l.get('person_position','right')} {l.get('person_crop','torso-up')} {l.get('person_size','large')} | Texto: {l.get('text_zone','left')}
CORES: Fundo {c.get('background_main','#0D0D1A')} ({c.get('background_type','solid')}) | Destaque {c.get('accent_1','#FFD700')} / {c.get('accent_2','#FFFFFF')}
ATMOSFERA: {atm}
═══════════════════════════════════════════
"""

    person_rule = (
        "- A PRIMEIRA IMAGEM enviada é a pessoa protagonista — inclua ela de forma clara e visível na thumbnail"
        if has_person else
        "- Crie uma composição visualmente impactante mesmo sem foto de pessoa"
    )
    extra_rule = (
        "\n- A ÚLTIMA IMAGEM enviada é um elemento gráfico extra (logo/sticker/overlay) — posicione-o de forma harmoniosa e visível na composição, respeitando a hierarquia visual."
        if has_extra else ""
    )

    return f"""Você é um especialista em criação de thumbnails virais para YouTube com alto CTR.

OBJETIVO: {ctx}
{ref_section}
INSTRUÇÃO DO CRIADOR: {user_prompt}

REGRAS ABSOLUTAS:
- Resolução: exatamente 1280x720 pixels, formato 16:9 horizontal
{person_rule}
- ⚠️ CRÍTICO — SEM TEXTO NA IMAGEM: NÃO inclua nenhum texto, palavra, número, letra, título ou legenda na imagem. Zero texto. A composição deve conter APENAS elementos visuais: pessoa, fundo, cores, gradientes, formas gráficas. O texto será adicionado como camada editável separada.
- RESPEITE a estrutura e composição do template: layout, hierarquia visual, posição da pessoa e zonas de design
- Deixe as áreas de texto claramente definidas (contraste/espaço vazio) para receber os títulos depois{extra_rule}

Gere apenas a imagem de fundo sem texto. Nenhum texto explicativo."""


async def _generate_image(api_key: str, prompt: str,
                           person_bytes: bytes, person_mime: str,
                           ref_bytes: bytes | None, ref_mime: str | None,
                           extra_bytes: bytes | None = None, extra_mime: str | None = None) -> bytes:
    model = _gen_model()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    parts: list[dict] = [{"text": prompt}]
    if person_bytes and person_mime:
        parts.append({"inline_data": {"mime_type": person_mime, "data": base64.b64encode(person_bytes).decode()}})
    if ref_bytes and ref_mime:
        parts.append({"inline_data": {"mime_type": ref_mime, "data": base64.b64encode(ref_bytes).decode()}})
    if extra_bytes and extra_mime:
        parts.append({"inline_data": {"mime_type": extra_mime, "data": base64.b64encode(extra_bytes).decode()}})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }
    async with httpx.AsyncClient(timeout=180.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            raise HTTPException(502, f"Gemini erro: {resp.text[:400]}")
        data = resp.json()

    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            img_data = part.get("inlineData") or part.get("inline_data")
            if img_data:
                return base64.b64decode(img_data["data"])

    finish = data.get("candidates", [{}])[0].get("finishReason", "N/A")
    raise HTTPException(502, f"Gemini não retornou imagem. finishReason={finish}")


async def _generate_text_elements(
    api_key: str, objective: str, user_prompt: str, ref_analysis: dict
) -> list[dict]:
    """Gera elementos de texto editáveis a partir do objetivo + prompt + referência.
    Não depende da imagem gerada — evita duplicação de texto no canvas.
    """
    t = ref_analysis.get("typography", {})
    l = ref_analysis.get("layout", {})

    font        = t.get("headline_font", "Anton")
    text_colors = t.get("text_colors", ["#FFFFFF"])
    stroke_cols = t.get("stroke_colors", ["#000000"])
    has_stroke  = t.get("has_stroke", True)
    line_count  = max(1, min(3, int(t.get("line_count", 2))))
    text_case   = t.get("text_case", "UPPERCASE")
    text_zone   = l.get("text_zone", "left")

    # Posição horizontal baseada na zona de texto da referência
    if "right" in text_zone:
        base_x = 700
    elif "center" in text_zone:
        base_x = 300
    else:
        base_x = 60

    fill_color   = text_colors[0] if text_colors else "#FFFFFF"
    stroke_color = stroke_cols[0] if stroke_cols else "#000000"
    stroke_w     = 4 if has_stroke else 0

    ctx = OBJECTIVE_CONTEXT.get(objective, "")
    case_hint = "EM CAIXA ALTA (UPPERCASE)" if "UPPER" in text_case else "em capitalização mista"

    prompt = f"""Você é especialista em copywriting viral para thumbnails de YouTube.

Objetivo da thumbnail: {ctx}
Instrução do criador: {user_prompt if user_prompt.strip() else "(sem instrução adicional)"}
Número de linhas de texto: {line_count}
Estilo: textos {case_hint}, curtos, chocantes, que geram clique

Crie exatamente {line_count} texto(s) impactante(s) para esta thumbnail.
Canvas: 1280x720 pixels. Zona de texto: {text_zone} (x base: {base_x}px).

LINHA 1 (título principal): maior, fonte ~120-140px, y~80
LINHA 2 (subtítulo, se houver): menor, fonte ~75-90px, y~260
LINHA 3 (complemento, se houver): menor ainda, fonte ~60px, y~380

Retorne APENAS JSON válido, sem markdown:
[{{"id":"t0","text":"TEXTO","x":{base_x},"y":80,"fontSize":130,"fontFamily":"{font}","fill":"{fill_color}","stroke":"{stroke_color}","strokeWidth":{stroke_w},"fontWeight":"bold"}}]

Máximo 4 palavras por linha. Sem pontuação desnecessária."""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{VISION_MODEL}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.8},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            return []
        data = resp.json()

    raw = ""
    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if "text" in part:
                raw = part["text"]
                break

    match = re.search(r'\[[\s\S]*\]', raw)
    if match:
        try:
            elements = json.loads(match.group())
            return [
                {
                    "id": el.get("id", f"t{i}"),
                    "text": str(el.get("text", "")),
                    "x": float(el.get("x", base_x)),
                    "y": float(el.get("y", 80 + i * 180)),
                    "fontSize": float(el.get("fontSize", 130 - i * 40)),
                    "fontFamily": str(el.get("fontFamily", font)),
                    "fill": str(el.get("fill", fill_color)),
                    "stroke": el.get("stroke") or stroke_color,
                    "strokeWidth": float(el.get("strokeWidth", stroke_w)),
                    "fontWeight": str(el.get("fontWeight", "bold")),
                }
                for i, el in enumerate(elements[:3])
            ]
        except Exception:
            pass
    return []


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/categories")
def get_categories():
    return CATEGORIES


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    content = await file.read()
    mime = file.content_type or "image/jpeg"
    b64 = base64.b64encode(content).decode()
    return {"url": f"data:{mime};base64,{b64}"}


@app.post("/api/generate")
async def generate_thumbnail(
    objective: str = Form(...),
    prompt: str = Form(""),
    person_image: UploadFile = File(None),
    reference_image: UploadFile = File(None),
    extra_elements: UploadFile = File(None),
    similarity: int = Form(60),
):
    api_key = _api_key()

    if not prompt.strip() and not (person_image and person_image.filename) and not (reference_image and reference_image.filename):
        raise HTTPException(400, "Envie pelo menos um prompt ou uma imagem.")

    person_bytes: bytes | None = None
    person_mime: str | None = None
    if person_image and person_image.filename:
        person_bytes = await person_image.read()
        person_mime = person_image.content_type or "image/jpeg"

    ref_bytes: bytes | None = None
    ref_mime: str | None = None
    if reference_image and reference_image.filename:
        ref_bytes = await reference_image.read()
        ref_mime = reference_image.content_type or "image/jpeg"

    extra_bytes: bytes | None = None
    extra_mime: str | None = None
    if extra_elements and extra_elements.filename:
        extra_bytes = await extra_elements.read()
        extra_mime = extra_elements.content_type or "image/png"

    ref_analysis: dict = {}
    if ref_bytes and ref_mime:
        ref_analysis = await _analyze_reference(api_key, ref_bytes, ref_mime)

    full_prompt = _build_prompt(
        objective, prompt, ref_analysis,
        similarity=max(0, min(100, similarity)),
        has_extra=bool(extra_bytes),
        has_person=bool(person_bytes),
    )

    image_bytes = await _generate_image(
        api_key, full_prompt, person_bytes, person_mime,
        ref_bytes, ref_mime, extra_bytes, extra_mime,
    )

    b64 = base64.b64encode(image_bytes).decode()
    image_url = f"data:image/jpeg;base64,{b64}"

    # Gera textos a partir do prompt/objetivo — não da imagem — evitando duplicação
    elements = await _generate_text_elements(api_key, objective, prompt, ref_analysis)

    return {"url": image_url, "elements": elements, "ref_analysis": ref_analysis}


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.4.0", "model": _gen_model()}
