/**
 * Verificação de posse para caminhos `/home/<owner>/...` no servidor partilhado — usada por
 * qualquer rota que execute operações de ficheiros via SSH root, para impedir que um
 * revendedor toque em ficheiros de outra conta (só a sua própria ou sub-contas suas).
 */

export function isValidHomePath(targetPath: string): boolean {
  const p = targetPath.trim();
  return p.startsWith('/home/') && !p.includes('..') && !p.includes('\0');
}

/** Só permite caracteres seguros para interpolar num comando de shell entre aspas duplas. */
export function isShellSafeHomePath(targetPath: string): boolean {
  return isValidHomePath(targetPath) && /^\/home\/[a-zA-Z0-9._\-/]+$/.test(targetPath.trim());
}

export function extractHomeOwner(targetPath: string): string | null {
  const match = /^\/home\/([^/]+)\//.exec(targetPath.trim());
  return match ? match[1] : null;
}

/**
 * Um revendedor só pode tocar em caminhos `/home/<owner>/...` cujo `<owner>` seja a sua
 * própria conta DA ou uma sub-conta sua (parent_username === o seu daUsername).
 */
export async function assertPathsOwnedByCaller(paths: string[], userId: string): Promise<boolean> {
  const owners = new Set<string>();
  for (const p of paths) {
    const owner = extractHomeOwner(p);
    if (!owner) return false;
    owners.add(owner.toLowerCase());
  }
  if (owners.size === 0) return true;

  const { getResellerDaUsername } = await import('@/lib/directadmin-credentials');
  const daUsername = (await getResellerDaUsername({ id: userId, role: 'reseller' })).toLowerCase();
  if (!daUsername) return false;

  const { getDaSyncAdmin } = await import('@/lib/da-sync-schema');
  const admin = getDaSyncAdmin();
  if (!admin) return false;

  for (const owner of owners) {
    if (owner === daUsername) continue;
    const { data } = await admin
      .from('panel_users')
      .select('parent_username')
      .eq('username', owner)
      .maybeSingle();
    if (String(data?.parent_username || '').toLowerCase() !== daUsername) {
      return false;
    }
  }
  return true;
}
