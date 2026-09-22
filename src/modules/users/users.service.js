import { AuditAction, writeAuditLog } from '../../lib/audit.js';
import { hashPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/AppError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { revokeAllUserTokens, safeUserSelect } from '../auth/auth.service.js';

const ENTITY = 'User';

export async function listUsers({ page, limit, q, role, isActive }) {
  const where = {
    ...(role && { role }),
    ...(isActive !== undefined && { isActive }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
      ...getPagination({ page, limit }),
    }),
    prisma.user.count({ where }),
  ]);

  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: safeUserSelect });
  if (!user) throw new NotFoundError('User tidak ditemukan');
  return user;
}

async function ensureEmailAvailable(email, excludeId) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== excludeId) {
    throw new ConflictError('Email sudah digunakan', [
      { field: 'email', message: 'Email sudah digunakan' },
    ]);
  }
}

/** Throw if the change would leave the system without an active super admin. */
async function ensureNotLastSuperAdmin(user, next) {
  const staysSuperAdmin = (next.role ?? user.role) === 'SUPER_ADMIN';
  const staysActive = next.isActive ?? user.isActive;
  if (user.role !== 'SUPER_ADMIN' || !user.isActive || (staysSuperAdmin && staysActive)) return;

  const otherActiveSuperAdmins = await prisma.user.count({
    where: { role: 'SUPER_ADMIN', isActive: true, id: { not: user.id } },
  });
  if (otherActiveSuperAdmins === 0) {
    throw new ConflictError('Tidak dapat mengubah super admin aktif terakhir');
  }
}

export async function createUser(actor, { password, ...data }) {
  await ensureEmailAvailable(data.email);

  const user = await prisma.user.create({
    data: { ...data, passwordHash: await hashPassword(password) },
    select: safeUserSelect,
  });

  await writeAuditLog(actor, {
    action: AuditAction.CREATE,
    entity: ENTITY,
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
  });
  return user;
}

export async function updateUser(actor, id, { password, ...data }) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User tidak ditemukan');

  if (id === actor.userId) {
    if (data.isActive === false) {
      throw new BadRequestError('Anda tidak dapat menonaktifkan akun sendiri');
    }
    if (data.role && data.role !== user.role) {
      throw new BadRequestError('Anda tidak dapat mengubah role akun sendiri');
    }
  }
  await ensureNotLastSuperAdmin(user, data);
  if (data.email) await ensureEmailAvailable(data.email, id);

  const updated = await prisma.user.update({
    where: { id },
    data: { ...data, ...(password && { passwordHash: await hashPassword(password) }) },
    select: safeUserSelect,
  });

  // Force re-login when credentials or access change.
  if (password || data.isActive === false) {
    await revokeAllUserTokens(prisma, id);
  }

  await writeAuditLog(actor, {
    action: AuditAction.UPDATE,
    entity: ENTITY,
    entityId: id,
    metadata: { fields: [...Object.keys(data), ...(password ? ['password'] : [])] },
  });
  return updated;
}

/** "Delete" = deactivate, so audit history and authored articles stay intact. */
export async function deactivateUser(actor, id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User tidak ditemukan');
  if (id === actor.userId) {
    throw new BadRequestError('Anda tidak dapat menonaktifkan akun sendiri');
  }
  await ensureNotLastSuperAdmin(user, { isActive: false });

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: safeUserSelect,
  });
  await revokeAllUserTokens(prisma, id);

  await writeAuditLog(actor, { action: AuditAction.DELETE, entity: ENTITY, entityId: id });
  return updated;
}
