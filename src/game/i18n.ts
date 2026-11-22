export type Language = 'en' | 'es';

export interface Translations {
  play: string;
  loginGoogle: string;
  connectingGoogle: string;
  signOut: string;
  cloudActive: string;
  pressHookToFish: string;
  captures: string;
  coins: string;
  backpack: string;
  map: string;
  index: string;
  market: string;
  menu: string;
  pause: string;
  mute: string;
  unmute: string;
  castHook: string;
  castWithWand: string;
  casting: string;
  waiting: string;
  canalizing: string;
  bitingRiver: string;
  bitingMystery: string;
  bitingAbyss: string;
  pullNow: string;
  attractMagic: string;
  escaped: string;
  caught: string;
  pausedTitle: string;
  continue: string;
  deleteProgress: string;
  warning: string;
  deleteConfirmWarning: string;
  yesContinue: string;
  cancel: string;
  warningOfWarning: string;
  deleteWarningText: string;
  startLegendaryMinigame: string;
  cancelAndKeep: string;
  legendaryEscaped: string;
  legendaryRetryText: string;
  repeatLegendaryMinigame: string;
  cancelDeletion: string;
  riverNormal: string;
  underworld: string;
  here: string;
  travel: string;
  rotateDevice: string;
  rotateDeviceDesc: string;
  adminConsole: string;
  luckBoost: string;
  luckChestTitle: string;
  luckChestDesc: string;
  openChest: string;
  reviveTitle: string;
  reviveDesc: string;
  reviveForCoins: string;
  giveUp: string;
  tutorialStep1: string;
  tutorialStep2: string;
  tutorialStep3: string;
  tutorialStep4: string;
  tutorialStep5: string;
  tutorialDesc1: string;
  tutorialDesc2: string;
  tutorialDesc3: string;
  tutorialDesc4: string;
  tutorialDesc5: string;
  openIndexPrompt: string;
  openMarketPrompt: string;
  openMenuPrompt: string;
  tapToCastPrompt: string;
  tapToReelPrompt: string;
  tapToCastAgainPrompt: string;
  rarities: Record<string, string>;
  rarityFilters: Record<string, string>;
  rarityDescriptions: Record<string, string>;
  fishNames: Record<number, { en: string; es: string }>;
}

