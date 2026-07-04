import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { hashPassword } from '../src/modules/auth/password';

const execFileAsync = promisify(execFile);
const WRANGLER_CONFIG_PATH = './apps/api/wrangler.toml';
const TEMP_SQL_PATH = './apps/api/.wrangler/tmp/reset-local-db.sql';

const BUSINESS_TABLES = [
  'detalle_devoluciones_ventas',
  'devoluciones_ventas',
  'ajustes_creditos',
  'abonos_creditos',
  'detalle_creditos',
  'creditos_clientes',
  'pagos_ventas',
  'detalle_ventas',
  'ventas',
  'movimientos_inventario',
  'detalle_lotes_entrada',
  'lotes_entrada',
  'imagenes_productos',
  'variantes_producto',
  'productos',
  'categorias',
  'proveedores',
  'clientes',
];

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function quoteWindowsArg(value: string): string {
  if (!/[\s"&|<>^]/.test(value)) return value;
  return `"${value.replaceAll('"', '\\"')}"`;
}

async function executeD1Local(sql: string): Promise<void> {
  const sqlFilePath = resolve(TEMP_SQL_PATH);
  await mkdir(dirname(sqlFilePath), { recursive: true });
  await writeFile(sqlFilePath, sql, 'utf8');

  const args = [
    'wrangler',
    'd1',
    'execute',
    'DB',
    '--local',
    '--config',
    WRANGLER_CONFIG_PATH,
    '--file',
    sqlFilePath,
  ];

  try {
    if (process.platform === 'win32') {
      await execFileAsync(process.env.ComSpec || 'cmd.exe', [
        '/d',
        '/s',
        '/c',
        ['npx.cmd', ...args.map(quoteWindowsArg)].join(' '),
      ]);
      return;
    }

    await execFileAsync('npx', args);
  } finally {
    await rm(sqlFilePath, { force: true });
  }
}

function buildResetSql(adminPasswordHash: string): string {
  const adminName = process.env.ADMIN_SEED_NAME || 'admin';
  const adminUsername = (process.env.ADMIN_SEED_USERNAME || 'admin').toLowerCase();
  const adminEmail = (process.env.ADMIN_SEED_EMAIL || 'admin@gmail.com').toLowerCase();
  const adminId = `usr_${randomUUID()}`;

  return `
    PRAGMA foreign_keys = OFF;
    ${BUSINESS_TABLES.map((table) => `DELETE FROM ${table};`).join('\n')}
    DELETE FROM usuarios WHERE nombre_usuario <> ${sqlString(adminUsername)};
    INSERT OR IGNORE INTO usuarios (
      id_usuario,
      nombre_completo,
      nombre_usuario,
      correo,
      contrasena_hash,
      rol,
      estado,
      debe_cambiar_contrasena,
      contrasena_actualizada_en,
      avatar_key,
      avatar_content_type,
      creado_en,
      actualizado_en
    ) VALUES (
      ${sqlString(adminId)},
      ${sqlString(adminName)},
      ${sqlString(adminUsername)},
      ${sqlString(adminEmail)},
      ${sqlString(adminPasswordHash)},
      'ADMINISTRADOR',
      'ACTIVO',
      0,
      datetime('now'),
      NULL,
      NULL,
      datetime('now'),
      datetime('now')
    );
    UPDATE usuarios
    SET nombre_completo = ${sqlString(adminName)},
        correo = ${sqlString(adminEmail)},
        contrasena_hash = ${sqlString(adminPasswordHash)},
        rol = 'ADMINISTRADOR',
        estado = 'ACTIVO',
        debe_cambiar_contrasena = 0,
        contrasena_actualizada_en = datetime('now'),
        avatar_key = NULL,
        avatar_content_type = NULL,
        actualizado_en = datetime('now')
    WHERE nombre_usuario = ${sqlString(adminUsername)};
    PRAGMA foreign_keys = ON;
  `;
}

export async function resetLocalDbKeepAdmin(): Promise<void> {
  if (process.env.RESET_LOCAL_DB !== '1') {
    throw new Error('Proteccion activa. Ejecuta con RESET_LOCAL_DB=1 para confirmar.');
  }

  const password = process.env.ADMIN_SEED_PASSWORD || 'admin123';
  const passwordHash = await hashPassword(password);
  await executeD1Local(buildResetSql(passwordHash));

  console.info('D1 local limpiada. Se conservo el usuario admin local.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  resetLocalDbKeepAdmin().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Error desconocido.';
    console.error(`No se pudo limpiar la D1 local: ${message}`);
    process.exitCode = 1;
  });
}
