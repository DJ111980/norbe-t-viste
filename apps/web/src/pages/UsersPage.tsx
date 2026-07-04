import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { FileImagePreview } from '../components/FileImagePreview';
import { Modal } from '../components/Modal';
import {
  EmptyState,
  ErrorMessage,
  Field,
  inputClassName,
  LoadingState,
  PageHeader,
  primaryButtonClassName,
  secondaryButtonClassName,
  StatusBadge,
  SuccessMessage,
  UserAvatar,
} from '../components/ui';
import { ApiClientError, isForbiddenError, isUnauthorizedError } from '../lib/api';
import {
  createUser,
  deleteUserAvatar,
  listUsers,
  resetUserPassword,
  uploadUserAvatar,
  updateUser,
  updateUserStatus,
} from '../services/users';
import type {
  UserAccount,
  UserFormValues,
  UserPasswordFormValues,
  UserRole,
  UserUpdateFormValues,
} from '../types';

const emptyUserForm: UserFormValues = {
  nombre_completo: '',
  nombre_usuario: '',
  correo: '',
  rol: 'VENDEDOR',
  contrasena: '',
};

const emptyPasswordForm: UserPasswordFormValues = {
  nueva_contrasena: '',
};

export function toUserUpdateForm(user: UserAccount): UserUpdateFormValues {
  return {
    nombre_completo: user.nombreCompleto,
    nombre_usuario: user.nombreUsuario,
    correo: user.correo,
    rol: user.rol,
  };
}

function handleMessage(error: unknown, fallback: string): string {
  if (isForbiddenError(error)) return 'No tienes permisos para esta acción.';
  return error instanceof ApiClientError ? error.message : fallback;
}

