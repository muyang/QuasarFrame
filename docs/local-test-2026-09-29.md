# 本地启动与测试记录

日期：2026-09-29。

## 运行环境

- 使用 Node 24.19.0，主进程和 PATH 中的 Node 保持一致。
- 使用 Next.js 16.2.10 的 webpack 模式，避免此前本工作区的 Turbopack 包解析故障。
- 地址：http://127.0.0.1:3000。
- 最终运行的是通过构建后的 `next start` 生产预览，服务保持运行。
- 启动参数设置 `AUTH_URL=http://127.0.0.1:3000`，覆盖原有旧端口配置，未修改 `.env.local`。
- 使用项目现有数据库；测试仅访问页面和只读 API，未运行迁移、seed、创建账户、下单或调用支付。

## 已验证

| 检查 | 结果 |
| --- | --- |
| 摄影计算回归 | 10/10 通过 |
| `/`、`/discover`、`/nearby` | HTTP 200 |
| `/location/niubei` | HTTP 200，服务端 HTML 包含拍摄计划和日月方向对齐工具 |
| `/feeds/live`、`/frame` | HTTP 200 |
| `/api/feeds` | HTTP 200，返回 8 条摄像头目录记录 |
| `/api/frame/skus` | HTTP 200，返回 4 条 SKU |
| `/api/frame/orders`（未登录） | HTTP 401，提示先登录 |
| TypeScript | 移除非法路由导出后通过 |
| 生产构建（webpack） | 完整通过，46 个静态页面生成成功 |
| 生产预览复查 | 上述页面及 `/discover?tab=routes` 均返回 200，无服务端 Next 错误标记 |
| 直播代理（未登录） | 对目录中的实际摄像头 ID 请求返回 401，未访问摄像头上游 |
| `/api/auth/session`（未登录） | 设置正确本地认证地址后 HTTP 200，返回 `null` |
| `git diff --check` | 通过 |

修复了 `src/app/api/frame/orders/route.ts` 未使用的 `_nowTs` 导出及其辅助函数。该导出不属于 Next.js Route Handler 支持的字段，曾阻断全量类型检查。未调整订单业务逻辑。

生产构建随后发现 `/discover` 的 `useSearchParams` 缺少 Suspense 边界。已将读取查询参数的内容组件置于边界内，补充加载提示，保留原有标签切换行为。

发现页 ESLint 无错误，保留 2 条既有 `<img>` 性能提示。

首次生产启动曾因原有认证地址指向 `localhost:3003` 而报 `UntrustedHost`。设置本次进程的正确 `AUTH_URL` 后，会话接口正常，订单接口仍正确拒绝未登录访问。

## 验证范围限制

浏览器工具的管理员安全策略验证不可用，阻断了页面导航。未绕过该限制；HTTP 200 不能证明浏览器交互正常。本次尚未验收滑块联动、WebGL 画面、浏览器计划保存/下载、实际直播播放或登录后的操作。

目录 API 可读取不等于摄像头上游流已验证。没有登录测试账户或直接调用上游摄像头。
