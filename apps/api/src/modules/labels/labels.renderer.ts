import type { PrintableVariantLabel } from './labels.types';
import { NORBE_LABEL_LOGO_DATA_URI } from './labels.logo';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function normalizeLabelSize(talla: string | null): string {
  const normalizedSize = talla?.trim();

  return normalizedSize ? `TALLA ${normalizedSize.toUpperCase()}` : 'TALLA UNICA';
}

function renderVariantLabelMarkup(label: PrintableVariantLabel): string {
  const visibleCode = escapeHtml(label.codigoQr);
  const visibleSize = escapeHtml(label.talla);

  return `<main class="label" aria-label="Etiqueta QR de variante">
    <header class="title">NORBE T VISTE</header>
    <section class="visuals" aria-label="Logo y codigo QR">
      <div class="logo" aria-label="Logo">
        <span class="logo-fallback">LOGO</span>
        <img class="logo-image" src="${NORBE_LABEL_LOGO_DATA_URI}" alt="NORBE T VISTE" onerror="this.remove()">
      </div>
      <div class="qr" aria-label="Codigo QR">${label.qrSvg}</div>
    </section>
    <section class="details" aria-label="Datos visibles de variante">
      <div class="size">${visibleSize}</div>
      <div class="code">${visibleCode}</div>
    </section>
  </main>`;
}

function renderLabelStyles(pageMode: 'single' | 'batch'): string {
  const bodySize =
    pageMode === 'single'
      ? `width: 2.25in;
      height: 1.25in;`
      : `min-width: 2.25in;
      min-height: 1.25in;`;
  const bodyDisplay =
    pageMode === 'single'
      ? `display: flex;
      align-items: center;
      justify-content: center;`
      : '';

  return `@page {
      size: 2.25in 1.25in;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      ${bodySize}
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111111;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      ${bodyDisplay}
    }

    .labels-pages {
      display: block;
    }

    .label {
      width: 2.25in;
      height: 1.25in;
      padding: 0.08in;
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: 0.18in 0.76in 0.16in;
      row-gap: 0.03in;
      overflow: hidden;
      border: 0.2mm solid #111111;
      break-inside: avoid;
      page-break-inside: avoid;
      break-after: page;
      page-break-after: always;
    }

    .title {
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 7pt;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .visuals {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 0.08in;
      align-items: center;
      justify-items: center;
      min-width: 0;
    }

    .logo {
      width: 0.58in;
      height: 0.58in;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-size: 5pt;
      font-weight: 700;
      letter-spacing: 0;
    }

    .logo-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .logo-fallback {
      position: relative;
      z-index: 0;
    }

    .qr {
      width: 0.72in;
      height: 0.72in;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr svg {
      width: 0.72in;
      height: 0.72in;
      display: block;
    }

    .details {
      min-width: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 0.08in;
      align-items: center;
      justify-items: center;
    }

    .code {
      max-width: 0.95in;
      font-size: 6pt;
      font-weight: 700;
      line-height: 1.1;
      text-align: center;
      overflow-wrap: anywhere;
    }

    .size {
      max-width: 0.8in;
      font-size: 6.5pt;
      font-weight: 700;
      line-height: 1.1;
      text-align: center;
      overflow-wrap: anywhere;
    }

    @media print {
      html,
      body {
        margin: 0;
        padding: 0;
      }

      .labels-pages {
        display: block;
      }

      .label {
        border-color: #111111;
        break-after: page;
        page-break-after: always;
      }
    }`;
}

export function renderVariantLabelHtml(label: PrintableVariantLabel): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>NORBE T VISTE - Etiqueta QR</title>
  <style>
    ${renderLabelStyles('single')}
  </style>
</head>
<body>
  ${renderVariantLabelMarkup(label)}
</body>
</html>`;
}

export function renderLabelsPageHtml(labels: PrintableVariantLabel[]): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>NORBE T VISTE - Etiquetas QR</title>
  <style>
    ${renderLabelStyles('batch')}
  </style>
</head>
<body>
  <section class="labels-pages" aria-label="Etiquetas QR de variantes">
    ${labels.map(renderVariantLabelMarkup).join('\n    ')}
  </section>
</body>
</html>`;
}
