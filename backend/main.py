"""
Backend — Gerador de Thumb v0.4
FastAPI: análise de referência → geração Gemini → extração de elementos editáveis.
Imagens retornadas como base64 data URLs (compatível com Vercel serverless).
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
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="Gerador de Thumb API", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

with open(BASE_DIR / "data" / "templates.json", "r", encoding="utf-8") as f:
    CATEGORIES = json.load(f)["categories"]

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
    """Chama Gemini Vision (texto) e retorna a resposta textual."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{VISION_MODEL}:generateContent?key={api_key}"
    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime, "data": base64.b64encode(image_bytes).decode()}},
            ]
        }],
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


# ---------------------------------------------------------------------------
# Step 1 — Analyze reference thumbnail (design system)
# ---------------------------------------------------------------------------

async def _analyze_reference(api_key: str, ref_bytes: bytes, ref_mime: str) -> dict:
    """Extrai o design system da thumbnail de referência via Gemini Vision."""
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
  "atmosphere": "Descreva em 2-3 frases o clima visual: contraste, intensidade, tipo de impacto emocional que a thumbnail provoca."
}"""

    text = await _vision_call(api_key, prompt, ref_bytes, ref_mime)
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    return {}


# ---------------------------------------------------------------------------
# Step 2 — Build generation prompt
# ---------------------------------------------------------------------------

def _build_prompt(objective: str, user_prompt: str, ref_analysis: dict) -> str:
    ctx = OBJECTIVE_CONTEXT.get(objective, "")

    ref_section = ""
    if ref_analysis:
        t = ref_analysis.get("typography", {})
        l = ref_analysis.get("layout", {})
        c = ref_analysis.get("colors", {})
        atm = ref_analysis.get("atmosphere", "")

        ref_section = f"""
═══════════════════════════════════════════
DESIGN SYSTEM DA REFERÊNCIA — SIGA RIGOROSAMENTE:
═══════════════════════════════════════════

TIPOGRAFIA:
- Fonte principal: {t.get('headline_font', 'Impact')}
- Peso: {t.get('headline_weight', 'bold')} | Caixa: {t.get('text_case', 'UPPERCASE')}
- Contorno no texto: {"SIM" if t.get('has_stroke') else "NÃO"}, espessura: {t.get('stroke_thickness', 'medium')}
- Cores do texto: {', '.join(t.get('text_colors', ['#FFFFFF']))}
- Cores do contorno: {', '.join(t.get('stroke_colors', ['#000000']))}
- Linhas de texto: {t.get('line_count', 2)}
- Sombra no texto: {"SIM" if t.get('text_shadow') else "NÃO"}

LAYOUT E COMPOSIÇÃO:
- Tipo de composição: {l.get('composition_type', 'person-right-text-left')}
- Posição da pessoa: {l.get('person_position', 'right')}
- Corte da pessoa: {l.get('person_crop', 'torso-up')}
- Tamanho da pessoa: {l.get('person_size', 'large')}
- Zona do texto: {l.get('text_zone', 'left')}

CORES:
- Fundo: {c.get('background_main', '#0D0D1A')} ({c.get('background_type', 'solid')})
- Destaque 1: {c.get('accent_1', '#FFD700')}
- Destaque 2: {c.get('accent_2', '#FFFFFF')}

ATMOSFERA: {atm}
═══════════════════════════════════════════
"""

    return f"""Você é um especialista em criação de thumbnails virais para YouTube com alto CTR.

OBJETIVO DO VÍDEO: {ctx}

{ref_section}
INSTRUÇÃO DO CRIADOR:
{user_prompt}

REGRAS ABSOLUTAS (independente do acima):
- Resolução: exatamente 1280x720 pixels, formato 16:9 horizontal
- A PRIMEIRA IMAGEM enviada é a pessoa protagonista — inclua ela de forma clara e visível
- Reproduza fielmente a composição, tipografia e paleta de cores da referência
- O texto na thumbnail deve ser curto, impactante (máximo 4 palavras por linha)
- Contraste alto, cores vibrantes, expressão facial intensa relacionada ao objetivo
- A thumbnail deve parecer criada pelo mesmo designer da referência

