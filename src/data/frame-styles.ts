import type { FrameStyle, SlideshowConfig } from '@/types/frame';

export const frameStyles: FrameStyle[] = [
  {
    id: 'minimalist-wood',
    name: '极简原木',
    nameEn: 'Minimalist Wood',
    description: '北欧风格，浅色橡木框体，纤细边框',
    descriptionEn: 'Nordic style, light oak frame with slim bezel',
    frameColor: '#c4a882',
    matColor: '#f5f0eb',
    bezelWidth: 0.02,
    price: 1299,
    sizes: ['15寸', '21寸', '27寸', '32寸'],
    previewImage: '/images/frames/wood.jpg',
  },
  {
    id: 'modern-black',
    name: '现代黑',
    nameEn: 'Modern Black',
    description: '哑光黑铝合金框体，无边框设计，科技感十足',
    descriptionEn: 'Matte black aluminum alloy, bezel-less design with tech aesthetic',
    frameColor: '#1a1a1a',
    matColor: '#000000',
    bezelWidth: 0.005,
    price: 1599,
    sizes: ['15寸', '21寸', '27寸', '32寸'],
    previewImage: '/images/frames/black.jpg',
  },
  {
    id: 'gallery-white',
    name: '画廊白',
    nameEn: 'Gallery White',
    description: '厚白色卡纸衬垫 + 黑色内框，博物馆级装裱效果',
    descriptionEn: 'Thick white mat + black inner frame, museum-grade presentation',
    frameColor: '#ffffff',
    matColor: '#f8f8f8',
    bezelWidth: 0.04,
    price: 1899,
    sizes: ['15寸', '21寸', '27寸', '32寸'],
    previewImage: '/images/frames/white.jpg',
  },
];

export const defaultSlideshowConfig: SlideshowConfig = {
  interval: 5000,
  transitionDuration: 1500,
  kenBurnsZoom: 1.08,
  kenBurnsPanSpeed: 5,
};
