use anyhow::{Context, Result};
use printpdf::*;
use std::fs::File;
use std::io::BufWriter;
use std::path::PathBuf;
use chrono::Local;

pub fn generate_pdf(markdown: &str, output_dir: &str) -> Result<String> {
    // Extrait le titre du H1
    let title = markdown.lines()
        .find(|l| l.starts_with("# ") && !l.starts_with("## "))
        .map(|l| l[2..].trim().to_string())
        .unwrap_or_else(|| "cours".to_string());

    // Nom de fichier
    let safe_title: String = title.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' { c } else { '_' })
        .collect::<String>()
        .chars().take(60).collect();
    let timestamp = Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("{}_{}.pdf", safe_title, timestamp);

    let output_path = PathBuf::from(output_dir).join(&filename);
    std::fs::create_dir_all(output_dir)?;

    // Dimensions A4
    let (doc, page1, layer1) = PdfDocument::new(
        &title,
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );

    let font_regular = doc.add_builtin_font(BuiltinFont::TimesRoman)?;
    let font_bold    = doc.add_builtin_font(BuiltinFont::TimesBold)?;
    let font_italic  = doc.add_builtin_font(BuiltinFont::TimesItalic)?;
    let font_mono    = doc.add_builtin_font(BuiltinFont::Courier)?;

    let mut renderer = PdfRenderer {
        doc: &doc,
        font_regular: &font_regular,
        font_bold: &font_bold,
        font_italic: &font_italic,
        font_mono: &font_mono,
        current_page: page1,
        current_layer: layer1,
        y: 270.0,
        margin_left: 25.0,
        margin_right: 185.0,
        page_num: 1,
    };

    renderer.render_markdown(markdown)?;

    // Sauvegarde
    doc.save(&mut BufWriter::new(
        File::create(&output_path).context("Impossible de créer le PDF")?
    ))?;

    Ok(output_path.to_str().unwrap().to_string())
}

struct PdfRenderer<'a> {
    doc: &'a PdfDocumentReference,
    font_regular: &'a IndirectFontRef,
    font_bold: &'a IndirectFontRef,
    font_italic: &'a IndirectFontRef,
    font_mono: &'a IndirectFontRef,
    current_page: PdfPageIndex,
    current_layer: PdfLayerIndex,
    y: f32,
    margin_left: f32,
    margin_right: f32,
    page_num: u32,
}

impl<'a> PdfRenderer<'a> {
    fn get_layer(&self) -> PdfLayerReference {
        self.doc.get_page(self.current_page).get_layer(self.current_layer)
    }

    fn new_page(&mut self) {
        let (page, layer) = self.doc.add_page(Mm(210.0), Mm(297.0),
            &format!("Layer {}", self.page_num + 1));
        self.current_page = page;
        self.current_layer = layer;
        self.y = 270.0;
        self.page_num += 1;
    }

    fn check_page_break(&mut self, needed: f32) {
        if self.y - needed < 20.0 {
            self.new_page();
        }
    }

    fn write_line(&mut self, text: &str, font: &'a IndirectFontRef,
                  size: f32, x: f32, color: (f32, f32, f32)) {
        self.check_page_break(size * 0.4 + 3.0);
        let layer = self.get_layer();
        layer.set_fill_color(Color::Rgb(Rgb::new(color.0, color.1, color.2, None)));
        layer.use_text(text, size, Mm(x), Mm(self.y), font);
        self.y -= size * 0.4 + 3.0;
    }

    fn render_markdown(&mut self, markdown: &str) -> Result<()> {
        for line in markdown.lines() {
            let s = line.trim();
            if s.is_empty() {
                self.y -= 3.0;
                continue;
            }
            if s.starts_with("### ") {
                self.y -= 2.0;
                self.write_line(&s[4..], self.font_bold, 11.0,
                    self.margin_left, (0.2, 0.2, 0.2));
                self.y -= 1.0;
            } else if s.starts_with("## ") {
                self.y -= 4.0;
                self.write_line(&s[3..], self.font_bold, 13.0,
                    self.margin_left, (0.05, 0.05, 0.05));
                self.y -= 2.0;
            } else if s.starts_with("# ") && !s.starts_with("## ") {
                self.write_line(&s[2..], self.font_bold, 18.0,
                    self.margin_left, (0.0, 0.0, 0.0));
                self.y -= 4.0;
            } else if s.starts_with("> ") {
                self.write_line(&format!("  {}", &s[2..]), self.font_italic,
                    10.0, self.margin_left + 5.0, (0.3, 0.3, 0.3));
            } else if s.starts_with("- ") || s.starts_with("* ") {
                self.write_line(&format!("• {}", &s[2..]), self.font_regular,
                    10.0, self.margin_left + 5.0, (0.2, 0.2, 0.2));
            } else if s.starts_with("---") {
                self.y -= 3.0;
                let layer = self.get_layer();
                let line = Line {
                    points: vec![
                        (Point::new(Mm(self.margin_left), Mm(self.y)), false),
                        (Point::new(Mm(self.margin_right), Mm(self.y)), false),
                    ],
                    is_closed: false,
                };
                layer.set_outline_color(Color::Rgb(Rgb::new(0.8, 0.8, 0.8, None)));
                layer.add_line(line);
                self.y -= 4.0;
            } else {
                // Paragraphe normal — wrap basique
                let chars_per_line = 90usize;
                let clean = strip_inline_md(s);
                for chunk in wrap_text(&clean, chars_per_line) {
                    self.write_line(&chunk, self.font_regular, 10.0,
                        self.margin_left, (0.15, 0.15, 0.15));
                }
            }
        }
        Ok(())
    }
}

/// Retire le Markdown inline gras/italique pour le texte brut PDF
fn strip_inline_md(text: &str) -> String {
    let t = text.replace("**", "").replace("__", "");
    let t = t.replace('*', "").replace('_', "");
    t
}

/// Coupe le texte en lignes de max `width` caractères
fn wrap_text(text: &str, width: usize) -> Vec<String> {
    let mut lines = Vec::new();
    let mut current = String::new();
    for word in text.split_whitespace() {
        if current.len() + word.len() + 1 > width && !current.is_empty() {
            lines.push(current.trim().to_string());
            current = String::new();
        }
        current.push_str(word);
        current.push(' ');
    }
    if !current.trim().is_empty() {
        lines.push(current.trim().to_string());
    }
    lines
}
