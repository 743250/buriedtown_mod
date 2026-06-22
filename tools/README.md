# Tools Layout

`tools` 目录只保留高价值的仓库级验证、预提交编排和资源处理，不承载游戏运行时业务。

## Directory Responsibilities

- `tools/lib`
  仓库级通用逻辑。这里放可复用的验证器、数据读取器和清单定义，例如内容校验器、资源读取器、服务契约 manifest。

- `tools/ui-preview`
  前端静态模拟平台。读取真实配置、文案和资源，生成可直接打开的 HTML，用于 Codex 修改 UI 后检查开始选择、角色/天赋弹窗、商店、成就墙、成就兑换、文案溢出和资源回退，不承载游戏运行时业务。

- `tools/precommit`
  提交前编排入口。这里只负责决定“跑哪些检查”，不在这里实现具体 smoke 或校验细节。

- `tools/smoke`
  轻量级冒烟测试，只保留启动链与运行时边界两类高价值护栏。

- `tools/smoke/lib`
  smoke 公共内核和共享夹具。
  `core.js` 负责读取文件、执行 `vm` 沙箱和统一 CLI 输出。
  `fixtures/` 负责跨 smoke 套件复用的 stub 和 sandbox 构造。

- `tools/smoke/<suite>`
  每个 suite 只负责一个测试主题。当前只保留 `startup` 与 `runtime-boundaries`。

- `tools/smoke/<suite>/checks`
  suite 内部按领域拆分的检查项模块。每个文件导出一组 checks，`index.js` 只做装配，不堆实现。

## CLI Entry Points

- `node tools/run-smoke.js [suite...]`
  统一的 smoke 入口，只执行 `startup` 和 `runtime-boundaries`。

- `node tools/validate-content.js ...`
  内容配置、链接和购买链契约校验入口。

- `node tools/ui-preview/runtime/generate-all.js`
  UI 可视化入口，加载真实 UI 源码生成节点树 dump + PNG 快照。

- `python3 tools/normalize-portrait.py ...`
  资源立绘规范化入口。

## Smoke Rules

- 新增 smoke 时，优先归到已有 suite；只有主题明显不同才新建 suite。
- `index.js` 保持薄，只负责拼接 checks 和导出 `runChecks` / `runCli`。
- 共享 sandbox、storage stub、`cc` stub 优先落到 `tools/smoke/lib/fixtures`，不要在多个 suite 里重复手写。
- 跨模块协同行为放 `runtime-boundaries` 一类 suite。
- Smoke 只测启动链、模块边界和规则解释层是否还能工作，不绑定真实内容分配、角色专属归属或具体公式 ownership。
- 如果断言依赖真实配置 id、当前配方归属或策划分配结果，这类检查应迁移到 `validate-content` 或单独的 regression 检查，而不是继续堆在 smoke。
- 真实 `PurchaseList / RoleConfigTable / TalentConfigTable / ExchangeAchievementConfig` 的映射一致性，归 `validate-content` 的 `purchase-links` 检查，不放在 smoke 里做快照式断言。

## Current Structure

- `tools/smoke/runtime-boundaries/checks`
  运行时边界、战斗/建造协同、购买/持久化边界、加载链。

- `tools/smoke/startup`
  启动装配、`jsList`、场景交接和启动链契约。

- `tools/ui-preview/runtime`
  UI 可视化运行时：cc-stub + dump-* driver + render.py + inspect.js + uiWorkbench。

- `tools/ui-preview/dist`
  生成产物目录（runtime JSON / PNG / 报告），不进入游戏运行时代码。

## Git Hook Integration

Use repository-managed Git hooks:

```bash
git config core.hooksPath .githooks
```

Hook wrappers:

- `.githooks/pre-commit` runs `node tools/precommit/run-tests.js`
- `.githooks/pre-push` runs `node tools/precommit/run-pre-push.js`

The hook scripts only delegate to existing Node entrypoints; they do not carry
business logic. Add new checks in `tools/validate-content.js` or
`tools/run-smoke.js`, then orchestrate them via precommit/pre-push.

Emergency escape hatches:

- `SKIP_PRECOMMIT=1` (or `true`)
- `PRECOMMIT_CONTENT=1` (or `true`)
- `SKIP_PREPUSH=1` (or `true`)
