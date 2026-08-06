import {
  NEW_MENU_ITEM_DEFS,
  RESELLER_MAIN_MENU_DEFS,
  isMenuHeaderSubItem,
  type PanelMenuItemDef,
} from '@/lib/panel-admin-menu';

/**
 * Menu real do painel Profissional/manager (sem Dashboard) — é o mesmo menu do
 * painel admin, filtrado por estes privilégios (ver dashboard/page.tsx).
 */
export const MANAGER_PRIVILEGE_MENU_DEFS: PanelMenuItemDef[] = NEW_MENU_ITEM_DEFS.filter(
  (item) => item.id !== 'dashboard',
);

/**
 * Menu real do painel Revendedor (sem Dashboard) — tem de ser exactamente
 * RESELLER_MAIN_MENU_DEFS, que é o que o ResellerSidebar renderiza de facto.
 * Usar qualquer outra lista aqui faz os toggles mentirem (ligam/desligam
 * itens que o revendedor nunca vê, ou deixam de fora itens reais do menu).
 */
export const RESELLER_PRIVILEGE_MENU_DEFS: PanelMenuItemDef[] = RESELLER_MAIN_MENU_DEFS;

export type ResellerMenuKey = string;

export type ResellerMenuPrivilegesConfig = {
  reseller?: Partial<Record<ResellerMenuKey, boolean>>;
  resellerSub?: Partial<Record<string, boolean>>;
};

export function menuSubPrivilegeKey(parent: string, childKey: string): string {
  return `${parent}:${childKey}`;
}

function defaultSubPrivileges(items: PanelMenuItemDef[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const parent of items) {
    if (!parent.subItems?.length) continue;
    for (const child of parent.subItems) {
      if (isMenuHeaderSubItem(child.id)) continue;
      out[menuSubPrivilegeKey(parent.id, child.id)] = true;
    }
  }
  return out;
}

export function defaultResellerMenuPrivileges(): ResellerMenuPrivilegesConfig {
  const reseller = Object.fromEntries(
    RESELLER_PRIVILEGE_MENU_DEFS.map((item) => [item.id, true]),
  ) as Record<ResellerMenuKey, boolean>;

  return {
    reseller,
    resellerSub: defaultSubPrivileges(RESELLER_PRIVILEGE_MENU_DEFS),
  };
}

const MANAGER_DEFAULT_DENIED_PARENTS = new Set(['utilizadores', 'nov-hospedagem', 'nov-sistema']);

/** Perfil profissional (manager) — espelha restrições actuais do painel. */
export function defaultManagerMenuPrivileges(): ResellerMenuPrivilegesConfig {
  const reseller = Object.fromEntries(
    MANAGER_PRIVILEGE_MENU_DEFS.map((item) => [item.id, true]),
  ) as Record<ResellerMenuKey, boolean>;
  const resellerSub = defaultSubPrivileges(MANAGER_PRIVILEGE_MENU_DEFS);

  for (const parentId of MANAGER_DEFAULT_DENIED_PARENTS) {
    reseller[parentId] = false;
    const parent = MANAGER_PRIVILEGE_MENU_DEFS.find((item) => item.id === parentId);
    for (const child of parent?.subItems ?? []) {
      if (isMenuHeaderSubItem(child.id)) continue;
      resellerSub[menuSubPrivilegeKey(parentId, child.id)] = false;
    }
  }

  return { reseller, resellerSub };
}

function resolvePanelMenuPrivileges(
  raw: ResellerMenuPrivilegesConfig | null | undefined,
  defaults: () => ResellerMenuPrivilegesConfig,
  menuDefs: PanelMenuItemDef[],
): ResellerMenuPrivilegesConfig {
  const defaultConfig = defaults();
  if (!raw) return defaultConfig;

  const mergedReseller = { ...defaultConfig.reseller, ...raw.reseller };
  const mergedSub = { ...defaultConfig.resellerSub, ...raw.resellerSub };

  // Migração: menu pai renomeado de clientes → utilizadores
  if (raw.reseller?.clientes !== undefined) {
    mergedReseller.utilizadores = raw.reseller.clientes;
  }
  // Migração: "Sistema" (admin/profissional) ↔ "Definições" (revendedor) trocaram de id
  // consoante o painel — aceitar dados gravados sob qualquer um dos dois nomes.
  if (raw.reseller?.['nov-definicoes'] !== undefined) {
    mergedReseller['nov-sistema'] = raw.reseller['nov-definicoes'];
  }
  if (raw.reseller?.['nov-sistema'] !== undefined) {
    mergedReseller['nov-definicoes'] = raw.reseller['nov-sistema'];
  }
  for (const [key, value] of Object.entries(raw.resellerSub || {})) {
    if (key.startsWith('clientes:')) {
      const migrated = key.replace('clientes:', 'utilizadores:');
      if (mergedSub[migrated] === undefined) mergedSub[migrated] = value;
    }
    if (key.startsWith('nov-definicoes:')) {
      const migrated = key.replace('nov-definicoes:', 'nov-sistema:');
      if (mergedSub[migrated] === undefined) mergedSub[migrated] = value;
    }
    if (key.startsWith('nov-sistema:')) {
      const migrated = key.replace('nov-sistema:', 'nov-definicoes:');
      if (mergedSub[migrated] === undefined) mergedSub[migrated] = value;
    }
    if (key.startsWith('nov-email:newsletter-')) {
      const migrated = key.replace('nov-email:', 'newsletter:');
      if (mergedSub[migrated] === undefined) mergedSub[migrated] = value;
    }
  }

  const reseller = Object.fromEntries(
    menuDefs.map((item) => [
      item.id,
      mergedReseller[item.id] !== false,
    ]),
  ) as Record<ResellerMenuKey, boolean>;
  reseller.dashboard = true;

  const resellerSub: Record<string, boolean> = {};
  for (const parent of menuDefs) {
    if (!parent.subItems?.length) continue;
    for (const child of parent.subItems) {
      if (isMenuHeaderSubItem(child.id)) continue;
      const key = menuSubPrivilegeKey(parent.id, child.id);
      resellerSub[key] = mergedSub[key] !== false;
    }
  }

  return { reseller, resellerSub };
}