const SHARED_FISH_NAMES: Record<number, { en: string; es: string }> = {
  1: { en: 'Carp', es: 'Carpa' },
  2: { en: 'Bleak', es: 'Alburno' },
  3: { en: 'Catfish', es: 'Pez gato' },
  4: { en: 'Pumpkinseed', es: 'Percasol' },
  5: { en: 'Guppy', es: 'Guppy' },
  6: { en: 'Bullhead', es: 'Bagre' },
  7: { en: 'Trout', es: 'Trucha' },
  8: { en: 'Barbel', es: 'Barbo' },
  9: { en: 'Chub', es: 'Cacho' },
  10: { en: 'Piranha', es: 'Piraña' },
  11: { en: 'Rainbow trout', es: 'Trucha arcoíris' },
  12: { en: 'Tench', es: 'Tenca' },
  13: { en: 'Pike', es: 'Lucio' },
  14: { en: 'Boga', es: 'Boga' },
  15: { en: 'Angelfish', es: 'Pez ángel' },
  16: { en: 'Discus fish', es: 'Pez disco' },
  17: { en: 'Bocachico', es: 'Bocachico' },
  18: { en: 'Salmon', es: 'Salmón' },
  19: { en: 'European eel', es: 'Anguila europea' },
  20: { en: 'Sturgeon', es: 'Esturión' },
  21: { en: 'River gudgeon', es: 'Gobio de río' },
  22: { en: 'Wild goldfish', es: 'Carpín dorado salvaje' },
  23: { en: 'Red roach', es: 'Bermejuela' },
  24: { en: 'Vandoise', es: 'Madrilla' },
  25: { en: 'Sarda', es: 'Sarda' },
  26: { en: 'Pardilla', es: 'Pardilla' },
  27: { en: 'River blenny', es: 'Blenio de río' },
  28: { en: 'Calandino', es: 'Calandino' },
  29: { en: 'Loach', es: 'Colmilleja' },
  30: { en: 'Darso', es: 'Darso' },
  31: { en: 'Red-tailed barbel', es: 'Barbo colirrojo' },
  32: { en: 'Creek chub', es: 'Cachito de arroyo' },
  33: { en: 'Allis shad', es: 'Sábalo' },
  34: { en: 'Twaite shad', es: 'Saboga' },
  35: { en: 'Zander', es: 'Lucio-perca' },
  36: { en: 'Smallmouth bass', es: 'Black Bass pequeño' },
  37: { en: 'Comizo barbel', es: 'Barbo comiza' },
  38: { en: 'Albino catfish', es: 'Siluro albino' },
  39: { en: 'Giant pike', es: 'Lucio gigante' },
  40: { en: 'Danube salmon', es: 'Salmón del Danubio' },
  41: { en: 'Pacu', es: 'Paci' },
  42: { en: 'Giant mirror carp', es: 'Carpa espejo gigante' },
  43: { en: 'Beluga sturgeon', es: 'Esturión beluga' },
  44: { en: 'Arapaima gigas', es: 'Arapaima gigas' },
  45: { en: 'American paddlefish', es: 'Pez espátula americano' },
  46: { en: 'Century giant catfish', es: 'Siluro gigante centenario' },
  47: { en: 'Deep river coelacanth', es: 'Celacanto de río profundo' },
  48: { en: 'Giant electric eel', es: 'Anguila eléctrica gigante' },
  49: { en: 'Ancient freshwater dragon', es: 'Dragón de agua dulce ancestral' },
  50: { en: 'Abyssal rift lake monster', es: 'Monstruo del lago de las simas abisales' },
  51: { en: 'Blobfish', es: 'Pez borrón' },
  101: { en: 'Fire Demon Fish', es: 'Pez Demonio de Fuego' },
  102: { en: 'Magma Eel', es: 'Anguila de Magma' },
  103: { en: 'Magma Skulls', es: 'Calaveras de Magma' },
  104: { en: 'Mini Demon', es: 'Mini Demonio' },
  105: { en: 'Magma Heart', es: 'Corazón de Magma' },
  106: { en: 'Obsidian', es: 'Obsidiana' },
  107: { en: 'Souls', es: 'Almas' },
  108: { en: 'Burnt Wood', es: 'Madera quemada' },
  109: { en: 'Corpses', es: 'Cadáveres' },
  110: { en: 'Horns', es: 'Cuernos' },
  111: { en: 'Ashes', es: 'Cenizas' },
  112: { en: 'Magma Wings', es: 'Alas de magma' },
  113: { en: 'Scorched Scroll', es: 'Pergamino quemado' },
  114: { en: 'Fire Boar', es: 'Jabalí de fuego' },
};

export const COSMETICS_I18N: Record<
  string,
  { en: { name: string; description: string }; es: { name: string; description: string } }