Gere apenas a imagem final da thumbnail. Nenhum texto explicativo."""


# ---------------------------------------------------------------------------
# Step 3 — Generate image
# ---------------------------------------------------------------------------

async def _generate_image(api_key: str, prompt: str,
                           person_bytes: bytes, person_mime: str,
                           ref_bytes: bytes | None, ref_mime: str | None) -> bytes:
    model = _gen_model()
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{model}:generateContent?key={api_key}")

    parts: list[dict] = [
        {"text": prompt},
        {"inline_data": {"mime_type": person_mime, "data": base64.b64encode(person_bytes).decode()}},
    ]
    if ref_bytes and ref_mime:
        parts.append({"inline_data": {"mime_type": ref_mime, "data": base64.b64encode(ref_bytes).decode()}})

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


# ---------------------------------------------------------------------------
# Step 4 — Extract editable elements from generated image
# ---------------------------------------------------------------------------

async def _extract_elements(api_key: str, image_bytes: bytes) -> list[dict]:
    """Analisa a imagem gerada e extrai elementos de texto como objetos Fabric.js."""
    prompt = """Analise esta thumbnail (1280x720 pixels) e identifique TODOS os textos visíveis.

Para cada texto, retorne coordenadas EXATAS em pixels no espaço 1280x720.
Retorne APENAS um array JSON válido, sem markdown ou explicações.

Formato de cada elemento:
{
  "id": "elemento_N",
  "text": "texto exato como aparece na imagem",
  "x": posição X do início do texto (pixels, 0-1280),
  "y": posição Y do topo do texto (pixels, 0-720),
  "fontSize": tamanho da fonte em pixels (ex: 120 para texto grande),
  "fontFamily": "Impact",
  "fill": "#RRGGBB cor do texto",
  "stroke": "#RRGGBB cor do contorno ou null se não houver",
  "strokeWidth": espessura do contorno em pixels (0 se sem contorno),
  "fontWeight": "normal ou bold"
}

Identifique cada linha de texto separadamente.
Seja preciso — as coordenadas posicionam objetos editáveis sobre a imagem.
Se não houver texto, retorne []."""

    text = await _vision_call(api_key, prompt, image_bytes, "image/jpeg")
    match = re.search(r'\[[\s\S]*\]', text)
    if match:
        try:
            elements = json.loads(match.group())
            clean = []
            for i, el in enumerate(elements):
                clean.append({
                    "id": el.get("id", f"text_{i}"),
                    "text": str(el.get("text", "")),
                    "x": float(el.get("x", 60)),
                    "y": float(el.get("y", 100 + i * 120)),
                    "fontSize": float(el.get("fontSize", 80)),
                    "fontFamily": str(el.get("fontFamily", "Impact")),
                    "fill": str(el.get("fill", "#FFFFFF")),
                    "stroke": el.get("stroke") or None,
                    "strokeWidth": float(el.get("strokeWidth", 0)),
                    "fontWeight": str(el.get("fontWeight", "normal")),
                })
            return clean
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
    """Retorna a imagem como base64 data URL (sem escrita em disco)."""
    content = await file.read()
    mime = file.content_type or "image/jpeg"
    b64 = base64.b64encode(content).decode()
    return {"url": f"data:{mime};base64,{b64}"}


@app.post("/api/generate")
async def generate_thumbnail(
    objective: str = Form(...),
    prompt: str = Form(...),
    person_image: UploadFile = File(...),
    reference_image: UploadFile = File(None),
):
    api_key = _api_key()

    person_bytes = await person_image.read()
    person_mime = person_image.content_type or "image/jpeg"

    ref_bytes: bytes | None = None
    ref_mime: str | None = None
    if reference_image and reference_image.filename:
        ref_bytes = await reference_image.read()
        ref_mime = reference_image.content_type or "image/jpeg"

    # ── 1. Analisa o design system da referência ──────────────────
    ref_analysis: dict = {}
    if ref_bytes and ref_mime:
        ref_analysis = await _analyze_reference(api_key, ref_bytes, ref_mime)

    # ── 2. Monta prompt enriquecido ───────────────────────────────
    full_prompt = _build_prompt(objective, prompt, ref_analysis)

    # ── 3. Gera a thumbnail ───────────────────────────────────────
    image_bytes = await _generate_image(
        api_key, full_prompt, person_bytes, person_mime, ref_bytes, ref_mime
    )

    # ── 4. Retorna como base64 data URL (sem escrita em disco) ────
    b64 = base64.b64encode(image_bytes).decode()
    image_url = f"data:image/jpeg;base64,{b64}"

    # ── 5. Extrai elementos de texto editáveis ────────────────────
    elements = await _extract_elements(api_key, image_bytes)

    return {"url": image_url, "elements": elements, "ref_analysis": ref_analysis}


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.4.0", "model": _gen_model()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
