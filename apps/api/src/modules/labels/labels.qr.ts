import qrcode from 'qrcode-generator';

export function createQrSvg(codigoQr: string): string {
  const qr = qrcode(0, 'M');

  qr.addData(codigoQr);
  qr.make();

  return qr.createSvgTag({ scalable: true, margin: 0 });
}
