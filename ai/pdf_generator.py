"""
BLOC 2 — Script 3/3
ReportLab — 100% natif Windows, sans dépendances GTK/Pango.
Prend un Markdown structuré, génère un PDF stylé.
Retourne le chemin absolu du PDF créé.
"""

import os
import re
import sys
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    ListFlowable,
    ListItem,
)
from reportlab.lib.enums import TA_JUSTIFY

OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./data/outputs")

BLACK = HexColor("#111111")
DARK_GREY = HexColor("#333333")
MID_GREY = HexColor("#666666")
LIGHT_GREY = HexColor("#f5f5f5")
BORDER = HexColor("#cccccc")


def build_styles():
    return {
        "h1": ParagraphStyle(
            "H1",
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=26,
            textColor=BLACK,
            spaceAfter=6,
        ),
        "h2": ParagraphStyle(
            "H2",
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=18,
            textColor=BLACK,
            spaceBefore=18,
            spaceAfter=4,
        ),
        "h3": ParagraphStyle(
            "H3",
            fontName="Helvetica-BoldOblique",
            fontSize=11,
            leading=15,
            textColor=DARK_GREY,
            spaceBefore=12,
            spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "Body",
            fontName="Times-Roman",
            fontSize=10.5,
            leading=16,
            textColor=DARK_GREY,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "summary": ParagraphStyle(
            "Summary",
            fontName="Times-Italic",
            fontSize=10.5,
            leading=16,
            textColor=HexColor("#444444"),
            backColor=LIGHT_GREY,
            borderPadding=(8, 12, 8, 12),
            spaceAfter=14,
            alignment=TA_JUSTIFY,
        ),
        "blockquote": ParagraphStyle(
            "Blockquote",
            fontName="Times-Italic",
            fontSize=10,
            leading=15,
            textColor=MID_GREY,
            leftIndent=20,
            backColor=HexColor("#fafafa"),
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            fontName="Times-Roman",
            fontSize=10.5,
            leading=15,
            textColor=DARK_GREY,
            leftIndent=16,
            spaceAfter=3,
        ),
    }


def inline_md(text: str) -> str:
    """Markdown inline → balises ReportLab."""
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*(.+?)\*", r"<i>\1</i>", text)
    text = re.sub(r"_(.+?)_", r"<i>\1</i>", text)
    text = re.sub(r"`(.+?)`", r'<font name="Courier" size="9">\1</font>', text)
    return text


def parse_markdown(md: str, styles: dict) -> list:
    story = []
    lines = md.split("\n")
    i = 0
    first_para = True

    while i < len(lines):
        line = lines[i]
        s = line.strip()

        if not s:
            i += 1
            continue

        if s.startswith("# ") and not s.startswith("## "):
            story.append(Paragraph(inline_md(s[2:].strip()), styles["h1"]))
            story.append(
                HRFlowable(width="100%", thickness=1.5, color=BLACK, spaceAfter=10)
            )
            i += 1
            continue

        if s.startswith("## ") and not s.startswith("### "):
            story.append(
                HRFlowable(
                    width="100%",
                    thickness=0.5,
                    color=BORDER,
                    spaceBefore=6,
                    spaceAfter=4,
                )
            )
            story.append(Paragraph(inline_md(s[3:].strip()), styles["h2"]))
            i += 1
            continue

        if s.startswith("### "):
            story.append(Paragraph(inline_md(s[4:].strip()), styles["h3"]))
            i += 1
            continue

        if s in ("---", "***", "___"):
            story.append(
                HRFlowable(
                    width="100%",
                    thickness=0.5,
                    color=BORDER,
                    spaceBefore=8,
                    spaceAfter=8,
                )
            )
            i += 1
            continue

        if s.startswith("> "):
            story.append(Paragraph(inline_md(s[2:].strip()), styles["blockquote"]))
            i += 1
            continue

        if re.match(r"^[-*]\s", s) or re.match(r"^\d+\.\s", s):
            items = []
            while i < len(lines) and (
                re.match(r"^[-*]\s", lines[i].strip())
                or re.match(r"^\d+\.\s", lines[i].strip())
            ):
                item_text = re.sub(r"^[-*]\s|\d+\.\s", "", lines[i].strip())
                items.append(
                    ListItem(
                        Paragraph(inline_md(item_text), styles["bullet"]),
                        bulletColor=DARK_GREY,
                        leftIndent=16,
                    )
                )
                i += 1
            story.append(
                ListFlowable(items, bulletType="bullet", start="•", leftIndent=12)
            )
            story.append(Spacer(1, 4))
            continue

        # Paragraphe normal
        if first_para and not s.startswith("#"):
            story.append(Paragraph(inline_md(s), styles["summary"]))
            first_para = False
        else:
            story.append(Paragraph(inline_md(s), styles["body"]))
            first_para = False
        i += 1

    return story


def footer_canvas(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MID_GREY)
    canvas.drawCentredString(A4[0] / 2, 1.2 * cm, str(doc.page))
    canvas.restoreState()


def generate_pdf(markdown_text: str, title: str = None) -> str:
    if not markdown_text.strip():
        raise ValueError("Le contenu Markdown est vide.")

    output_dir = Path(OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    if title is None:
        match = re.search(r"^#\s+(.+)$", markdown_text, re.MULTILINE)
        title = match.group(1).strip() if match else "cours"

    safe_title = re.sub(r"[^\w\s-]", "", title).strip()
    safe_title = re.sub(r"\s+", "_", safe_title)[:60]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = output_dir / f"{safe_title}_{timestamp}.pdf"

    print(f"[pdf] Génération : {output_path}", flush=True)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=2.8 * cm,
        rightMargin=2.8 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
        title=title,
    )

    story = parse_markdown(markdown_text, build_styles())
    doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)

    print(
        f"[pdf] ✅ {output_path.stat().st_size // 1024} Ko → {output_path}", flush=True
    )
    return str(output_path.resolve())


if __name__ == "__main__":
    test_md = """# La Photosynthèse

La photosynthèse est le processus fondamental par lequel les végétaux produisent leur énergie.

## Introduction

La photosynthèse constitue le mécanisme central de la biologie végétale.

## Les deux phases

### La phase lumineuse

**Définition :** Étape où l'énergie solaire est captée par les chlorophylles.

> Exemple : Une feuille exposée au soleil absorbe les photons rouges et bleus.

### Le cycle de Calvin

**Définition :** Étape de fixation du CO₂ en matière organique.

## Conclusion

Un processus en deux étapes interdépendantes, fondement de la vie sur Terre.

## Points clés

- CO₂ + H₂O → glucose + O₂
- Se déroule dans les chloroplastes
- Phase lumineuse + cycle de Calvin
"""
    path = generate_pdf(test_md)
    print(f"\n✅ PDF généré : {path}")