> = {
  beard_fisher: {
    en: {
      name: 'Angler Beard',
      description: 'A thick beard built for icy river breezes.',
    },
    es: {
      name: 'Barba de Pescador',
      description: 'Una barba espesa ideal para el frío de Kanto.',
    },
  },
  hat_red: {
    en: {
      name: 'Classic Red Cap',
      description: 'Classic adventure trainer cap style.',
    },
    es: {
      name: 'Gorra Roja Clásica',
      description: 'Estilo entrenador clásico de Pueblo Paleta.',
    },
  },
  scarf_gold: {
    en: {
      name: 'Golden Scarf',
      description: 'Bright scarf woven with soft golden wool.',
    },
    es: {
      name: 'Bufanda Dorada',
      description: 'Bufanda brillante tejida con lana de Mareep.',
    },
  },
  glasses_cool: {
    en: {
      name: 'Sunglasses',
      description: 'Blocks harsh glare off the sparkling water.',
    },
    es: {
      name: 'Gafas de Sol',
      description: 'Para evitar el reflejo del sol en la nieve.',
    },
  },
  coat_polar: {
    en: {
      name: 'Blue Polar Coat',
      description: 'Thermal arctic expedition coat.',
    },
    es: {
      name: 'Abrigo Polar Azul',
      description: 'Abrigo térmico de expedición ártica.',
    },
  },
  height_tall: {
    en: {
      name: 'Height Boost',
      description: 'Tall platform boots that boost the angler’s height.',
    },
    es: {
      name: 'Mejora de Altura',
      description: 'Botas altas que aumentan la estatura del pescador.',
    },
  },
  rod_carbon: {
    en: {
      name: 'Carbon Rod',
      description: 'Ultra-light high-tension carbon fiber rod. Reduces base fishing time from 5s to 4s.',
    },
    es: {
      name: 'Caña de Carbono',
      description: 'Fibra de carbono ultraligera de alta tensión. Reduce el tiempo base de pesca de 5s a 4s.',
    },
  },
  rod_gold: {
    en: {
      name: 'Golden Rod',
      description: 'Master forged gold rod: eases tension & struggle control, grants 1.5x luck, and reduces fishing time to 3s.',
    },
    es: {
      name: 'Caña de Oro',
      description: 'Caña maestra de oro forjado: facilita el control de tensión y forcejeo, otorga 1,5x de suerte y reduce el tiempo de pesca a 3s.',
    },
  },
  shirt_blue: {
    en: {
      name: 'Blue T-Shirt',
      description: 'Comfortable blue tee for relaxing dock fishing.',
    },
    es: {
      name: 'Camiseta Azul',
      description: 'Camiseta azul cómoda para pescar en el muelle.',
    },
  },
  shirt_green: {
    en: {
      name: 'Green T-Shirt',
      description: 'Forest green tee tailored for the river.',
    },
    es: {
      name: 'Camiseta Verde',
      description: 'Camiseta verde bosque ideal para el río.',
    },
  },
  shirt_red: {
    en: {
      name: 'Red T-Shirt',
      description: 'Vibrant crimson tournament tee.',
    },
    es: {
      name: 'Camiseta Roja',
      description: 'Camiseta rojo carmesí vibrante de competición.',
    },
  },
  shirt_yellow: {
    en: {
      name: 'Yellow T-Shirt',
      description: 'High-visibility sunny yellow tee.',
    },
    es: {
      name: 'Camiseta Amarilla',
      description: 'Camiseta amarillo sol de alta visibilidad.',
    },
  },
  shirt_purple: {
    en: {
      name: 'Purple T-Shirt',
      description: 'Night-edition neon purple tee.',
    },
    es: {
      name: 'Camiseta Morada',
      description: 'Camiseta morado neón de edición nocturna.',
    },
  },
  shirt_orange: {
    en: {
      name: 'Orange T-Shirt',
      description: 'Classic fiery orange tee.',
    },
    es: {
      name: 'Camiseta Naranja',
      description: 'Camiseta naranja fuego de estilo clásico.',
    },
  },
  shirt_black: {
    en: {
      name: 'Black T-Shirt',
      description: 'Sleek and durable obsidian black tee.',
    },
    es: {
      name: 'Camiseta Negra',
      description: 'Camiseta negro obsidiana elegante y resistente.',
    },
  },
  pants_cargo: {
    en: {
      name: 'Fishing Cargo Pants',
      description: 'Olive green pants packed with utility pockets.',
    },
    es: {
      name: 'Pantalones de Pesca',
      description: 'Pantalones verde oliva con bolsillos múltiples.',
    },
  },
  pants_black: {
    en: {
      name: 'Black Pants',
      description: 'All-terrain waterproof black trousers.',
    },
    es: {
      name: 'Pantalones Negros',
      description: 'Pantalones negros impermeables todo terreno.',
    },
  },
  pants_red: {
    en: {
      name: 'Red Pants',
      description: 'Sporty red pants with reinforced knees.',
    },
    es: {
      name: 'Pantalones Rojos',
      description: 'Pantalones rojos deportivos con refuerzo en rodillas.',
    },
  },
  pants_khaki: {
    en: {
      name: 'Khaki Pants',
      description: 'Lightweight sand-colored pants for any weather.',
    },
    es: {
      name: 'Pantalones Beige',
      description: 'Pantalones color arena ligeros para cualquier clima.',
    },
  },
  pants_purple: {
    en: {
      name: 'Purple Pants',
      description: 'Purple trousers with reinforced side pockets.',
    },
    es: {
      name: 'Pantalones Morados',
      description: 'Pantalones morados con bolsillos laterales reforzados.',
    },
  },
  pants_ice: {
    en: {
      name: 'Sky Blue Pants',
      description: 'Glacier blue pants matching the icy horizon.',
    },
    es: {
      name: 'Pantalones Celeste',
      description: 'Pantalones azul glaciar a juego con el hielo.',
    },
  },
  boots_tall: {
    en: {
      name: 'Tall Boots (+Height)',
      description: 'Thick-soled wader boots that make you taller.',
    },
    es: {
      name: 'Botas Altas (+Altura)',
      description: 'Botas de pescador con suela gruesa que te hacen más alto.',
    },
  },
  rod_cut: {
    en: {
      name: 'Sport Short Rod',
      description: 'Lightweight shortened rod built for snappy casts.',
    },
    es: {
      name: 'Caña Corta Deportiva',
      description: 'Caña recortada ligera para lanzamientos rápidos.',
    },
  },
  rod_og: {
    en: {
      name: 'OG Rod',
      description: 'Limited-edition futuristic orange rod (5 days, unlimited claims while active). Reels in much faster (~2s).',
    },
    es: {
      name: 'Caña OG',
      description: 'Caña futurista naranja de edición limitada (5 días, reclamos ilimitados durante el evento). Pesca mucho más rápido (~2s).',
    },
  },
  suit_millionaire: {
    en: {
      name: 'Millionaire Suit',
      description: 'Complete luxury outfit: black & gold tuxedo, top hat, monocle, and golden millionaire aura.',
    },
    es: {
      name: 'Traje de Millonario',
      description: 'Conjunto completo de lujo: esmoquin negro y oro, chistera, monóculo y aura dorada de millonario.',
    },
  },
  suit_magma: {
    en: {
      name: 'Magma Suit',
      description: 'Full volcanic armor of obsidian and molten lava with a fiery helm and sparks.',
    },
    es: {
      name: 'Traje de Magma',
      description: 'Armadura volcánica completa de obsidiana y lava ardiente con casco ígneo y chispas.',
    },
  },
  suit_wizard: {
    en: {
      name: 'Wizard Suit',
      description: 'Starry robe, wizard hat, and magic wand: replaces the rod so you fish with spells and no hook.',
    },
    es: {
      name: 'Traje de Mago',
      description: 'Túnica estelar, gorro de mago y varita mágica: sustituye la caña para pescar con hechizos sin anzuelo.',
    },
  },
  shirt_cyan: {
    en: {
      name: 'Cyan T-Shirt',
      description: 'Crisp turquoise tee inspired by crystal-clear waters.',
    },
    es: {
      name: 'Camiseta Turquesa',
      description: 'Camiseta fresca turquesa inspirada en las aguas cristalinas.',
    },
  },
  shirt_pink: {
    en: {
      name: 'Coral Pink T-Shirt',
      description: 'Eye-catching coral pink tee for stylish casting.',
    },
    es: {
      name: 'Camiseta Rosa Coral',
      description: 'Camiseta rosa coral llamativa para pescar con estilo.',
    },
  },
  shirt_emerald: {
    en: {
      name: 'Emerald Vest',
      description: 'Lightweight emerald green vest with explorer pockets.',
    },
    es: {
      name: 'Chaleco Esmeralda',
      description: 'Chaleco verde esmeralda ligero con bolsillos de explorador.',
    },
  },
  shirt_gold: {
    en: {
      name: 'Golden Jacket',
      description: 'Shiny gold-edition jacket for master anglers.',
    },
    es: {
      name: 'Chaqueta Dorada',
      description: 'Chaqueta brillante de edición dorada para pescadores expertos.',
    },
  },
  coat_hoodie: {
    en: {
      name: 'Pullover Hoodie',
      description: 'Cozy blue hoodie with drawstrings for the river breeze.',
    },
    es: {
      name: 'Sudadera con Capucha',
      description: 'Sudadera azul cómoda con capucha y cordones para la brisa del río.',
    },
  },
  coat_jacket_crimson: {
    en: {
      name: 'Crimson Windbreaker',
      description: 'Waterproof red sport jacket with high collar and white stripe.',
    },
    es: {
      name: 'Chaqueta Cortavientos Roja',
      description: 'Chaqueta deportiva impermeable roja con cuello alto y franja blanca.',
    },
  },
  pants_denim: {
    en: {
      name: 'Classic Jeans',
      description: 'Durable blue denim jeans built for any trip.',
    },
    es: {
      name: 'Vaqueros Clásicos',
      description: 'Pantalones vaqueros azules resistentes para cualquier jornada.',
    },
  },
  pants_white: {
    en: {
      name: 'White Trousers',
      description: 'Crisp tailored white trousers with a clean cut.',
    },
    es: {
      name: 'Pantalones Blancos',
      description: 'Pantalones blancos impecables de corte elegante.',
    },
  },
  pants_gold: {
    en: {
      name: 'Golden Trousers',
      description: 'Tournament-grade golden pants with shimmering trim.',
    },
    es: {
      name: 'Pantalones Dorados',
      description: 'Pantalones dorados de competición con ribetes brillantes.',
    },
  },
  hat_cap_blue: {
    en: {
      name: 'Navy Blue Cap',
      description: 'Navy blue cap with a golden angler emblem.',
    },
    es: {
      name: 'Gorra Azul Marina',
      description: 'Gorra azul marina con emblema dorado de pescador.',
    },
  },
  hat_beanie_wool: {
    en: {
      name: 'Winter Wool Beanie',
      description: 'Warm blue knit beanie topped with a white pom-pom.',
    },
    es: {
      name: 'Gorro de Lana Invernal',
      description: 'Gorro calentito de punto azul con pompón blanco.',
    },
  },
  hat_crown: {
    en: {
      name: 'Royal Crown',
      description: 'Solid gold crown set with rubies for the king of the dock.',
    },
    es: {
      name: 'Corona Real',
      description: 'Corona de oro macizo con rubíes para el rey del muelle.',
    },
  },
  glasses_pixel: {
    en: {
      name: 'VIP Pixel Shades',
      description: 'Retro arcade square shades for true champions.',
    },
    es: {
      name: 'Gafas Pixel VIP',
      description: 'Gafas cuadradas retro estilo arcade de campeón.',
    },
  },
  scarf_crimson: {
    en: {
      name: 'Crimson Scarf',
      description: 'Soft crimson scarf knit to block the dock wind.',
    },
    es: {
      name: 'Bufanda Carmesí',
      description: 'Bufanda suave rojo carmesí tejida para el viento del muelle.',
    },
  },
};

