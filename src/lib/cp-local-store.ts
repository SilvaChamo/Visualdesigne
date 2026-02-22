// Shared localStorage store for CyberPanel data
// Works without Supabase tables — persists across page refreshes

export const LS_SITES_KEY = 'cp_sites_v1'
export const LS_USERS_KEY = 'cp_users_v1'
export const LS_PKGS_KEY  = 'cp_packages_v1'

function lsGet<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function lsSet(key: string, data: any[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

// ── Sites ──────────────────────────────────────────────────────────────────────
export function cpGetSites() { return lsGet<any>(LS_SITES_KEY) }
export function cpSaveSite(domain: string, extra: Record<string, any> = {}) {
  const list = cpGetSites()
  const idx = list.findIndex((s: any) => s.domain === domain)
  const entry = { domain, adminEmail: '', package: 'Default', owner: 'admin', status: 'Active', diskUsage: '', bandwidthUsage: '', ...extra }
  if (idx >= 0) list[idx] = entry; else list.push(entry)
  lsSet(LS_SITES_KEY, list)
}
export function cpRemoveSite(domain: string) {
  lsSet(LS_SITES_KEY, cpGetSites().filter((s: any) => s.domain !== domain))
}

// ── Users ──────────────────────────────────────────────────────────────────────
export function cpGetUsers() { return lsGet<any>(LS_USERS_KEY) }
export function cpSaveUser(userName: string, extra: Record<string, any> = {}) {
  const list = cpGetUsers()
  const idx = list.findIndex((u: any) => u.userName === userName)
  const entry = { userName, firstName: '', lastName: '', email: '', acl: 'user', websitesLimit: 10, status: 'Active', ...extra }
  if (idx >= 0) list[idx] = entry; else list.push(entry)
  lsSet(LS_USERS_KEY, list)
}
export function cpRemoveUser(userName: string) {
  lsSet(LS_USERS_KEY, cpGetUsers().filter((u: any) => u.userName !== userName))
}

// ── Packages ───────────────────────────────────────────────────────────────────
export function cpGetPackages() { return lsGet<any>(LS_PKGS_KEY) }
export function cpSavePackages(pkgs: any[]) { lsSet(LS_PKGS_KEY, pkgs) }
export function cpSavePackage(packageName: string, extra: Record<string, any> = {}) {
  const list = cpGetPackages()
  const idx = list.findIndex((p: any) => p.packageName === packageName)
  const entry = { packageName, diskSpace: 1000, bandwidth: 10000, emailAccounts: 10, dataBases: 1, ftpAccounts: 1, allowedDomains: 1, ...extra }
  if (idx >= 0) list[idx] = entry; else list.push(entry)
  lsSet(LS_PKGS_KEY, list)
}
export function cpRemovePackage(packageName: string) {
  lsSet(LS_PKGS_KEY, cpGetPackages().filter((p: any) => p.packageName !== packageName))
}
