import React, { useState, useEffect } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Compass,
  Flame,
  Lock,
  Map as MapIcon,
  MapPin,
  Sparkles,
  Waves,
  X,
} from 'lucide-react';
import {
  WorldId,
  getWorldOptionCopy,
  getWorldOptionState,
  resolveWorldSwitchAction,
} from '../game/worldSwitcher';

interface WorldSwitcherProps {
  world: WorldId;
  underworldUnlocked: boolean;
  isWalkingScene: boolean;
  isTransitioningWorld: boolean;
  tutorialStep: number;
  lang: 'en' | 'es';
  playerLevel?: number;
  playerCoins?: number;
  onTravelToWorld: (target: WorldId) => void;
  onOpenUnlockModal: () => void;
  onPlayClick?: () => void;
}

export const WorldSwitcher: React.FC<WorldSwitcherProps> = ({
  world,
  underworldUnlocked,
  isWalkingScene,
  isTransitioningWorld,
  tutorialStep,
  lang,
  playerLevel = 1,
  playerCoins = 0,
  onTravelToWorld,
  onOpenUnlockModal,
  onPlayClick,
}) => {
  const [showMapModal, setShowMapModal] = useState(false);

  const controlsLocked =
    tutorialStep > 0 || isWalkingScene || isTransitioningWorld;

  const riverState = getWorldOptionState('river', world, underworldUnlocked);
  const underworldState = getWorldOptionState(
    'underworld',
    world,
    underworldUnlocked
  );

  const riverMeta = getWorldOptionCopy('river', riverState, lang);
  const underworldMeta = getWorldOptionCopy(
    'underworld',
    underworldState,
    lang
  );

  useEffect(() => {
    if (!showMapModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMapModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showMapModal]);

  const handleOpenMap = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (controlsLocked) return;
    onPlayClick?.();
    setShowMapModal((prev) => !prev);
  };

  const handleSelectWorld = (
    e: React.MouseEvent<HTMLButtonElement>,
    targetWorld: WorldId
  ) => {
    e.currentTarget.blur();
    const action = resolveWorldSwitchAction({
      targetWorld,
      currentWorld: world,
      underworldUnlocked,
      isWalkingScene,
      isTransitioningWorld,
      tutorialStep,
    });
    if (action === 'travel') {
      setShowMapModal(false);
      onTravelToWorld(targetWorld);
    } else if (action === 'open_unlock_modal') {
      setShowMapModal(false);
      onOpenUnlockModal();
    }
  };

  const canUnlockNow =
    !underworldUnlocked && (playerLevel >= 10 || playerCoins >= 20000);

  return (
    <>
      {/* Classic Compact HUD Map Button */}
      <button
        type="button"
        data-testid="open-map-btn"
        disabled={controlsLocked}
        onClick={handleOpenMap}
        title={
          lang === 'en'
            ? `World Map (${world === 'underworld' ? 'Underworld' : 'River & Dock'})`
            : `Mapa de Mundos (${world === 'underworld' ? 'Inframundo' : 'Río y Muelle'})`
        }
        className={`btn-arcade btn-shine relative h-7 sm:h-8 lg:h-9 px-1.5 sm:px-2 lg:px-2.5 flex items-center gap-1 rounded-lg lg:rounded-xl font-display font-extrabold text-[10px] sm:text-[11px] lg:text-xs border border-white whitespace-nowrap shrink-0 transition-all ${
          world === 'underworld'
            ? 'bg-gradient-to-b from-[#fb923c] via-[#dc2626] to-[#991b1b] text-white shadow-[0_3px_10px_rgba(220,38,38,0.45)]'
            : 'bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0369a1] text-white shadow-[0_3px_10px_rgba(2,132,199,0.38)]'
        } ${
          controlsLocked
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer'
        }`}
      >
        <MapIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" aria-hidden="true" />
        <span>{lang === 'en' ? 'Map' : 'Mapa'}</span>
        <span
          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-white shrink-0 ${
            world === 'underworld'
              ? 'bg-[#fef08a] shadow-[0_0_6px_#fde047]'
              : 'bg-[#7dd3fc] shadow-[0_0_6px_#38bdf8]'
          }`}
          aria-hidden="true"
        />
        {canUnlockNow && (
          <span
            data-testid="map-unlock-ready-dot"
            className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#fde047] border border-[#78350f] animate-ping pointer-events-none"
          />
        )}
      </button>

      {/* Redesigned World Route Map Modal */}
      {showMapModal && (
        <div
          data-testid="route-map-modal"
          onClick={() => setShowMapModal(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-ui-backdrop pointer-events-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#0b192c] via-[#0f172a] to-[#1a0808] border-2 border-[#38bdf8]/60 shadow-[0_24px_70px_rgba(0,0,0,0.85)] overflow-hidden text-white flex flex-col animate-ui-modal-in"
          >
            {/* Modal Header */}
            <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#082f49] via-[#0f172a] to-[#450a0a] border-b border-white/15 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#38bdf8] via-[#0284c7] to-[#dc2626] p-0.5 shadow-md shrink-0">
                  <div className="w-full h-full rounded-[10px] bg-[#091326] flex items-center justify-center">
                    <Compass className="w-5 h-5 text-[#fde047]" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h2 className="font-display font-extrabold text-base sm:text-lg tracking-wide text-white truncate">
                    {lang === 'en' ? 'FISHING WORLD MAP' : 'MAPA DE MUNDOS'}
                  </h2>
                  <p className="text-[11px] font-semibold text-sky-200/80 truncate">
                    {lang === 'en'
                      ? 'Select a destination to travel instantly'
                      : 'Elige tu destino para viajar al instante'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="close-map-modal"
                onClick={() => {
                  onPlayClick?.();
                  setShowMapModal(false);
                }}
                aria-label={lang === 'en' ? 'Close map' : 'Cerrar mapa'}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Map Body: Destination Cards + Route Connector */}
            <div className="p-4 sm:p-5 flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
              {/* 1. RIVER / DOCK DESTINATION BUTTON CARD */}
              <button
                type="button"
                data-testid="map-travel-river-btn"
                data-world-state={riverState}
                disabled={controlsLocked}
                aria-pressed={riverState === 'active'}
                title={riverMeta.title}
                onClick={(e) => handleSelectWorld(e, 'river')}
                className={`group relative w-full text-left rounded-2xl p-3.5 sm:p-4 border-2 transition-all duration-200 overflow-hidden ${
                  riverState === 'active'
                    ? 'bg-gradient-to-br from-[#0c4a6e] via-[#0369a1] to-[#075985] border-[#7dd3fc] shadow-[0_0_25px_rgba(56,189,248,0.35)] cursor-default'
                    : 'bg-gradient-to-br from-[#082f49]/95 via-[#0c4a6e]/90 to-[#0f172a]/95 hover:from-[#0c4a6e] hover:via-[#0284c7] hover:to-[#0369a1] border-[#38bdf8]/55 hover:border-[#bae6fd] shadow-[0_10px_25px_rgba(2,132,199,0.28)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                }`}
              >
                {/* Decorative Water Highlight */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#38bdf8]/15 blur-xl"
                />

                <div className="relative z-10 flex items-center gap-3.5">
                  {/* Custom River / Dock Emblem SVG */}
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center shrink-0 shadow-inner ${
                      riverState === 'active'
                        ? 'bg-gradient-to-b from-[#38bdf8] to-[#0369a1] border-[#e0f2fe]'
                        : 'bg-gradient-to-b from-[#0284c7] to-[#0c4a6e] border-[#7dd3fc]/70 group-hover:border-white'
                    }`}
                  >
                    <svg
                      viewBox="0 0 64 64"
                      className="w-11 h-11 drop-shadow"
                      aria-hidden="true"
                    >
                      {/* Sky & snowy mountain */}
                      <circle cx="48" cy="16" r="6" fill="#fef08a" />
                      <polygon
                        points="8,42 24,18 40,42"
                        fill="#bae6fd"
                        stroke="#e0f2fe"
                        strokeWidth="1.5"
                      />
                      <polygon points="24,18 19,26 29,26" fill="#ffffff" />
                      {/* Wooden Dock */}
                      <rect
                        x="32"
                        y="34"
                        width="24"
                        height="5"
                        rx="1.5"
                        fill="#b45309"
                        stroke="#fde68a"
                        strokeWidth="1"
                      />
                      <rect x="36" y="39" width="3" height="9" fill="#78350f" />
                      <rect x="49" y="39" width="3" height="9" fill="#78350f" />
                      {/* River Waves */}
                      <path
                        d="M6 46 Q16 42 26 46 T46 46 T58 46 L58 56 L6 56 Z"
                        fill="#0284c7"
                      />
                      <path
                        d="M10 50 Q20 47 30 50 T52 50"
                        stroke="#e0f2fe"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                  </div>

                  {/* Destination Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#082f49]/90 border border-[#7dd3fc]/50 text-[#bae6fd]">
                        <Waves className="w-3 h-3 text-[#38bdf8]" />
                        <span>
                          {lang === 'en' ? 'Zone 1 · Surface' : 'Zona 1 · Superficie'}
                        </span>
                      </span>

                      {riverState === 'active' ? (
                        <span
                          data-testid="map-river-status-badge"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#fde047] text-[#0f172a] font-display font-extrabold text-[10px] uppercase tracking-wider shadow-sm"
                        >
                          <MapPin className="w-3 h-3 stroke-[2.5]" />
                          <span>
                            {lang === 'en' ? 'You are here' : 'Estás aquí'}
                          </span>
                        </span>
                      ) : (
                        <span
                          data-testid="map-river-status-badge"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#22c55e] text-[#052e16] font-display font-extrabold text-[10px] uppercase tracking-wider shadow-sm"
                        >
                          <span>
                            {lang === 'en' ? 'Unlocked' : 'Disponible'}
                          </span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-extrabold text-base sm:text-lg text-white mt-1 truncate">
                      {lang === 'en'
                        ? 'Icy River & Wooden Dock'
                        : 'Río Helado y Muelle'}
                    </h3>
                    <p className="text-xs text-sky-100/85 line-clamp-2 mt-0.5">
                      {lang === 'en'
                        ? 'Crystal winter waters, classic dock & access to the Grand Market.'
                        : 'Aguas cristalinas invernales, muelle clásico y acceso al Gran Mercado.'}
                    </p>

                    {/* Action Bar inside Card */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-white/15">
                      <span className="text-[11px] font-bold text-[#bae6fd]">
                        🐟 {lang === 'en' ? '65 Surface Species' : '65 Especies de Río'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl font-display font-extrabold text-xs transition-transform ${
                          riverState === 'active'
                            ? 'bg-white/15 text-white border border-white/25'
                            : 'bg-gradient-to-b from-[#fde047] to-[#f59e0b] text-[#0f172a] border border-[#fef9c3] shadow-md group-hover:translate-x-0.5'
                        }`}
                      >
                        {riverState === 'active' ? (
                          <span>
                            {lang === 'en' ? 'Current World' : 'Mundo Actual'}
                          </span>
                        ) : (
                          <>
                            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>
                              {lang === 'en'
                                ? 'Return to River'
                                : 'Volver al Río'}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* ROUTE CONNECTOR BETWEEN SURFACE & UNDERWORLD */}
              <div
                aria-hidden="true"
                className="flex items-center justify-center gap-2.5 py-0.5"
              >
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#38bdf8]/40 to-[#ef4444]/40" />
                <div className="px-3 py-1 rounded-full bg-[#090d16] border border-white/15 flex items-center gap-1.5 text-[10px] font-display font-extrabold uppercase tracking-wider text-amber-200/90 shadow-inner">
                  <Sparkles className="w-3 h-3 text-[#fde047]" />
                  <span>
                    {world === 'river'
                      ? lang === 'en'
                        ? 'Abyssal Portal Route'
                        : 'Ruta del Portal Abisal'
                      : lang === 'en'
                        ? 'Surface Ascent Route'
                        : 'Ruta de Ascenso al Río'}
                  </span>
                  {world === 'river' ? (
                    <ArrowDown className="w-3 h-3 text-[#fb923c]" />
                  ) : (
                    <ArrowUp className="w-3 h-3 text-[#38bdf8]" />
                  )}
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[#ef4444]/40 via-[#38bdf8]/40 to-transparent" />
              </div>

              {/* 2. UNDERWORLD DESTINATION BUTTON CARD */}
              <button
                type="button"
                data-testid="map-travel-underworld-btn"
                data-world-state={underworldState}
                disabled={controlsLocked}
                aria-pressed={underworldState === 'active'}
                title={underworldMeta.title}
                onClick={(e) => handleSelectWorld(e, 'underworld')}
                className={`group relative w-full text-left rounded-2xl p-3.5 sm:p-4 border-2 transition-all duration-200 overflow-hidden ${
                  underworldState === 'active'
                    ? 'bg-gradient-to-br from-[#7f1d1d] via-[#991b1b] to-[#450a0a] border-[#fca5a5] shadow-[0_0_28px_rgba(239,68,68,0.45)] cursor-default'
                    : underworldState === 'available'
                      ? 'bg-gradient-to-br from-[#450a0a]/95 via-[#7f1d1d]/90 to-[#1f0707]/95 hover:from-[#7f1d1d] hover:via-[#b91c1c] hover:to-[#450a0a] border-[#f87171]/65 hover:border-[#fed7aa] shadow-[0_10px_28px_rgba(220,38,38,0.35)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                      : 'bg-gradient-to-br from-[#1e1b4b]/85 via-[#1e293b]/90 to-[#2a0a0a]/90 hover:from-[#31102f] hover:to-[#450a0a] border-amber-400/45 hover:border-amber-300 shadow-[0_8px_22px_rgba(0,0,0,0.45)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                }`}
              >
                {/* Decorative Magma Glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-[#f97316]/20 blur-xl"
                />

                <div className="relative z-10 flex items-center gap-3.5">
                  {/* Custom Underworld Volcanic Emblem SVG */}
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center shrink-0 shadow-inner ${
                      underworldState === 'active'
                        ? 'bg-gradient-to-b from-[#fb923c] via-[#dc2626] to-[#7f1d1d] border-[#fef08a]'
                        : underworldState === 'available'
                          ? 'bg-gradient-to-b from-[#dc2626] to-[#450a0a] border-[#fca5a5]/80 group-hover:border-[#fef08a]'
                          : 'bg-gradient-to-b from-[#334155] to-[#1e1b4b] border-amber-300/60'
                    }`}
                  >
                    <svg
                      viewBox="0 0 64 64"
                      className="w-11 h-11 drop-shadow"
                      aria-hidden="true"
                    >
                      {/* Volcanic Portal Arch */}
                      <circle
                        cx="32"
                        cy="28"
                        r="18"
                        fill="#450a0a"
                        stroke="#fb923c"
                        strokeWidth="2.5"
                      />
                      {/* Volcano Peak */}
                      <polygon
                        points="12,48 25,24 39,24 52,48"
                        fill="#7f1d1d"
                        stroke="#f87171"
                        strokeWidth="1.4"
                      />
                      {/* Erupting Lava Plume */}
                      <path
                        d="M27 24 Q32 10 37 24 Q34 32 32 36 Q29 31 27 24 Z"
                        fill="#fde047"
                      />
                      {/* Lava River */}
                      <path
                        d="M8 48 Q20 44 32 48 T56 48 L56 56 L8 56 Z"
                        fill="#ea580c"
                      />
                      <path
                        d="M14 52 Q26 49 38 52 T52 52"
                        stroke="#fef08a"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                  </div>

                  {/* Destination Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#2a0606]/90 border border-[#f87171]/50 text-[#fecaca]">
                        <Flame className="w-3 h-3 text-[#fb923c]" />
                        <span>
                          {lang === 'en' ? 'Zone 2 · Abyssal Magma' : 'Zona 2 · Abismo Volcánico'}
                        </span>
                      </span>

                      {underworldState === 'active' ? (
                        <span
                          data-testid="map-underworld-status-badge"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#fde047] text-[#450a0a] font-display font-extrabold text-[10px] uppercase tracking-wider shadow-sm"
                        >
                          <MapPin className="w-3 h-3 stroke-[2.5]" />
                          <span>
                            {lang === 'en' ? 'You are here' : 'Estás aquí'}
                          </span>
                        </span>
                      ) : underworldState === 'available' ? (
                        <span
                          data-testid="map-underworld-status-badge"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#22c55e] text-[#052e16] font-display font-extrabold text-[10px] uppercase tracking-wider shadow-sm"
                        >
                          <span>
                            {lang === 'en' ? 'Unlocked' : 'Desbloqueado'}
                          </span>
                        </span>
                      ) : (
                        <span
                          data-testid="map-underworld-status-badge"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/60 text-[#fde047] font-display font-extrabold text-[10px] uppercase tracking-wider"
                        >
                          <Lock className="w-3 h-3" />
                          <span>
                            {lang === 'en'
                              ? 'Lv. 10 or 20,000 coins'
                              : 'Nv. 10 o 20.000 monedas'}
                          </span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-extrabold text-base sm:text-lg text-white mt-1 truncate">
                      {lang === 'en'
                        ? 'Volcanic Underworld'
                        : 'Inframundo Volcánico'}
                    </h3>
                    <p className="text-xs text-orange-100/85 line-clamp-2 mt-0.5">
                      {underworldState === 'locked'
                        ? lang === 'en'
                          ? 'Reach Level 10 for free access or make a pact with the Pier Devil for 20,000 coins.'
                          : 'Alcanza el Nivel 10 para entrar gratis o haz el pacto con el Diablo del Muelle por 20.000 monedas.'
                        : lang === 'en'
                          ? 'Boiling lava seas home to mythical & abyssal secret creatures.'
                          : 'Mares de lava ardiente con criaturas míticas y secretos abisales exclusivos.'}
                    </p>

                    {/* Action Bar inside Card */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-white/15">
                      <span className="text-[11px] font-bold text-[#fed7aa]">
                        🔥 {lang === 'en' ? '45 Abyssal Species' : '45 Especies Abisales'}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl font-display font-extrabold text-xs transition-transform ${
                          underworldState === 'active'
                            ? 'bg-white/15 text-white border border-white/25'
                            : underworldState === 'available'
                              ? 'bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#ea580c] text-[#1e1b4b] border border-[#fef9c3] shadow-md group-hover:translate-x-0.5'
                              : 'bg-gradient-to-b from-[#f59e0b] to-[#b45309] text-white border border-[#fde68a] shadow-md group-hover:translate-x-0.5'
                        }`}
                      >
                        {underworldState === 'active' ? (
                          <span>
                            {lang === 'en' ? 'Current World' : 'Mundo Actual'}
                          </span>
                        ) : underworldState === 'available' ? (
                          <>
                            <Flame className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>
                              {lang === 'en'
                                ? 'Travel to Underworld'
                                : 'Ir al Inframundo'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>
                              {canUnlockNow
                                ? lang === 'en'
                                  ? 'Unlock Portal Now!'
                                  : '¡Desbloquear Portal!'
                                : lang === 'en'
                                  ? 'View Unlock Pact'
                                  : 'Ver Pacto de Acceso'}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export interface WorldTravelOverlayProps {
  targetWorld: WorldId | null;
  lang: 'en' | 'es';
}

export const WorldTravelOverlay: React.FC<WorldTravelOverlayProps> = ({
  targetWorld,
  lang,
}) => {
  const isToUnderworld = targetWorld === 'underworld';

  return (
    <div
      data-testid="world-travel-overlay"
      data-target-world={targetWorld ?? 'river'}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 pointer-events-auto overflow-hidden ${
        isToUnderworld
          ? 'bg-gradient-to-b from-[#140303] via-[#450a0a] to-[#090101] text-[#fecaca]'
          : 'bg-gradient-to-b from-[#041e30] via-[#0369a1] to-[#082f49] text-[#e0f2fe]'
      }`}
    >
      {/* Ambient Radial Aura */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute w-[420px] h-[420px] rounded-full blur-3xl opacity-50 ${
          isToUnderworld
            ? 'bg-gradient-to-r from-[#dc2626] via-[#f97316] to-[#fde047]'
            : 'bg-gradient-to-r from-[#38bdf8] via-[#22d3ee] to-[#34d399]'
        }`}
      />

      {/* Animated Portal Rings + Emblem */}
      <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center mb-6">
        {/* Outer Spinning Ring */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full animate-portal-spin"
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke={isToUnderworld ? '#fb923c' : '#7dd3fc'}
            strokeWidth="4"
            strokeDasharray="24 14 10 14"
            strokeLinecap="round"
          />
          <circle
            cx="100"
            cy="10"
            r="6"
            fill={isToUnderworld ? '#fde047' : '#ffffff'}
          />
          <circle
            cx="100"
            cy="190"
            r="6"
            fill={isToUnderworld ? '#fde047' : '#ffffff'}
          />
        </svg>

        {/* Inner Counter-Spinning Ring */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-3 w-[calc(100%-24px)] h-[calc(100%-24px)] animate-portal-spin-reverse"
          aria-hidden="true"
        >
          <circle
            cx="100"
            cy="100"
            r="74"
            fill="none"
            stroke={isToUnderworld ? '#fde047' : '#bae6fd'}
            strokeWidth="3.5"
            strokeDasharray="18 20"
            strokeLinecap="round"
          />
        </svg>

        {/* Center Crest Emblem */}
        <div
          className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 flex items-center justify-center shadow-2xl ${
            isToUnderworld
              ? 'bg-gradient-to-b from-[#991b1b] via-[#dc2626] to-[#450a0a] border-[#fde047] shadow-[0_0_45px_rgba(249,115,22,0.85)]'
              : 'bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0c4a6e] border-[#e0f2fe] shadow-[0_0_45px_rgba(56,189,248,0.85)]'
          }`}
        >
          {isToUnderworld ? (
            <svg viewBox="0 0 64 64" className="w-16 h-16 drop-shadow-lg">
              <polygon
                points="10,50 24,22 40,22 54,50"
                fill="#450a0a"
                stroke="#fca5a5"
                strokeWidth="2"
              />
              <path
                d="M26 22 Q32 6 38 22 Q35 34 32 42 Q29 34 26 22 Z"
                fill="#fde047"
              />
              <path
                d="M12 50 Q24 45 36 50 T54 50"
                stroke="#fb923c"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 64 64" className="w-16 h-16 drop-shadow-lg">
              <circle cx="46" cy="16" r="6" fill="#fef08a" />
              <polygon
                points="10,44 26,18 42,44"
                fill="#e0f2fe"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <path
                d="M8 46 Q20 40 32 46 T56 46"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M12 53 Q24 48 36 53 T54 53"
                stroke="#bae6fd"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Journey Direction Tag */}
      <span
        className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-xs font-display font-extrabold uppercase tracking-widest mb-2 shadow-md ${
          isToUnderworld
            ? 'bg-[#450a0a]/90 border-[#fb923c] text-[#fde047]'
            : 'bg-[#082f49]/90 border-[#7dd3fc] text-[#bae6fd]'
        }`}
      >
        {isToUnderworld ? (
          <>
            <Flame className="w-3.5 h-3.5 text-[#fb923c]" />
            <span>
              {lang === 'en' ? 'Abyssal Descent' : 'Descenso Abisal'}
            </span>
          </>
        ) : (
          <>
            <Waves className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>
              {lang === 'en' ? 'Surface Return' : 'Regreso a la Superficie'}
            </span>
          </>
        )}
      </span>

      {/* Title & Subtitle */}
      <h2 className="relative z-10 font-display font-extrabold text-2xl sm:text-4xl tracking-wider uppercase text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.75)] text-center">
        {isToUnderworld
          ? lang === 'en'
            ? 'Descending to the Underworld...'
            : 'Descendiendo al Inframundo...'
          : lang === 'en'
            ? 'Returning to the Icy River...'
            : 'Volviendo al Río Helado...'}
      </h2>

      <p className="relative z-10 mt-1.5 text-xs sm:text-sm font-semibold opacity-95 text-center max-w-md">
        {isToUnderworld
          ? lang === 'en'
            ? 'Crossing the volcanic magma portal into the boiling abyss...'
            : 'Atravesando el portal volcánico hacia los mares de magma...'
          : lang === 'en'
            ? 'Ascending back to the crystalline waters of the surface dock...'
            : 'Ascendiendo de regreso a las aguas cristalinas del muelle...'}
      </p>

      {/* Smooth Animated Progress Bar */}
      <div className="relative z-10 mt-6 w-64 sm:w-80 h-3 rounded-full bg-black/50 border border-white/30 p-0.5 overflow-hidden shadow-inner">
        <div
          className={`h-full w-full origin-left rounded-full animate-world-travel-bar ${
            isToUnderworld
              ? 'bg-gradient-to-r from-[#f97316] via-[#ef4444] to-[#fde047]'
              : 'bg-gradient-to-r from-[#38bdf8] via-[#22d3ee] to-[#fde047]'
          }`}
        />
      </div>
    </div>
  );
};