export const DICTIONARIES: Record<Language, { ui: Translations }> = {
  en: {
    ui: {
      play: 'PLAY',
      loginGoogle: 'Sign in with Google',
      connectingGoogle: 'Connecting with Google...',
      signOut: 'Sign out',
      cloudActive: 'Cloud active',
      pressHookToFish: 'Press the hook button to fish · Esc: Pause',
      captures: 'Catches',
      coins: 'Coins',
      backpack: 'Backpack',
      map: 'Map',
      index: 'Index',
      market: 'Market',
      menu: 'Menu',
      pause: 'Pause',
      mute: 'Mute sound',
      unmute: 'Unmute sound',
      castHook: 'Cast Hook',
      castWithWand: 'Fish with Wand',
      casting: 'Casting...',
      waiting: 'Waiting...',
      canalizing: 'Channeling...',
      bitingRiver: 'A fish is biting!',
      bitingMystery: '? Something mysterious bites!',
      bitingAbyss: 'Abyssal Call! Reel in!',
      pullNow: 'Reel In Now!',
      attractMagic: 'Attract with Magic!',
      escaped: 'Got Away',
      caught: 'Caught!',
      pausedTitle: 'Game Paused',
      continue: 'Resume',
      deleteProgress: 'Delete Progress',
      warning: 'Warning',
      deleteConfirmWarning: 'Are you sure you want to delete all your progress? You will lose your coins, catches, playtime, fishing index, cosmetics, and backpack.',
      yesContinue: 'Yes, continue',
      cancel: 'Cancel',
      warningOfWarning: 'Warning of Warning!',
      deleteWarningText: 'This action will completely erase your save and cannot be undone. To prove you are 100% sure, you must beat the Legendary fishing minigame (you can repeat it infinitely until you win).',
      startLegendaryMinigame: 'Start Legendary Minigame',
      cancelAndKeep: 'Cancel & Keep Progress',
      legendaryEscaped: 'Legendary fish got away!',
      legendaryRetryText: 'Your progress is safe for now. You can repeat the Legendary minigame infinitely until you beat it.',
      repeatLegendaryMinigame: 'Repeat Legendary Minigame',
      cancelDeletion: 'Cancel Deletion',
      riverNormal: 'Normal River',
      underworld: 'Underworld',
      here: 'Here',
      travel: 'Travel',
      rotateDevice: 'Rotate your device to landscape',
      rotateDeviceDesc: 'Infinite Catch is designed for landscape mode on mobile and tablets.',
      adminConsole: 'Admin Terminal',
      luckBoost: 'Luck',
      luckChestTitle: 'Luck Chest',
      luckChestDesc: 'Open this chest to get 🍀 Luck x2 for 1:30 minutes.',
      openChest: 'Open Chest (Luck x2 · 1:30)',
      reviveTitle: 'Fish got away!',
      reviveDesc: 'Do you want to revive and try again?',
      reviveForCoins: 'Revive for',
      giveUp: 'Give up',
      tutorialStep1: 'Step 1: Cast your rod into the river',
      tutorialStep2: 'Step 2: Catch your first fish!',
      tutorialStep3: 'Step 3: Explore the Index',
      tutorialStep4: 'Step 4: Visit the Market',
      tutorialStep5: 'Step 5: Check the Menu',
      tutorialDesc1: 'Press the hook button «Cast Hook» below to throw your line into the river.',
      tutorialDesc2: 'Now! Press the hook button «Reel In Now!» and beat the minigame.',
      tutorialDesc3: 'Click the glowing "Index" button top-right to view all species and rewards.',
      tutorialDesc4: 'Click the glowing "Market" button at the top to walk over and discover each stall.',
      tutorialDesc5: 'Click the glowing "Menu" button at the top to discover the Locker, Leaderboard, and Friends.',
      openIndexPrompt: 'Open Index!',
      openMarketPrompt: 'Go to Market!',
      openMenuPrompt: 'Open Menu!',
      tapToCastPrompt: 'Tap the hook to cast!',
      tapToReelPrompt: 'Tap the hook now!',
      tapToCastAgainPrompt: 'Tap the hook to cast again!',
      rarities: {
        'Común': 'Common',
        'Rara': 'Rare',
        'Épica': 'Epic',
        'Mítica': 'Mythic',
        'Legendaria': 'Legendary',
        'Secreto': 'Secret',
        'Secreto Abisal': 'Abyssal Secret',
      },
      rarityFilters: {
        'Común': 'Common',
        'Rara': 'Rare',
        'Épica': 'Epic',
        'Mítica': 'Mythic',
        'Legendaria': 'Legendary',
        'Secreto': 'Secret',
        'Secreto Abisal': 'Abyssal Secret',
      },
      rarityDescriptions: {
        'Común': 'Very common whenever you cast your line.',
        'Rara': 'Appears less frequently than common catches.',
        'Épica': 'A tough catch that takes patience.',
        'Mítica': 'Very hard to reel in on any cast.',
        'Legendaria': 'Extremely scarce; few anglers ever see one.',
        'Secreto': 'A hidden and ultra-rare encounter.',
        'Secreto Abisal': 'Lowest odds: the hardest catch in the entire game.',
      },
      fishNames: SHARED_FISH_NAMES,
    },
  },
  es: {
    ui: {
      play: 'JUGAR',
      loginGoogle: 'Iniciar sesión con Google',
      connectingGoogle: 'Conectando con Google...',
      signOut: 'Cerrar sesión',
      cloudActive: 'Nube activa',
      pressHookToFish: 'Pulsa el botón del anzuelo para pescar · Esc: Pausa',
      captures: 'Capturas',
      coins: 'Monedas',
      backpack: 'Mochila',
      map: 'Mapa',
      index: 'Índice',
      market: 'Mercado',
      menu: 'Menú',
      pause: 'Pausa',
      mute: 'Silenciar sonido',
      unmute: 'Activar sonido',
      castHook: 'Lanzar Anzuelo',
      castWithWand: 'Pescar con Varita',
      casting: 'Lanzando...',
      waiting: 'Esperando...',
      canalizing: 'Canalizando...',
      bitingRiver: '¡Pica un pez en el río!',
      bitingMystery: '? ¡Pica algo misterioso!',
      bitingAbyss: '¡Llama Abisal! ¡Recoge!',
      pullNow: '¡Recoger Ahora!',
      attractMagic: '¡Atraer con Magia!',
      escaped: 'Se Escapó',
      caught: '¡Atrapado!',
      pausedTitle: 'Juego en Pausa',
      continue: 'Continuar',
      deleteProgress: 'Eliminar progreso',
      warning: 'Advertencia',
      deleteConfirmWarning: '¿Seguro que quieres eliminar todo tu progreso? Perderás tus monedas, capturas, tiempo jugado, índice de pesca, cosméticos y mochila.',
      yesContinue: 'Sí, continuar',
      cancel: 'Cancelar',
      warningOfWarning: '¡Advertencia de la advertencia!',
      deleteWarningText: 'Esta acción borrará tu partida por completo y no se puede deshacer. Para demostrar que estás 100% seguro, tendrás que superar el minijuego de pesca Legendaria (puedes repetirlo infinitas veces; cuando lo consigas, se eliminará todo).',
      startLegendaryMinigame: 'Iniciar minijuego Legendario',
      cancelAndKeep: 'Cancelar y conservar progreso',
      legendaryEscaped: '¡Se escapó el pez Legendario!',
      legendaryRetryText: 'Tu progreso todavía no se ha borrado. Puedes repetir el minijuego Legendario infinitas veces hasta superarlo.',
      repeatLegendaryMinigame: 'Repetir minijuego Legendario',
      cancelDeletion: 'Cancelar eliminación',
      riverNormal: 'Río Normal',
      underworld: 'Inframundo',
      here: 'Aquí',
      travel: 'Viajar',
      rotateDevice: 'Gira tu dispositivo en horizontal',
      rotateDeviceDesc: 'Infinite Catch está diseñado para jugarse en modo horizontal en móvil y tablet.',
      adminConsole: 'Terminal de Admin',
      luckBoost: 'Suerte',
      luckChestTitle: 'Cofre de Suerte',
      luckChestDesc: 'Abre este cofre para obtener 🍀 Suerte x2 durante 1:30 minutos.',
      openChest: 'Abrir Cofre (Suerte x2 · 1:30)',
      reviveTitle: '¡Se escapó el pez!',
      reviveDesc: '¿Quieres revivir e intentarlo de nuevo?',
      reviveForCoins: 'Revivir por',
      giveUp: 'Rendirse',
      tutorialStep1: 'Paso 1: Lanza tu caña al río',
      tutorialStep2: 'Paso 2: ¡Atrapa tu primer pez!',
      tutorialStep3: 'Paso 3: Explora el Índice',
      tutorialStep4: 'Paso 4: Visita el Mercado',
      tutorialStep5: 'Paso 5: Conoce el Menú',
      tutorialDesc1: 'Pulsa el botón del anzuelo «Lanzar Anzuelo» abajo para tirar la caña al río.',
      tutorialDesc2: '¡Ahora! Pulsa el botón del anzuelo «¡Recoger Ahora!» y supera el minijuego.',
      tutorialDesc3: 'Pulsa el botón brillante "Índice" arriba a la derecha para ver todas las especies y recompensas.',
      tutorialDesc4: 'Pulsa el botón brillante "Mercado" arriba para ir andando y conocer cada tienda.',
      tutorialDesc5: 'Pulsa el botón brillante "Menú" arriba para descubrir el Vestidor, Clasificación y Amigos.',
      openIndexPrompt: '¡Abre el Índice!',
      openMarketPrompt: '¡Ve al Mercado!',
      openMenuPrompt: '¡Abre el Menú!',
      tapToCastPrompt: '¡Pulsa el anzuelo para lanzar!',
      tapToReelPrompt: '¡Pulsa el anzuelo ahora!',
      tapToCastAgainPrompt: '¡Pulsa el anzuelo para volver a lanzar!',
      rarities: {
        'Común': 'Común',
        'Rara': 'Rara',
        'Épica': 'Épica',
        'Mítica': 'Mítica',
        'Legendaria': 'Legendaria',
        'Secreto': 'Secreto',
        'Secreto Abisal': 'Secreto Abisal',
      },
      rarityFilters: {
        'Común': 'Comunes',
        'Rara': 'Raros',
        'Épica': 'Épicos',
        'Mítica': 'Míticos',
        'Legendaria': 'Legendarios',
        'Secreto': 'Secretos',
        'Secreto Abisal': 'Secretos Abisales',
      },
      rarityDescriptions: {
        'Común': 'Muy habitual al lanzar la caña.',
        'Rara': 'Sale con menos frecuencia que las comunes.',
        'Épica': 'Captura difícil que requiere paciencia.',
        'Mítica': 'Muy difícil de pescar en cualquier tirada.',
        'Legendaria': 'Extremadamente escasa, pocos pescadores la ven.',
        'Secreto': 'Aparición oculta y rarísima.',
        'Secreto Abisal': 'Probabilidad mínima: la captura más difícil del juego.',
      },
      fishNames: SHARED_FISH_NAMES,
    },
  },
};

