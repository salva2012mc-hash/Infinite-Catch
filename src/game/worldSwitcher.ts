export type WorldId = 'river' | 'underworld';

export type WorldOptionState = 'active' | 'available' | 'locked';

export type WorldSwitchResolution = 'noop' | 'travel' | 'open_unlock_modal';

export interface WorldSwitchCheckParams {
  targetWorld: WorldId;
  currentWorld: WorldId;
  underworldUnlocked: boolean;
  isWalkingScene: boolean;
  isTransitioningWorld: boolean;
  tutorialStep: number;
}

export function getWorldOptionState(
  targetWorld: WorldId,
  currentWorld: WorldId,
  underworldUnlocked: boolean
): WorldOptionState {
  if (targetWorld === 'underworld' && !underworldUnlocked) {
    return 'locked';
  }
  if (currentWorld === targetWorld) {
    return 'active';
  }
  return 'available';
}

export function resolveWorldSwitchAction(
  params: WorldSwitchCheckParams
): WorldSwitchResolution {
  if (
    params.tutorialStep > 0 ||
    params.isWalkingScene ||
    params.isTransitioningWorld
  ) {
    return 'noop';
  }

  const state = getWorldOptionState(
    params.targetWorld,
    params.currentWorld,
    params.underworldUnlocked
  );

  if (state === 'active') {
    return 'noop';
  }
  if (state === 'locked') {
    return 'open_unlock_modal';
  }
  return 'travel';
}

export interface WorldOptionMeta {
  label: string;
  lockBadge: string;
  statusLabel: string;
  ariaLabel: string;
  title: string;
}

export function getWorldOptionCopy(
  targetWorld: WorldId,
  state: WorldOptionState,
  lang: 'en' | 'es'
): WorldOptionMeta {
  if (targetWorld === 'river') {
    const label = lang === 'en' ? 'River' : 'Río';
    const statusLabel =
      state === 'active'
        ? lang === 'en'
          ? 'Active'
          : 'Activo'
        : lang === 'en'
          ? 'Available'
          : 'Disponible';
    const title =
      state === 'active'
        ? lang === 'en'
          ? 'Icy River & Dock (Active)'
          : 'Río y Muelle (Activo)'
        : lang === 'en'
          ? 'Travel back to the Icy River & Dock'
          : 'Volver al Río y Muelle';
    return {
      label,
      lockBadge: '',
      statusLabel,
      ariaLabel: `${label} · ${statusLabel}`,
      title,
    };
  }

  const label = lang === 'en' ? 'Underworld' : 'Inframundo';
  if (state === 'locked') {
    const lockBadge = lang === 'en' ? 'Lv.10' : 'Nv.10';
    const statusLabel = lang === 'en' ? 'Locked' : 'Bloqueado';
    const title =
      lang === 'en'
        ? 'Underworld locked — Reach Level 10 or pay 20,000 coins'
        : 'Inframundo bloqueado — Alcanza el Nivel 10 o paga 20.000 monedas';
    return {
      label,
      lockBadge,
      statusLabel,
      ariaLabel: `${label} · ${statusLabel} (${lockBadge})`,
      title,
    };
  }

  if (state === 'active') {
    const statusLabel = lang === 'en' ? 'Active' : 'Activo';
    return {
      label,
      lockBadge: '',
      statusLabel,
      ariaLabel: `${label} · ${statusLabel}`,
      title: lang === 'en' ? 'Underworld (Active)' : 'Inframundo (Activo)',
    };
  }

  const statusLabel = lang === 'en' ? 'Available' : 'Disponible';
  return {
    label,
    lockBadge: '',
    statusLabel,
    ariaLabel: `${label} · ${statusLabel}`,
    title:
      lang === 'en'
        ? 'Travel to the Underworld'
        : 'Viajar al Inframundo',
  };
}