export function UsersPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user: sessionUser, logout, refreshUser } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [selected, setSelected] = useState<UserAccount | null>(null);
  const [form, setForm] = useState<UserFormValues>(emptyUserForm);
  const [editForm, setEditForm] = useState<UserUpdateFormValues | null>(null);
  const [passwordForm, setPasswordForm] = useState<UserPasswordFormValues>(emptyPasswordForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [createAvatarFile, setCreateAvatarFile] = useState<File | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  async function expireIfNeeded(actionError: unknown): Promise<boolean> {
    if (!isUnauthorizedError(actionError)) return false;
    await logout();
    onSessionExpired();
    return true;
  }

  async function loadUsers() {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      setUsers(await listUsers(token));
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setError(handleMessage(loadError, 'No se pudieron cargar usuarios.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [token]);

  function selectUser(user: UserAccount) {
    setSelected(user);
    setEditForm(toUserUpdateForm(user));
    setPasswordForm(emptyPasswordForm);
    setFormError(null);
    setSuccess(null);
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      const user = await createUser(token, form);
      if (createAvatarFile) {
        await uploadUserAvatar(token, user.idUsuario, createAvatarFile);
      }
      setSuccess(`Usuario ${user.nombreUsuario} creado.`);
      setForm(emptyUserForm);
      setCreateAvatarFile(null);
      setIsCreateOpen(false);
      await loadUsers();
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo crear el usuario.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSelectedUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selected || !editForm) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      let user = await updateUser(token, selected.idUsuario, editForm);
      if (editAvatarFile) {
        user = await uploadUserAvatar(token, selected.idUsuario, editAvatarFile);
        setEditAvatarFile(null);
      }
      setSuccess(`Usuario ${user.nombreUsuario} actualizado.`);
      setSelected(user);
      setEditForm(toUserUpdateForm(user));
      await loadUsers();
      if (sessionUser?.idUsuario === selected.idUsuario) await refreshUser();
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo actualizar el usuario.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selected) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      await resetUserPassword(token, selected.idUsuario, passwordForm);
      setSuccess('Contraseña actualizada.');
      setPasswordForm(emptyPasswordForm);
      await loadUsers();
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo cambiar la contrasena.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleUserStatus(user: UserAccount) {
    if (!token) return;
    setFormError(null);
    setSuccess(null);

    try {
      const next = user.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
      await updateUserStatus(token, user.idUsuario, next);
      setSuccess(`Usuario ${next.toLowerCase()}.`);
      await loadUsers();
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo cambiar el estado.'));
    }
  }

  async function removeSelectedAvatar() {
    if (!token || !selected) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      const user = await deleteUserAvatar(token, selected.idUsuario);
      setSelected(user);
      setSuccess('Avatar eliminado.');
      await loadUsers();
      if (sessionUser?.idUsuario === selected.idUsuario) await refreshUser();
    } catch (deleteError) {
      if (await expireIfNeeded(deleteError)) return;
      setFormError(handleMessage(deleteError, 'No se pudo eliminar el avatar.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Usuarios"
        action={
          <button
            type="button"
            className={primaryButtonClassName}
            onClick={() => setIsCreateOpen(true)}
          >
            Crear usuario
          </button>
        }
        description="Administra usuarios, roles, estado y cambio de contraseña."
      />

      {error && <ErrorMessage message={error} />}
      {formError && <ErrorMessage message={formError} />}
      {success && <SuccessMessage message={success} />}

      {isCreateOpen && (
        <Modal
          title="Crear usuario"
          onClose={() => {
            setIsCreateOpen(false);
            setCreateAvatarFile(null);
          }}
        >
          <UserForm
            form={form}
            isSaving={isSaving}
            avatarFile={createAvatarFile}
            onAvatarChange={setCreateAvatarFile}
            onChange={setForm}
            onSubmit={saveUser}
          />
        </Modal>
      )}

      {isLoading ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <EmptyState message="No hay usuarios para mostrar." />
      ) : (
        <UsersTable
          users={users}
          selected={selected}
          onSelect={selectUser}
          onToggleStatus={(user) => void toggleUserStatus(user)}
        />
      )}

      {selected && editForm && (
        <Modal title={`Editar ${selected.nombreUsuario}`} onClose={() => setSelected(null)}>
          <section className="grid gap-4 lg:grid-cols-2">
            <EditUserForm
              user={selected}
              form={editForm}
              isSaving={isSaving}
              avatarFile={editAvatarFile}
              onAvatarChange={setEditAvatarFile}
              onDeleteAvatar={() => void removeSelectedAvatar()}
              onChange={setEditForm}
              onSubmit={saveSelectedUser}
            />
            <PasswordForm
              form={passwordForm}
              isSaving={isSaving}
              onChange={setPasswordForm}
              onSubmit={changePassword}
            />
          </section>
        </Modal>
      )}
    </section>
  );
}

function RoleSelect({ value, onChange }: { value: UserRole; onChange: (value: UserRole) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as UserRole)}
      className={inputClassName}
    >
      <option value="ADMINISTRADOR">Administrador</option>
      <option value="VENDEDOR">Vendedor</option>
    </select>
  );
}

function UserForm({
  form,
  isSaving,
  avatarFile,
  onAvatarChange,
  onChange,
  onSubmit,
}: {
  form: UserFormValues;
  isSaving: boolean;
  avatarFile: File | null;
  onAvatarChange: (file: File | null) => void;
  onChange: (form: UserFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold text-stone-950">Crear usuario</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Field label="Nombre completo" required>
          <input
            required
            value={form.nombre_completo}
            onChange={(event) => onChange({ ...form, nombre_completo: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Usuario" required>
          <input
            required
            value={form.nombre_usuario}
            onChange={(event) => onChange({ ...form, nombre_usuario: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Correo" required>
          <input
            required
            type="email"
            value={form.correo}
            onChange={(event) => onChange({ ...form, correo: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Rol" required>
          <RoleSelect value={form.rol} onChange={(rol) => onChange({ ...form, rol })} />
        </Field>
        <Field label="Contraseña" required>
          <input
            required
            type="password"
            value={form.contrasena}
            onChange={(event) => onChange({ ...form, contrasena: event.target.value })}
            className={inputClassName}
          />
        </Field>
      </div>
      <AvatarFileField file={avatarFile} onChange={onAvatarChange} />
      <button type="submit" disabled={isSaving} className={`${primaryButtonClassName} mt-4`}>
        {isSaving ? 'Guardando...' : 'Crear usuario'}
      </button>
    </form>
  );
}

function UsersTable({
  users,
  selected,
  onSelect,
  onToggleStatus,
}: {
  users: UserAccount[];
  selected: UserAccount | null;
  onSelect: (user: UserAccount) => void;
  onToggleStatus: (user: UserAccount) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Usuario</th>
            <th className="px-4 py-3">Correo</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Ultimo acceso</th>
            <th className="px-4 py-3">Accion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {users.map((user) => (
            <tr key={user.idUsuario}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    idUsuario={user.idUsuario}
                    name={user.nombreCompleto || user.nombreUsuario}
                    hasImage={user.avatar.disponible}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-950">{user.nombreCompleto}</p>
                    <p className="truncate text-xs text-stone-500">@{user.nombreUsuario}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-stone-700">{user.correo}</td>
              <td className="px-4 py-3 text-stone-700">{user.rol}</td>
              <td className="px-4 py-3">
                <StatusBadge status={user.estado} />
              </td>
              <td className="px-4 py-3 text-stone-600">
                {user.ultimoAcceso
                  ? new Date(user.ultimoAcceso).toLocaleString('es-CO')
                  : 'Sin acceso'}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect(user)}
                    className={
                      selected?.idUsuario === user.idUsuario
                        ? primaryButtonClassName
                        : secondaryButtonClassName
                    }
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(user)}
                    className={secondaryButtonClassName}
                  >
                    {user.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditUserForm({
  user,
  form,
  isSaving,
  avatarFile,
  onAvatarChange,
  onDeleteAvatar,
  onChange,
  onSubmit,
}: {
  user: UserAccount;
  form: UserUpdateFormValues;
  isSaving: boolean;
  avatarFile: File | null;
  onAvatarChange: (file: File | null) => void;
  onDeleteAvatar: () => void;
  onChange: (form: UserUpdateFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <div className="flex items-center gap-3">
        <UserAvatar
          idUsuario={user.idUsuario}
          name={user.nombreCompleto || user.nombreUsuario}
          hasImage={user.avatar.disponible}
          size="md"
        />
        <div>
          <h2 className="text-sm font-semibold text-stone-950">Editar {user.nombreUsuario}</h2>
          <p className="text-xs text-stone-500">Avatar temporal con iniciales</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Field label="Nombre completo" required>
          <input
            required
            value={form.nombre_completo}
            onChange={(event) => onChange({ ...form, nombre_completo: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Usuario" required>
          <input
            required
            value={form.nombre_usuario}
            onChange={(event) => onChange({ ...form, nombre_usuario: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Correo" required>
          <input
            required
            type="email"
            value={form.correo}
            onChange={(event) => onChange({ ...form, correo: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Rol" required>
          <RoleSelect value={form.rol} onChange={(rol) => onChange({ ...form, rol })} />
        </Field>
      </div>
      <AvatarFileField file={avatarFile} onChange={onAvatarChange} />
      {user.avatar.disponible && (
        <button
          type="button"
          disabled={isSaving}
          onClick={onDeleteAvatar}
          className={`${secondaryButtonClassName} mt-3`}
        >
          Quitar avatar
        </button>
      )}
      <button type="submit" disabled={isSaving} className={`${primaryButtonClassName} mt-4`}>
        Guardar cambios
      </button>
    </form>
  );
}

function AvatarFileField({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
      <p className="text-sm font-semibold text-stone-950">Avatar</p>
      <p className="mt-1 text-xs text-stone-500">JPG, PNG o WebP. Se sube al guardar.</p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.files?.[0] ?? null)
        }
        className={`${inputClassName} mt-3`}
      />
      <FileImagePreview file={file} />
    </div>
  );
}

function PasswordForm({
  form,
  isSaving,
  onChange,
  onSubmit,
}: {
  form: UserPasswordFormValues;
  isSaving: boolean;
  onChange: (form: UserPasswordFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold text-stone-950">Cambiar contraseña</h2>
      <Field label="Nueva contraseña" required>
        <input
          required
          type="password"
          value={form.nueva_contrasena}
          onChange={(event) => onChange({ nueva_contrasena: event.target.value })}
          className={inputClassName}
        />
      </Field>
      <button type="submit" disabled={isSaving} className={`${secondaryButtonClassName} mt-4`}>
        Cambiar contraseña
      </button>
    </form>
  );
}