export type TranslationKey = Exclude<
  keyof Translations,
  'rarities' | 'rarityFilters' | 'rarityDescriptions' | 'fishNames'
>;

export function getFishName(fishId: number, lang: Language): string {
  const item = DICTIONARIES[lang].ui.fishNames[fishId];
  if (item && item[lang]) return item[lang];
  const itemEn = DICTIONARIES.en.ui.fishNames[fishId];
  if (itemEn && itemEn[lang]) return itemEn[lang];
  return itemEn?.en ?? `Fish #${fishId}`;
}

export function getRarityName(rarity: string, lang: Language): string {
  return DICTIONARIES[lang].ui.rarities[rarity] ?? rarity;
}

export function getRarityFilterLabel(rarity: string, lang: Language): string {
  return DICTIONARIES[lang].ui.rarityFilters[rarity] ?? getRarityName(rarity, lang);
}

export function getRarityDescription(rarity: string, lang: Language): string {
  return DICTIONARIES[lang].ui.rarityDescriptions[rarity] ?? '';
}

export function getCosmeticName(cosmeticId: string, lang: Language, fallbackName?: string): string {
  return COSMETICS_I18N[cosmeticId]?.[lang]?.name ?? fallbackName ?? cosmeticId;
}

export function getCosmeticDescription(cosmeticId: string, lang: Language, fallbackDescription?: string): string {
  return COSMETICS_I18N[cosmeticId]?.[lang]?.description ?? fallbackDescription ?? '';
}

export function formatNumber(value: number, lang: Language): string {
  return value.toLocaleString(lang === 'en' ? 'en-US' : 'es-ES');
}

export function formatOddsOneIn(oneIn: number, lang: Language): string {
  const num = formatNumber(oneIn, lang);
  return lang === 'en' ? `1 in ${num}` : `1 entre ${num}`;
}

export function t(key: TranslationKey, lang: Language): string {
  const ui = DICTIONARIES[lang].ui as unknown as Record<string, string>;
  const uiEn = DICTIONARIES.en.ui as unknown as Record<string, string>;
  return ui[key] ?? uiEn[key] ?? String(key);
}
