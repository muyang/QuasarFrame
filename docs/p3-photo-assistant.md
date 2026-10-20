# P3A：照片证据、山脊校准与摄影助手

本阶段把照片接入“读证据 → 人工确认 → 地形对照 → 建立拍摄计划”的流程。设计参考 [Geo-Sleuth](https://github.com/Oldcircle/geo-sleuth) 的逐项证据与候选排序思路；没有复制其代码，也没有把它的 Agent Skill 当成 Web API。该项目采用 [MIT 许可](https://github.com/Oldcircle/geo-sleuth/blob/main/LICENSE)，其完整工作流还依赖 OSM、参考影像、OCR、模型和人工判断，不能仅凭一张无信息照片承诺精确定位。

## Geo-Sleuth 思路在本项目中的位置

| 参考思路 | 本项目实现 | 边界 |
| --- | --- | --- |
| 分离可核验的照片证据 | `src/server/photo-evidence.ts` 解析原图；`src/lib/photo-evidence.ts` 规范化 EXIF 并记录坐标、朝向、时间和参数来源；`src/app/api/photos/analyze/route.ts` 返回分析结果 | 目前只读取元数据，不从画面自动识别地物或坐标 |
| 人工确认后再使用证据 | `src/app/upload/page.tsx` 显示证据并由用户点选填入；`src/app/api/photos/route.ts` 保存来源；`src/lib/photo-privacy.ts` 控制精确机位披露 | 来源记录不是真实性认证 |
| 限定区域的候选比对 | `src/lib/skyline-match.ts` 将人工标出的远山脊与真实 DEM 比较；`src/app/api/terrain/[locationId]/skyline-match/route.ts` 返回候选、误差和低可信度标记 | 必须输入大致区域和朝向；没有全球自动地理定位 |
| 地形校准与拍摄计划 | `src/lib/photo-calibration.ts` 估算仰角；`src/components/camera/PhotoRidgeCalibration.tsx` 展示人工标点和结果；`src/components/camera/ShootingPlanner.tsx` 接入计划 | 缺少现场已知机位照片的精度验证 |

Geo-Sleuth 的 OCR、OSM 地物约束、参考影像检索及多模态模型推理尚未接入；仓库中没有它的代码副本、服务调用或模型权重。

## 已实现

- 上传页在文件保存前调用 `POST /api/photos/analyze`，服务端检查图片内容并读取 EXIF GPS、真北朝向、相机/镜头、实际焦距、曝光与相机本地时间。结果先展示，用户点击后才填入空白表单项；无 GPS 时不生成假坐标。相机时间不再强行转成 UTC。
- 上传保存时重新读取源文件 EXIF，分别记录坐标、方向、时间和参数是 EXIF、作者修改还是未知。发布图片和缩略图均去除 EXIF；原图存受控目录。`photos.share_coordinates` 默认为关闭；免费作品或付费解锁都不会自动公开精确机位。作者修改坐标后，分享开关重新关闭。
- 作品详情显示来源、传感器与焦距推导的视角，以及有条件的曝光/机位建议。点击“用此照片制定计划”时只在当前浏览器标签页暂存可见参数与照片 ID，拍摄计划加载后清除；授权图片由原有访问控制接口读取，不把精确坐标放进 URL。
- 牛背山拍摄计划可选本地照片，在画面中央标记远山脊，以同版本 DEM 估算镜头仰角。照片不会通过该校准步骤上传。目录示意坐标与高程不一致、无数据和宽高比不匹配时停止给出建议。
- 无 GPS 的照片可在牛背山试点输入**大致搜索区域中心**及已有方位，人工标记 5–12 个横跨画面的远山脊点；系统在半径 100–2000 米的限定区域内比较 DEM 天际线，给出最多 5 个候选及拟合误差、网格下限误差。结果始终为**低可信度候选**，不写入实测机位，也不代表全球自动定位。

## 本地验证

运行 `npm test`、`npm run typecheck`、`npm run lint` 和 `npm run build`。数据库变更在 `drizzle/0005_complete_komodo.sql`；按 README 的备份与迁移程序执行。旧照片默认不分享精确坐标，来源显示“未知”。本地开发库迁移前的备份在忽略目录 `data/backups/photo-analysis-pre-migration-2026-10-20.db`。

## 尚需现场资料与下一步

用户尚未提供真实机位与对照照片，因此照片视觉候选没有现场精度结论。下一轮需要至少 5–10 张具有已知 WGS84 机位、已核对真北方向、焦距/传感器信息和可见 2 公里外山脊的原始照片；同时包含有 GPS 与去 EXIF 两组。记录真值、照片标点、DEM 版本、候选排名、机位误差、朝向误差与山脊拟合误差，评估不同天气、云雾、植被、裁剪和横滚。未通过实测前，候选只辅助人工检索。

后续可把 Geo-Sleuth 式 OCR、OSM 几何、影像检索和街景复核做成**用户主动触发的独立任务服务**，为每个候选保存证据、数据许可、版本、误差半径与失败原因；外部影像、额度、费用和二次使用许可须逐源核对。天气与路网仍需可替换数据源及有效时间字段，缺数据时保持“未知”。
