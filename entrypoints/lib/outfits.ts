import type { PricyOutfit } from './outfits.types';

export const OUTFIT_IMAGE_BASE =
  'https://static.tibia.com/images/charactertrade/outfits/';

/** Feru hat – male (130) and female (141), addons 2 and 3. */
export const FERU_HAT_OUTFIT: PricyOutfit = {
  id: 'feru-hat',
  label: 'Feru hat',
  toggleIconUrl:
    'https://static.tibia.com/images/charactertrade/objects/5903.gif',
  imageFiles: [
    '130_2.gif',
    '130_3.gif',
    '141_2.gif',
    '141_3.gif',
  ],
};

export const PRICY_OUTFITS: PricyOutfit[] = [FERU_HAT_OUTFIT];

export const getOutfitImageUrl = (fileName: string): string =>
  `${OUTFIT_IMAGE_BASE}${fileName}`;

export const getOutfitById = (id: string): PricyOutfit | undefined =>
  PRICY_OUTFITS.find((outfit) => outfit.id === id);
