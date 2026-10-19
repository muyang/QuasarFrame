# P1 拍摄计划云端化（2026-10-20）

已增加 `places`、`vantage_points`、`subjects`、`shooting_plans` 四张表。地点目录只建立名称关联，状态固定为 `illustrative`；机位与主体各自保存坐标来源、水平误差、海拔、高程基准和现场核验时间。现阶段所有用户创建与旧计划导入的点位 `verified_at` 均为空，界面统一显示“未核验”。计划保存拍摄时间及时区、镜头姿态、结构版本和数据版本。

登录用户可通过 `GET/POST /api/plans`、`GET/PATCH/DELETE /api/plans/[id]` 读取和管理自己的计划，通过 `POST /api/plans/import` 导入浏览器内的 v1 计划。旧数据按内容指纹去重，原浏览器副本保留；不认识的目录地点会跳过。`GET /api/places` 返回已经建立的示意目录关联。所有接口在服务端鉴权，按所有者过滤；跨用户访问单条计划返回 404。

迁移文件为 `drizzle/0003_robust_boomer.sql` 和 `drizzle/0004_perpetual_lilandra.sql`。应用到现有数据库前，已备份至忽略目录 `data/backups/quasarframe-before-p1-2026-10-19.db`。回归验证包括单元/服务测试、生产构建、隔离数据库迁移以及 `scripts/smoke-cloud-plans.mjs` 的双账号、双会话 HTTP 检查。烟测脚本只应指向隔离数据库，不应连接生产服务。

下一阶段 P2 仍需首个真实机位和对照照片，才可采样 DEM 并量化视线/地平线误差。现有目录坐标和相机三维地形仍是示意，不能作为精确导航或遮挡结论。主体来源和精度可以保存，但尚未用于视线计算。部署时需配置规范的 `AUTH_URL` 或 `NEXTAUTH_URL`；认证配置在该地址存在时启用 Auth.js 主机信任。
