# F1 拍摄工作台：实现与部署记录

日期：2026-10-24。F1 首轮集成；完整 Cesium 三维嵌入验收仍未完成。

## 已实现

- `/scout?location=niubei` 为统一工作台；地点详情的创建入口进入工作台。
- 同一项目保存机位、主体、镜头、日期/分钟、题材、地图投影和视角。继续使用带账户所有权校验的 `/api/plans`，不建立第二套计划数据。
- `shooting_plans.workspace` 是可选 JSON 扩展，迁移 `0008`。旧计划可加载；旧版编辑器不传 workspace 时保留已有地图状态，显式 null 才清除。分析结果不当作永远有效的数据保存。
- GeoLibre 同源部署、v2 postMessage 精确检查 origin + iframe source + 版本。仅发送项目加载、视角、读取视角、添加标记这几类命令。私有机位和主体通过消息传递，不放进公共项目文件或第三方 URL。
- 用地图中心十字确定机位/主体。选点会清除原点的 GPS/高程/误差来源，保留“待核验”。地图朝向只有显式应用后才修改镜头；俯视地图的 pitch 不冒充摄影仰角。
- 镜头与时间同步到地形预演、太阳轨迹、黄金/蓝色时刻、月亮位置与对齐窗口。改动分析输入后隐藏旧遮挡结论。
- NASA 概览注册为 `map.nasa.blue-marble`，仅支持 `map.overview.v1`；不得用于 `terrain.analyze.v1`。无 DEM 的预览仅为平面光位示意，移除程序山脉。

## 可复现部署

项目要求 Node 22。GeoLibre 构建不是 npm 安装自动下载项，也不提交 193 MB 生成文件。

1. 从 https://github.com/opengeos/GeoLibre 获取源码，检出 `0dc5abc3026bbbfbb8e866bb09822c109cc285ab`（2.5.0）。遵循该版本 README 安装其依赖并运行 `npm run build:embed`。输出应为 `apps/geolibre-desktop/dist-embed`，相对资源路径、无 Service Worker。
2. 在 QuasarFrame 执行 `npm run maps:install -- /absolute/path/to/GeoLibre`。脚本验证源码 commit、工作区干净及嵌入入口，将构建复制到被忽略的 `public/geolibre`，保留 MIT LICENSE，写入来源 commit、入口 SHA256 和安装时间。入口哈希是部署清单，不是对任意来源预编译产物的供应链认证；正式发布应在受控 CI 从锁定源码重建。
3. `npm run db:backup` 后执行 `npm run db:migrate`。本轮本机已完成，快照在 `data/backups/`。
4. `npm test`、`npm run typecheck`、`npm run lint`、`npm run build`，随后启动服务。正式部署必须包含生成后的 `public/geolibre`。
5. 验证 `/geolibre/quasar-build.json`、`/maps/nasa-globe.geolibre.json`、`/api/resources` 和工作台。

## 地图来源与网络边界

- NASA 官方 WMTS 能力目录： https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml
- 影像：`BlueMarble_ShadedRelief_Bathymetry`，时相 **2004-08**，GoogleMapsCompatible_Level8，JPEG 256px，0–8 级。静态概览，不是实时影像或高程模型。地图可以放大到 18 级以选坐标，底图不会增加细节。
- 元数据：https://gibs.earthdata.nasa.gov/layer-metadata/v1.0/BlueMarble_ShadedRelief_Bathymetry.json
- GeoLibre 运行时仅允许当前 origin；分享端点关闭。不启用旧的 `?embed=1` 脚本桥。
- 嵌入路径 CSP 只允许同源和 NASA 连接/影像，禁用子框架、表单提交、外部脚本；浏览器权限拒绝相机/麦克风/定位。2.5.0 预构建 Cesium 模块在初始化时使用动态求值，因此此路径的 script-src 含 `unsafe-eval`；这不是任意脚本消息接口。后续应从源码裁剪未用模块并移除此例外。
- 浏览器直接获取 NASA 瓦片，NASA 可见网络地址与所请求瓦片范围；不能宣传为“完全不外传位置范围”。尚未提供自托管瓦片缓存。
- 机位等在本平台账户保存；地图运行于同源信任边界，固定的 GeoLibre 构建属于受信任应用代码，不应加载任意第三方插件或模型。

## 当前范围和下一步

本轮采用 GeoLibre 2.5.0 的 MapLibre 球面投影与 2D 平面。该版本 Cesium 在副视图中依赖 Ion token，v2 嵌入桥不能切换/完整控制它；因此不宣称已完成“Cesium 三维地球与 2D 双向同步”的 F1 全部门槛。不要设置假的 token 绕过此限制。下一轮从受控源码构建升级/裁剪 GeoLibre，提供无需 Ion 的 NASA 影像球与 DEM/3D 场景适配，再验收完整 3D 姿态同步。

其他待办：工作台与照片证据/山脊校准目前保留高级入口，未把旧校准编辑器改造成完全共享草稿；暂无银河中心、气象、光污染能力。AI 生成、KG 推荐写回、实时频道和交易订阅是 F2–F4，不应作为本轮已实现项。原始素材外传仍须逐次用户同意。

## 开发验证

- 自动测试：36 项通过，含 workspace 约束、账户隔离、保存/恢复和旧编辑器兼容、消息 origin/source/version 检查、NASA 影像能力不可用于 DEM 分析。
- 静态检查：类型检查通过；Lint 无错误，保留 38 项既有警告。
- 构建曾因 Google Fonts 下载与字体响应解析失败，已移除构建时在线字体依赖，改用系统无衬线/宋体/等宽字体栈。
- 最终生产构建通过，预览服务为 `http://127.0.0.1:3001/scout`。
- 桌面实机：NASA 影像实际显示；球面与 2D 切换分别确认了 GeoLibre 实际投影状态；中心选点写入主体；项目保存后刷新，再打开可恢复星空题材、85mm 镜头、18:01 时间、主体与地图状态。保留一份 `F1验收 · 牛背山示意项目` 供复测。
- 真实 DEM 分析可运行；牛背山目录点与高程不符时阻止可靠视线结论。时间改变一分钟后旧分析隐藏并要求重算。
- 手机宽度 390px 的布局验证无横向溢出（documentWidth 382px），日月轨迹可读，底栏未遮挡固定侧栏。此为浏览器视口验证，不等于手机硬件性能验收。
- 截图：`screenshots/f1-workspace.jpg`、`screenshots/f1-mobile.jpg`。
- 修复了 GeoLibre 首次初始化时地图默认投影覆盖项目投影的时序问题：初始 URL 指向固定公开底图项目，控制器就绪后再加载并同步；隐藏嵌入页独立投影开关，保持工作台选择为唯一入口。
- GeoLibre 全量构建仍较重，且可见部分未使用的依赖初始化告警。后续源码裁剪、启动性能与移动硬件验收仍需完成。
