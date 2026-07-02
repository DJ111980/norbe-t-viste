import type { ProviderRecord, PublicProvider } from './providers.types';

export function toPublicProvider(provider: ProviderRecord): PublicProvider {
  // La respuesta publica no expone nombre_normalizado: es una llave tecnica para
  // evitar duplicados, no un dato que el usuario deba editar directamente.
  return {
    idProveedor: provider.id_proveedor,
    nombreProveedor: provider.nombre_proveedor,
    tipoDocumento: provider.tipo_documento,
    numeroDocumento: provider.numero_documento,
    nombreContacto: provider.nombre_contacto,
    telefonoPrincipal: provider.telefono_principal,
    telefonoSecundario: provider.telefono_secundario,
    correo: provider.correo,
    ciudad: provider.ciudad,
    direccion: provider.direccion,
    pais: provider.pais,
    modoEnvio: provider.modo_envio,
    empresaTransportadora: provider.empresa_transportadora,
    tiempoEntregaEstimado: provider.tiempo_entrega_estimado,
    formaPago: provider.forma_pago,
    cuentaPago: provider.cuenta_pago,
    notas: provider.notas,
    estado: provider.estado,
    creadoEn: provider.creado_en,
    actualizadoEn: provider.actualizado_en,
    creadoPor: provider.creado_por,
    actualizadoPor: provider.actualizado_por,
    fechaUltimoLote: provider.fecha_ultimo_lote,
  };
}
