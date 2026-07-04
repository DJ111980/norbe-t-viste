import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { hashPassword } from '../src/modules/auth/password';

const execFileAsync = promisify(execFile);

const WRANGLER_CONFIG_PATH = './apps/api/wrangler.toml';
const DEV_VARS_PATH = './apps/api/.dev.vars';
const TEMP_SQL_PATH = './apps/api/.wrangler/tmp/create-admin.sql';

export interface AdminSeedInput {
  nombreCompleto: string;
  nombreUsuario: string;
  correo: string;
  contrasena: string;
}

interface D1QueryResponse<T> {
  results?: T[];
  success?: boolean;
}

interface ExistingUserRow {
  total: number;
}

function parseEnvFile(content: string): Record<string, string> {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .reduce<Record<string, string>>((values, line) => {
      const separatorIndex = line.indexOf('=');

      if (separatorIndex === -1) {
        return values;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      values[key] = rawValue.replace(/^["']|["']$/g, '');
      return values;
    }, {});
}

function loadDevVars(): Record<string, string> {
  if (!existsSync(DEV_VARS_PATH)) {
    return {};
  }

  return parseEnvFile(readFileSync(DEV_VARS_PATH, 'utf8'));
}

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateAdminPassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('La contrasena debe tener minimo 8 caracteres.');
  }

  if (!/[A-Za-zÀ-ÿ]/.test(password)) {
    errors.push('La contrasena debe incluir al menos una letra.');
  }

  if (!/\d/.test(password)) {
    errors.push('La contrasena debe incluir al menos un numero.');
  }

  return errors;
}

export function readAdminSeedInput(env: NodeJS.ProcessEnv): AdminSeedInput {
  const devVars = loadDevVars();
  const nombreCompleto = (env.ADMIN_SEED_NAME || devVars.ADMIN_SEED_NAME || '').trim();
  const nombreUsuario = (env.ADMIN_SEED_USERNAME || devVars.ADMIN_SEED_USERNAME || 'admin')
    .trim()
    .toLowerCase();
  const correo = normalizeAdminEmail(env.ADMIN_SEED_EMAIL || devVars.ADMIN_SEED_EMAIL || '');
  const contrasena = env.ADMIN_SEED_PASSWORD || devVars.ADMIN_SEED_PASSWORD || '';
  const missingFields: string[] = [];

  if (!nombreCompleto) {
    missingFields.push('ADMIN_SEED_NAME');
  }

  if (!correo) {
    missingFields.push('ADMIN_SEED_EMAIL');
  }

  if (!/^[a-z0-9._-]{3,40}$/.test(nombreUsuario)) {
    throw new Error('ADMIN_SEED_USERNAME debe tener entre 3 y 40 caracteres validos.');
  }

  if (!contrasena) {
    missingFields.push('ADMIN_SEED_PASSWORD');
  }

  if (missingFields.length > 0) {
    throw new Error(`Faltan variables requeridas: ${missingFields.join(', ')}.`);
  }

  const passwordErrors = validateAdminPassword(contrasena);

  if (passwordErrors.length > 0) {
    throw new Error(passwordErrors.join(' '));
  }

  return {
    nombreCompleto,
    nombreUsuario,
    correo,
    contrasena,
  };
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function quoteWindowsArg(value: string): string {
  if (!/[\s"&|<>^]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '\\"')}"`;
}

async function executeD1Local<T>(sql: string): Promise<D1QueryResponse<T>[]> {
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
    '--json',
    '--file',
    sqlFilePath,
  ];

  try {
    // En Windows algunos entornos no permiten ejecutar npx.cmd via spawn directo.
    // Usar ComSpec mantiene el script compatible sin cambiar el flujo de D1/Wrangler.
    const { stdout } =
      process.platform === 'win32'
        ? await execFileAsync(process.env.ComSpec || 'cmd.exe', [
            '/d',
            '/s',
            '/c',
            ['npx.cmd', ...args.map(quoteWindowsArg)].join(' '),
          ])
        : await execFileAsync('npx', args);

    return JSON.parse(stdout) as D1QueryResponse<T>[];
  } finally {
    await rm(sqlFilePath, { force: true });
  }
}

async function userExists(correo: string): Promise<boolean> {
  const response = await executeD1Local<ExistingUserRow>(
    `SELECT COUNT(*) AS total FROM usuarios WHERE correo = ${sqlString(correo)};`,
  );
  const total = response[0]?.results?.[0]?.total ?? 0;

  return total > 0;
}

export function buildInsertAdminSql(
  input: AdminSeedInput,
  passwordHash: string,
  idUsuario: string,
): string {
  return `
    INSERT INTO usuarios (
      id_usuario,
      nombre_completo,
      nombre_usuario,
      correo,
      contrasena_hash,
      rol,
      estado,
      creado_en,
      actualizado_en
    ) VALUES (
      ${sqlString(idUsuario)},
      ${sqlString(input.nombreCompleto)},
      ${sqlString(input.nombreUsuario)},
      ${sqlString(input.correo)},
      ${sqlString(passwordHash)},
      'ADMINISTRADOR',
      'ACTIVO',
      datetime('now'),
      datetime('now')
    );
  `;
}

export async function createInitialAdmin(): Promise<void> {
  const input = readAdminSeedInput(process.env);

  console.info(`Preparando administrador inicial para ${input.correo}.`);

  if (await userExists(input.correo)) {
    console.info('Ya existe un usuario con ese correo. No se creo un duplicado.');
    return;
  }

  const passwordHash = await hashPassword(input.contrasena);
  const idUsuario = `usr_${randomUUID()}`;

  // La insercion pasa por Wrangler para usar la misma D1 local configurada en el Worker.
  // No imprimimos la contrasena ni dejamos SQL con secretos dentro del repositorio.
  await executeD1Local(buildInsertAdminSql(input, passwordHash, idUsuario));

  console.info('Administrador inicial creado correctamente con rol ADMINISTRADOR y estado ACTIVO.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  createInitialAdmin().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Error desconocido.';
    console.error(`No se pudo crear el administrador inicial: ${message}`);
    process.exitCode = 1;
  });
}
