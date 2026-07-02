import type { ClientRecord, PublicClient } from './clients.types';

export function toPublicClient(client: ClientRecord): PublicClient {
  // El mapper mantiene la respuesta enfocada en datos del cliente; saldos y deudas
  // se calcularan desde creditos, abonos y ajustes cuando esos modulos existan.
  return {
    idCliente: client.id_cliente,
    nombreCompleto: client.nombre_completo,
    documento: client.documento,
    telefono: client.telefono,
    telefonoSecundario: client.telefono_secundario,
    direccion: client.direccion,
    ciudad: client.ciudad,
    correo: client.correo,
    observaciones: client.observaciones,
    estado: client.estado,
    creadoEn: client.creado_en,
    actualizadoEn: client.actualizado_en,
    creadoPor: client.creado_por,
    actualizadoPor: client.actualizado_por,
    fechaUltimaCompra: client.fecha_ultima_compra,
  };
}
