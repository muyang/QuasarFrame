# 发现页地点配图审计（F0）

日期：2026-10-23。此前 `src/data/locations.ts` 的 10 个地点均使用通用 Unsplash 图片，部分图片跨地点复用。这些链接已经从地点目录和自动线路封面中移除。现在每个地点只展示一张在 Wikimedia Commons 文件页核对过地点说明、作者和单张许可的照片；数据见 `src/data/location-media.ts`。图片文件页是可复查证据，不等于现场机位测量或当前景象。

| 目录地点 | 本次实拍所示子地点/对象 | 文件页与许可 | 仍未核验 |
| --- | --- | --- | --- |
| 牛背山 | 牛背山日出 | [jaysonh，CC BY 3.0](https://commons.wikimedia.org/wiki/File:%E7%89%9B%E8%83%8C%E5%B1%B1%E6%97%A5%E5%87%BA_Sunrise,_SiChuan_Province_15-04-12_06-50_-_panoramio.jpg) | 目录中心点、当前可达机位 |
| 茶卡盐湖 | 乌兰县茶卡盐湖风光 | [Liuxingy，CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:%E8%8C%B6%E5%8D%A1%E7%9B%90%E6%B9%96%E9%A3%8E%E5%85%89_01.jpg) | 照片机位和目录中心点 |
| 霞浦 | 北岐滩涂日出 | [Jay Huang，CC BY 2.0](https://commons.wikimedia.org/wiki/File:Xiapu_Sunrise_-_Flickr_-_Jaykhuang.jpg) | 目录中心点与北岐机位的关联精度 |
| 贡嘎雪山 | 子梅垭口远眺贡嘎 | [FrozenNeptune，CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:%E8%B4%A1%E5%98%8E%E5%B1%B1.jpg) | 目录海拔、具体机位与主体坐标 |
| 额济纳胡杨林 | 额济纳胡杨林 | [Nyx Ning，CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:%E5%86%85%E8%92%99%E5%8F%A4_%E9%A2%9D%E6%B5%8E%E7%BA%B3_%E9%87%91%E8%89%B2%E8%83%A1%E6%9D%A8%E6%9E%97_-_panoramio.jpg) | 林区具体范围与机位 |
| 张家界 | 国家森林公园砂岩峰林 | [Lianguanlun，CC BY 4.0](https://commons.wikimedia.org/wiki/File:Sandstone_spire_forest_Zhangjiajie_Hunan.jpg) | 目录中心点与具体视线 |
| 纳木错 | 纳木错自然保护区湖景 | [金辰，CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Namcso_Lake_in_Tibet.jpg) | 精确拍摄点、当前交通与气象 |
| 元阳梯田 | 元阳哈尼梯田日出 | [Chiu Ho-yang，CC BY-SA 2.0](https://commons.wikimedia.org/wiki/File:Yuanyang_Hani_Rice_Terraces_at_Sunrise.jpg) | 具体观景台、季节水位 |
| 太行山大峡谷 | 林州太行天路 | [Ngguls，CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:%E6%9E%97%E5%B7%9E%E5%A4%AA%E8%A1%8C%E5%A4%A9%E8%B7%AF%E6%99%AF%E5%8C%BA%E9%A3%8E%E5%85%89_2020-10-16_0.jpg) | 峡谷范围和其他子景点 |
| 石板岩·中国画谷 | 石板岩镇朝阳村写生基地 | [SIMPLE，CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:%E6%9C%9D%E9%98%B3%E6%9D%91%E5%86%99%E7%94%9F%E5%9F%BA%E5%9C%B0_Chaoyang_Village_-_panoramio.jpg) | “中国画谷”是区域别称；具体拍摄点待核验 |

所有来源照片只用于目录展示，当前不得自动进入 AIGC 参考素材、付费作品或终端频道。页面展示摄影师及许可，地点详情提供原始文件、许可证和关联依据。2026-10-23 在本机浏览器的生产构建中，10 个地点的缩略图均成功加载；命令行网络接口曾出现超时，因此页面仍保留加载失败占位。正式部署还需在目标网络验证可达性，或在逐张遵守许可、署名与改编条件的前提下建立受控图片缓存。

现有绝对化景点描述与固定交通时间已改为条件说明，页面将坐标、海拔、季节和难度标为目录参考。下一轮内容治理仍需把这几类数据逐条核验并给出来源、精度和更新日期。牛背山目录点与真实 DEM 存在明显高程矛盾；本次只核对图片，不以这些照片的 EXIF 坐标静默替换目录点或宣称构图已经校准。
