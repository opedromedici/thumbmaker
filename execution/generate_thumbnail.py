import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont


def load_settings() -> dict:
    """
    Carrega configurações do arquivo .env e de variáveis de ambiente.

    Nenhuma chave sensível deve ser hardcoded aqui; use apenas variáveis.
    """
    load_dotenv()

    output_dir = os.getenv("THUMB_OUTPUT_DIR", ".tmp/output")
    width = int(os.getenv("THUMB_WIDTH", "1280"))
    height = int(os.getenv("THUMB_HEIGHT", "720"))
    background_color = os.getenv("THUMB_BG_COLOR", "#000000")
    text_color = os.getenv("THUMB_TEXT_COLOR", "#FFFFFF")
    default_font_path = os.getenv("THUMB_FONT_PATH", "")

    return {
        "output_dir": output_dir,
        "width": width,
        "height": height,
        "background_color": background_color,
        "text_color": text_color,
        "default_font_path": default_font_path,
    }


def ensure_output_dir(path: str) -> Path:
    """Garante que o diretório de saída exista."""
    output_path = Path(path)
    output_path.mkdir(parents=True, exist_ok=True)
    return output_path


def create_basic_thumbnail(
    text: str,
    title: Optional[str] = None,
    settings: Optional[dict] = None,
) -> Path:
    """
    Gera uma thumbnail simples com fundo sólido e texto centralizado.

    Esta função é um ponto de partida determinístico. Ela pode (e deve)
    ser estendida conforme a evolução da diretiva.
    """
    if settings is None:
        settings = load_settings()

    width = settings["width"]
    height = settings["height"]
    background_color = settings["background_color"]
    text_color = settings["text_color"]
    output_dir = ensure_output_dir(settings["output_dir"])

    image = Image.new("RGB", (width, height), color=background_color)
    draw = ImageDraw.Draw(image)

    # Fonte: tenta usar caminho configurado; se falhar, usa fonte padrão
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont
    font_path = settings.get("default_font_path") or ""
    try:
        if font_path:
            font = ImageFont.truetype(font_path, size=int(height * 0.08))
        else:
            raise OSError("Fonte não configurada.")
    except OSError:
        font = ImageFont.load_default()

    # Calcula posição do texto (centralizado aproximadamente)
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    x = (width - text_width) / 2
    y = (height - text_height) / 2

    draw.text((x, y), text, font=font, fill=text_color)

    # Nome de arquivo determinístico simples
    safe_title = (title or text)[:50].replace(" ", "_")
    filename = f"{safe_title or 'thumb'}.png"
    output_path = output_dir / filename

    image.save(output_path, format="PNG")
    return output_path


def main() -> None:
    """
    Entry point simples via CLI.

    Exemplo de uso:
        python execution/generate_thumbnail.py "Meu Título de Thumb"
    """
    import argparse

    parser = argparse.ArgumentParser(description="Gerador simples de thumbnails.")
    parser.add_argument("text", help="Texto principal da thumbnail.")
    parser.add_argument(
        "--title",
        help="Título curto para nomear o arquivo de saída (opcional).",
        default=None,
    )
    args = parser.parse_args()

    output_path = create_basic_thumbnail(text=args.text, title=args.title)
    print(f"Thumbnail gerada em: {output_path}")


if __name__ == "__main__":
    main()

