/** Module 10 — renders a generated report as a paginated PDF table (A4 landscape). */
import PDFDocument from 'pdfkit';

const MARGIN = 36;
const FONT_SIZE = 8.5;
const PAD = 4;
const BRAND = '#4f46e5';

/** The built-in PDF fonts have no ₹ glyph, so money columns show grouped digits (the header says INR). */
function formatCell(value, column) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number' && /INR/.test(column)) return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (typeof value === 'number') return String(Math.round(value * 100) / 100);
  return String(value);
}

/** Column widths proportional to content length, with a sensible min/max, scaled to the page width. */
function columnWidths(doc, columns, rows, available) {
  doc.font('Helvetica').fontSize(FONT_SIZE);
  const natural = columns.map((c, i) => {
    const longest = Math.max(
      doc.widthOfString(c, { font: 'Helvetica-Bold' }),
      ...rows.slice(0, 200).map((r) => doc.widthOfString(formatCell(r[i], c))),
    );
    return Math.min(Math.max(longest + PAD * 2, 50), 220);
  });
  const total = natural.reduce((a, b) => a + b, 0);
  return natural.map((w) => (w * available) / total);
}

/**
 * Streams the PDF for `report` ({ title, reportType, createdAt, generatedBy, columns, rows }) into `out`.
 */
export function renderReportPdf(report, out) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: MARGIN, bufferPages: true, info: { Title: report.title, Author: 'StartIn ISIP' } });
  doc.pipe(out);
  const pageWidth = doc.page.width - MARGIN * 2;
  const bottom = doc.page.height - MARGIN - 18;
  const { columns, rows } = report;
  const widths = columnWidths(doc, columns, rows, pageWidth);

  // Title block
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(9).text('StartIn · Intelligent Startup Incubation Platform', MARGIN, MARGIN);
  doc.fillColor('#111827').fontSize(18).text(report.title, MARGIN, MARGIN + 14);
  const generated = new Date(report.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.fillColor('#6b7280').font('Helvetica').fontSize(9)
    .text(`Generated ${generated}${report.generatedBy ? ` by ${report.generatedBy}` : ''} · ${rows.length} row${rows.length === 1 ? '' : 's'}`, MARGIN, MARGIN + 38);
  let y = MARGIN + 60;

  const rowHeight = (cells, font) => {
    doc.font(font).fontSize(FONT_SIZE);
    return Math.max(...cells.map((c, i) => doc.heightOfString(c, { width: widths[i] - PAD * 2 }))) + PAD * 2;
  };
  const drawRow = (cells, { header = false, shade = false } = {}) => {
    const font = header ? 'Helvetica-Bold' : 'Helvetica';
    const h = rowHeight(cells, font);
    if (header) doc.rect(MARGIN, y, pageWidth, h).fill(BRAND);
    else if (shade) doc.rect(MARGIN, y, pageWidth, h).fill('#f5f7fb');
    let x = MARGIN;
    doc.font(font).fontSize(FONT_SIZE).fillColor(header ? '#ffffff' : '#1f2937');
    cells.forEach((c, i) => {
      doc.text(c, x + PAD, y + PAD, { width: widths[i] - PAD * 2 });
      x += widths[i];
    });
    y += h;
    if (!header) doc.moveTo(MARGIN, y).lineTo(MARGIN + pageWidth, y).lineWidth(0.4).strokeColor('#e5e7eb').stroke();
  };

  drawRow(columns, { header: true });
  if (!rows.length) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(10).text('No data for this report.', MARGIN, y + 10);
  }
  rows.forEach((r, idx) => {
    const cells = columns.map((c, i) => formatCell(r[i], c));
    if (y + rowHeight(cells, 'Helvetica') > bottom) {
      doc.addPage();
      y = MARGIN;
      drawRow(columns, { header: true }); // repeat the header on every page
    }
    drawRow(cells, { shade: idx % 2 === 1 });
  });

  // Footer with page numbers
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Writing inside the bottom margin would make PDFKit start a new page, so lift the margin first.
    const { bottom: savedBottom } = doc.page.margins;
    doc.page.margins.bottom = 0;
    doc.fillColor('#9ca3af').font('Helvetica').fontSize(8)
      .text(`${report.title} · Page ${i + 1} of ${range.count}`, MARGIN, doc.page.height - MARGIN + 8, { width: pageWidth, align: 'right', lineBreak: false });
    doc.page.margins.bottom = savedBottom;
  }
  doc.end();
}
