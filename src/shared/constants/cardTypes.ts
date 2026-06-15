export interface CardTypeDef {
  key: string
  label: string
  widthMm: number
  heightMm: number
}

export const CARD_TYPES: CardTypeDef[] = [
  { key: 'tcg_en',  label: 'TCG English (Pokémon / Magic / Lorcana)',  widthMm: 63,   heightMm: 88   },
  { key: 'tcg_jp',  label: 'TCG Japanese (Pokémon JPN / Yu-Gi-Oh)',    widthMm: 59,   heightMm: 86   },
  { key: 'sports',  label: 'Sports Card (PSA standard 2.5"×3.5")',     widthMm: 63.5, heightMm: 88.9 },
  { key: 'op',      label: 'One Piece TCG',                            widthMm: 63,   heightMm: 88   },
  { key: 'other',   label: 'Other / Unknown',                          widthMm: 63,   heightMm: 88   },
]

export const DEFAULT_CARD_TYPE = CARD_TYPES[0]
