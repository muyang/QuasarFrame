# P2：牛背山真实地形试点

当前版本用 [Copernicus DEM GLO-30 Public COG](https://registry.opendata.aws/copernicus-dem/) 的四块固定源瓦片，覆盖 101.72–102.72°E、29.44–30.32°N。公开版为约 1 角秒地表模型（DSM），包含植被/建筑物；平面基准 EPSG:4326，高程基准 EGM2008（EPSG:3855）。[Copernicus 产品说明](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)列出产品和许可。页面与元数据保留来源及署名。当前公开 COG 不附带填补和高度误差掩膜，元数据明确记为不可用，不能把所有有效栅格解释为同精度。

## 离线构建与运行

需要 Python 3、NumPy、Rasterio；Node 22 项目依赖按 README 安装。执行：

```sh
python3 scripts/terrain/build_niubei.py --download
npm run dev
```

构建脚本校验每块下载瓦片的 SHA-256，裁剪并合并为约 11.4 百万像元的单精度高程与有效性掩膜，产出 `terrain-data/niubei/{elevation.f32,valid.u8,metadata.json}`。所有原始瓦片和衍生数据均被 Git 忽略，不随代码部署。服务端读取时再次校验文件长度与 SHA-256；缺数据时返回 404，页面退回明确标注的程序示意地形。生产实例应在部署时提供同版本产物，或设置 `TERRAIN_DATA_DIR` 指向包含 `niubei/` 的目录。

`GET /api/terrain/niubei/sample?longitude=…&latitude=…` 返回来源版本、水平/高程基准及高程。`GET /api/terrain/niubei/grid` 返回绘图网格；`POST /api/terrain/niubei/analysis` 按指定机位、时间和方向输出地形剖面、2 公里外山脊、日月遮挡和可选主体视线。算法为球面视线近似，未模拟大气折射、近景地物和现场变化；结果始终标注“理论”。高程基准不一致、视线穿越无数据栅格时不输出无遮挡结论。

地点目录中的牛背山坐标是示意点：该点的 DEM 地表高程约 2248 米，与目录标注 3660 米相差约 1412 米。服务端因此对目录坐标停止遮挡分析；用户输入自己测得的 WGS84 机位后才会计算理论剖面。这也意味着当前版本尚不能宣称“牛背山实景构图已验证”。真实采样网格与 Three.js 预览使用同一个 `dataVersion`，其他地点仍显示程序地形。

## 现场核验门槛

用户暂未提供真实机位和照片。准备 5–10 个角度不同、机位已定位的视角；每个视角保存 GPS/测量坐标、拍摄照片引用、经校准的机身方向与观察到的 2 公里外山脊仰角。高程如单独输入，先换算到 EGM2008，或由 DEM 采样。记录为 JSON 数组，每条结构如下（示例数值仅演示格式，不能算现场证据）：

```json
[
  {
    "id": "view-001",
    "coordinates": [102.3, 29.88],
    "coordinateMethod": "gps",
    "azimuthDeg": 90,
    "cameraHeightM": 1.6,
    "observedRidgeAngleDeg": 4.2,
    "ridgeDistanceM": 10000,
    "photoReference": "field-photos/view-001.jpg",
    "angleMethod": "经标定的相机姿态和地平线像素拟合"
  }
]
```

运行 `npm run terrain:validate -- path/to/field-views.json`。脚本输出每个角度的预测值、观测值、绝对误差和中位绝对误差；只有 5–10 条全部有覆盖且中位绝对误差 ≤1° 才显示 `passed`。将核验输入、报告、照片关联、DEM 版本一起归档，若不达标继续标低可信度，并检查坐标、姿态、远近山脊识别、DSM 与实际地表差异。现场证据缺失时门槛仍为待验，不以合成测试代替。

## 后续限制

地形网格能支持山脊和远景构图粗估，不能直接推断天气、云海、植被季节变化和实时相机画面。近景树木、护栏、建筑物及 30 米级分辨率以下的地形变化需要现场照片校准。P3 应加入照片对齐与校准工作流；P4 的 AI 概念图必须沿用此地形/姿态版本和显著的模拟标识。