export function resolveResellerMenuPrivileges(
  raw: ResellerMenuPrivilegesConfig | null | undefined,
): ResellerMenuPrivilegesConfig {
  return resolvePanelMenuPrivileges(raw, defaultResellerMenuPrivileges, RESELLER_PRIVILEGE_MENU_DEFS);
}

export function resolveManagerMenuPrivileges(
  raw: ResellerMenuPrivilegesConfig | null | undefined,
): ResellerMenuPrivilegesConfig {
  return resolvePanelMenuPrivileges(raw, defaultManagerMenuPrivileges, MANAGER_PRIVILEGE_MENU_DEFS);
}

export function isResellerMenuEnabled(
  privileges: ResellerMenuPrivilegesConfig,
  key: ResellerMenuKey,
): boolean {
  return privileges.reseller?.[key] !== false;
}

export function isResellerSubmenuEnabled(
  privileges: ResellerMenuPrivilegesConfig,
  parent: ResellerMenuKey,
  childKey: string,
): boolean {
  if (!isResellerMenuEnabled(privileges, parent)) return false;
  return privileges.resellerSub?.[menuSubPrivilegeKey(parent, childKey)] !== false;
}

/** Activa/desactiva menu e sincroniza todos os submenus do mesmo grupo. */
export function patchResellerMenuToggle(
  privileges: ResellerMenuPrivilegesConfig,
  key: ResellerMenuKey,
  enabled: boolean,
  menuDefs: PanelMenuItemDef[] = RESELLER_PRIVILEGE_MENU_DEFS,
): ResellerMenuPrivilegesConfig {
  const reseller = { ...privileges.reseller, [key]: enabled };
  if (key === 'dashboard') {
    reseller.dashboard = true;
  }
  const resellerSub = { ...privileges.resellerSub };
  const parent = menuDefs.find((item) => item.id === key);
  const children = parent?.subItems ?? [];

  for (const child of children) {
    if (isMenuHeaderSubItem(child.id)) continue;
    resellerSub[menuSubPrivilegeKey(key, child.id)] = enabled;
  }

  return { ...privileges, reseller, resellerSub };
}

/** Activa/desactiva submenu; activar filho liga o pai; desactivar o último filho desliga o pai. */
export function patchResellerSubToggle(
  privileges: ResellerMenuPrivilegesConfig,
  parent: ResellerMenuKey,
  childKey: string,
  enabled: boolean,
  menuDefs: PanelMenuItemDef[] = RESELLER_PRIVILEGE_MENU_DEFS,
): ResellerMenuPrivilegesConfig {
  const subKey = menuSubPrivilegeKey(parent, childKey);
  const resellerSub = { ...privileges.resellerSub, [subKey]: enabled };
  const reseller = { ...privileges.reseller };

  if (enabled) {
    reseller[parent] = true;
  } else {
    const parentDef = menuDefs.find((item) => item.id === parent);
    const siblings = (parentDef?.subItems ?? []).filter((item) => !isMenuHeaderSubItem(item.id));
    const anySiblingEnabled = siblings.some(
      (item) =>
        item.id !== childKey &&
        resellerSub[menuSubPrivilegeKey(parent, item.id)] !== false,
    );
    if (!anySiblingEnabled) {
      reseller[parent] = false;
    }
  }

  return { ...privileges, reseller, resellerSub };
}

export function filterMenuByPrivileges(
  items: PanelMenuItemDef[],
  privileges: ResellerMenuPrivilegesConfig,
): PanelMenuItemDef[] {
  return items
    .filter((item) => isResellerMenuEnabled(privileges, item.id))
    .map((item) => {
      if (!item.subItems?.length) return item;

      const subItems = item.subItems.filter((sub) => {
        if (isMenuHeaderSubItem(sub.id)) return true;
        return isResellerSubmenuEnabled(privileges, item.id, sub.id);
      });

      const hasNavigable = subItems.some((sub) => !isMenuHeaderSubItem(sub.id));
      if (!hasNavigable) return null;

      return { ...item, subItems };
    })
    .filter(Boolean) as PanelMenuItemDef[];
}
