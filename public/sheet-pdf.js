import { PDFDocument, StandardFonts, rgb } from './vendor/pdf-lib-1.17.1.js';

const pageWidth = 595.28;
const pageHeight = 841.89;
const left = 48;
const right = pageWidth - left;
const textWidth = right - left;
const ink = rgb(.13, .13, .12);
const muted = rgb(.32, .32, .29);
const accent = rgb(.53, .15, .11);

// Built-in PDF fonts keep ordinary credits searchable. A canvas fallback preserves
// names and symbols outside the Windows Latin repertoire without network fonts.
function textMetrics(context, font, size, text, bold) {
  try { return { width: font.widthOfTextAtSize(text, size), native: true }; }
  catch {
    context.font = (bold ? 'bold ' : '') + size + 'px Arial, sans-serif';
    return { width: context.measureText(text).width, native: false };
  }
}

function wrapped(input, widthOf) {
  const lines = [];
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('es', {granularity: 'grapheme'}) : null;
  for (const paragraph of input.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/u)) {
      const next = line ? line + ' ' + word : word;
      if (widthOf(next) <= textWidth) { line = next; continue; }
      if (line) lines.push(line);
      line = '';
      if (widthOf(word) <= textWidth) { line = word; continue; }
      const letters = segmenter ? Array.from(segmenter.segment(word), part => part.segment) : Array.from(word);
      for (const ch of letters) {
        if (line && widthOf(line + ch) > textWidth) { lines.push(line); line = ''; }
        line += ch;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function createSheetPdf(data, reviews) {
  const pdf = await PDFDocument.create();
  const title = data.title.trim() || 'Obra sin título';
  pdf.setTitle('Ficha de publicación · ' + title);
  pdf.setSubject('Registro de materiales, aportes y revisiones');
  pdf.setCreator('Pulso Propio');
  pdf.setLanguage('es-PE');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let page;
  let y;
  function line(yValue) {
    page.drawLine({start: {x: left, y:yValue}, end: {x:right, y:yValue}, thickness: .7, color: rgb(.77,.76,.72)});
  }
  function newPage() {
    page = pdf.addPage([pageWidth, pageHeight]);
    page.drawText('PULSO PROPIO', {x:left, y:pageHeight - 45, size:11, font:bold, color:accent});
    const folio = 'CUADERNO DE PRODUCCIÓN';
    page.drawText(folio, {x:right - regular.widthOfTextAtSize(folio, 9), y:pageHeight - 44, size:9, font:regular, color:muted});
    line(pageHeight - 59);
    y = pageHeight - 93;
  }
  function space(height) { if (y - height < 53) newPage(); }
  async function paragraph(text, {size=11, heavy=false, color=ink, spacing=4} = {}) {
    const font = heavy ? bold : regular;
    const row = size * 1.43;
    const normalized = text.normalize('NFC').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    for (const fragment of wrapped(normalized, s => textMetrics(context, font, size, s, heavy).width)) {
      space(row);
      if (fragment) {
        const measure = textMetrics(context, font, size, fragment, heavy);
        if (measure.native) {
          page.drawText(fragment, {x:left, y, size, font, color});
        } else {
          const scale = 3;
          canvas.width = Math.ceil((measure.width + 3) * scale);
          canvas.height = Math.ceil(row * 1.4 * scale);
          context.scale(scale, scale);
          context.font = (heavy ? 'bold ' : '') + size + 'px Arial, sans-serif';
          context.fillStyle = 'rgb(' + [color.red,color.green,color.blue].map(x=>Math.round(255*x)).join(',') + ')';
          context.fillText(fragment, 0, size * 1.15);
          const image = await pdf.embedPng(canvas.toDataURL('image/png'));
          page.drawImage(image, {x:left, y:y + size*1.15 - canvas.height/scale, width:canvas.width/scale, height:canvas.height/scale});
        }
      }
      y -= row;
    }
    y -= spacing;
  }
  newPage();
  await paragraph('Ficha de publicación', {size:27, heavy:true, spacing:0});
  await paragraph(title, {size:17, color:accent});
  await paragraph('Exportada el ' + new Intl.DateTimeFormat('es-PE', {dateStyle:'long'}).format(new Date()), {size:10, color:muted});
  const resolved = reviews.filter(s => s.status === 'Revisado' || s.status === 'No aplica').length;
  await paragraph(resolved + ' de 8 apartados revisados o que no aplican. Los estados y las notas corresponden a lo declarado por el artista.', {size:10, color:muted, spacing:13});
  for (const [index, item] of reviews.entries()) {
    space(58);
    line(y + 8);
    y -= 8;
    await paragraph((index+1) + '. ' + item.title + '  /  ' + item.status, {size:12, heavy:true});
    await paragraph(item.note.trim() || 'Sin notas registradas.', {color:item.note.trim() ? ink : muted, spacing:12});
  }
  space(65);
  await paragraph('Declaración de transparencia', {size:16, heavy:true, color:accent});
  await paragraph(data.declaration.trim() || 'Aún no se ha redactado una declaración.');
  for (const [index, sheet] of pdf.getPages().entries()) {
    const footer = 'Pulso Propio  /  Ficha de la obra';
    const pageNo = (index+1) + ' / ' + pdf.getPageCount();
    sheet.drawText(footer, {x:left, y:31, size:9, font:regular, color:muted});
    sheet.drawText(pageNo, {x:right - regular.widthOfTextAtSize(pageNo, 9), y:31, size:9, font:regular, color:muted});
  }
  return pdf.save();
}

export async function downloadSheet(data, reviews) {
  const bytes = await createSheetPdf(data, reviews);
  const url = URL.createObjectURL(new Blob([bytes], {type:'application/pdf'}));
  const anchor = document.createElement('a');
  anchor.href = url;
  const filename = data.title.normalize('NFKC').trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').slice(0, 90).replace(/[. ]+$/,'');
  anchor.download = 'Pulso-Propio-' + (filename || 'Ficha') + '.pdf';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
