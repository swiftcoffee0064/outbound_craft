// UI strings live here; game item/station names live in data/data.json ({en, fr}).
// French falls back to English when a translation is missing.

export const STRINGS = {
  en: {
    app_title: 'Outbound Craft',
    crafts: 'Crafts',
    breakdown: 'Breakdown',
    shopping_list: 'Shopping list',
    search_placeholder: 'Search craftable items…',
    no_results: 'No matching craft.',
    empty_selection: 'No crafts selected — search above and tap an item to add it.',
    allocation_hint: 'Resources are allocated to crafts top to bottom; reorder with the arrows.',
    craftable: 'Craftable',
    missing: 'Missing:',
    made_at: 'Made at: {station}',
    unverified: 'estimated recipe',
    needed: 'needed',
    gathered: 'gathered',
    remaining: 'to gather',
    done: 'Done',
    all_gathered: 'Everything gathered!',
    reset_gathered: 'Reset gathered counts',
    reset_confirm: 'Clear all gathered counts?',
    qty: 'Quantity',
    remove: 'Remove',
    move_up: 'Move up',
    move_down: 'Move down',
    expand: 'Expand',
    collapse: 'Collapse',
    increment: 'Add one',
    decrement: 'Remove one',
    data_version: 'data v{n}',
    switch_lang: 'Passer en français',
    load_error: 'Could not load game data. Check your connection and reload.',
  },
  fr: {
    app_title: 'Outbound Craft',
    crafts: 'Fabrications',
    breakdown: 'Détail des recettes',
    shopping_list: 'Liste de courses',
    search_placeholder: 'Rechercher un objet fabricable…',
    no_results: 'Aucune fabrication trouvée.',
    empty_selection: "Aucune fabrication sélectionnée — cherchez ci-dessus puis touchez un objet pour l'ajouter.",
    allocation_hint: 'Les ressources sont attribuées aux fabrications de haut en bas ; réordonnez avec les flèches.',
    craftable: 'Fabricable',
    missing: 'Manque :',
    made_at: 'Fabriqué : {station}',
    unverified: 'recette estimée',
    needed: 'requis',
    gathered: 'récolté',
    remaining: 'à récolter',
    done: 'Complet',
    all_gathered: 'Tout est récolté !',
    reset_gathered: 'Réinitialiser la récolte',
    reset_confirm: 'Effacer toutes les quantités récoltées ?',
    qty: 'Quantité',
    remove: 'Retirer',
    move_up: 'Monter',
    move_down: 'Descendre',
    expand: 'Déplier',
    collapse: 'Replier',
    increment: 'Ajouter un',
    decrement: 'Enlever un',
    data_version: 'données v{n}',
    switch_lang: 'Switch to English',
    load_error: 'Impossible de charger les données du jeu. Vérifiez la connexion puis rechargez.',
  },
};

export function t(lang, key, params = {}) {
  let str = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(params)) str = str.replace(`{${k}}`, v);
  return str;
}

export function localName(entry, lang) {
  return entry?.name?.[lang] ?? entry?.name?.en ?? entry?.id ?? '?';
}
