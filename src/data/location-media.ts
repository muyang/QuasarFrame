import type { LocationMedia } from '@/types/location';

type CommonsPhotoInput = Omit<LocationMedia, 'imageUrl' | 'sourceUrl' | 'reviewedAt' | 'aiReferenceAllowed'> & {
  fileName: string;
  fileHashPath: string;
};

function commonsPhoto(input: CommonsPhotoInput): LocationMedia {
  const encodedName = encodeURIComponent(input.fileName.replaceAll(' ', '_'));
  return {
    ...input,
    imageUrl: `https://thumb.wikimedia.org/wikipedia/commons/thumb/${input.fileHashPath}/${encodedName}/960px-${encodedName}`,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodedName}`,
    reviewedAt: '2026-10-23',
    // Display permission does not automatically grant use as an AI reference or a paid asset.
    aiReferenceAllowed: false,
  };
}

/** One individually checked, place-matched Commons file per current catalogue entry. */
export const locationMedia: Record<string, LocationMedia> = {
  niubei: commonsPhoto({
    fileName: '牛背山日出 Sunrise, SiChuan Province 15-04-12 06-50 - panoramio.jpg',
    fileHashPath: '2/20',
    caption: '牛背山日出（2012 年）',
    author: 'jaysonh',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    placeEvidence: '文件说明为牛背山日出，原文件页附拍摄点坐标 29.774519°N、102.372854°E；不作为已校准摄影机位。',
  }),
  chaka: commonsPhoto({
    fileName: '茶卡盐湖风光 01.jpg',
    fileHashPath: 'f/fa',
    caption: '青海茶卡盐湖风光（2023 年）',
    author: 'Liuxingy',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    placeEvidence: '作者文件说明明确指向海西州乌兰县茶卡盐湖。',
  }),
  xiapu: commonsPhoto({
    fileName: 'Xiapu Sunrise - Flickr - Jaykhuang.jpg',
    fileHashPath: 'd/d2',
    caption: '霞浦北岐滩涂日出（2016 年）',
    author: 'Jay Huang',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    placeEvidence: '文件说明为霞浦北岐，附拍摄点坐标 26.877368°N、120.059280°E。',
  }),
  gongga: commonsPhoto({
    fileName: '贡嘎山.jpg',
    fileHashPath: 'f/fe',
    caption: '子梅垭口远眺贡嘎山（2017 年）',
    author: 'FrozenNeptune',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    placeEvidence: '作者文件说明为子梅垭口远眺贡嘎山，附拍摄点坐标；此图不代表目录坐标。',
  }),
  ejina: commonsPhoto({
    fileName: '内蒙古 额济纳 金色胡杨林 - panoramio.jpg',
    fileHashPath: '4/46',
    caption: '额济纳胡杨林（2015 年）',
    author: 'Nyx Ning',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    placeEvidence: '文件说明为额济纳胡杨林，附拍摄点坐标 41.967045°N、101.086321°E。',
  }),
  zhangjiajie: commonsPhoto({
    fileName: 'Sandstone spire forest Zhangjiajie Hunan.jpg',
    fileHashPath: '6/6a',
    caption: '张家界国家森林公园砂岩峰林（2024 年）',
    author: 'Lianguanlun',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    placeEvidence: '作者说明和 EXIF 坐标均指向张家界国家森林公园。',
  }),
  namtso: commonsPhoto({
    fileName: 'Namcso Lake in Tibet.jpg',
    fileHashPath: '6/60',
    caption: '西藏纳木错自然保护区湖景（2016 年）',
    author: '金辰',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    placeEvidence: '作者文件说明为西藏纳木错自然保护区。',
  }),
  yuanyang: commonsPhoto({
    fileName: 'Yuanyang Hani Rice Terraces at Sunrise.jpg',
    fileHashPath: 'd/db',
    caption: '元阳哈尼梯田日出（2014 年）',
    author: 'Chiu Ho-yang',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    placeEvidence: '文件说明为元阳哈尼梯田，附拍摄点坐标 23.132362°N、102.736512°E。',
  }),
  'taihang-canyon': commonsPhoto({
    fileName: '林州太行天路景区风光 2020-10-16 0.jpg',
    fileHashPath: 'f/fa',
    caption: '林州太行天路景区（2020 年）',
    author: 'Ngguls',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    placeEvidence: '作者说明与 EXIF 坐标均指向林州太行天路；这是太行大峡谷区域内的子景点。',
  }),
  'china-painting-valley': commonsPhoto({
    fileName: '朝阳村写生基地 Chaoyang Village - panoramio.jpg',
    fileHashPath: '4/41',
    caption: '林州石板岩镇朝阳村写生基地（2009 年）',
    author: 'SIMPLE',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    placeEvidence: '文件说明及拍摄坐标指向石板岩镇朝阳村；“中国画谷”在此仅作石板岩地区别称。',
  }),
};
