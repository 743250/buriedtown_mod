# BuriedTown 项目说明（CLAUDE.md）

本文件是项目级协作说明，给 Claude Code 在本仓库工作时使用。
仓库内另有 `AGENTS.md` 给其它 AI 编程工具使用，两份文档目标接近但口径独立维护，本文件以本文件为准。

---

## 1. 项目定位

- 这是一个以 `assets/src/jsList.js` 装配启动的旧版 Cocos2d JS 游戏（mod 项目）。
- 当前阶段不是"重写"，是**边扩内容、边做结构收口**。
- 三件事优先级最高：
  1. 降低 UI bug、崩溃和资源映射错误
  2. 新内容优先复用已有 service / manager / router / state
  3. 不继续往旧核心里堆一次性 helper 与临时分支

---

## 2. 工作区路径

- 主要工作区：`/data/data/com.termux/files/home/AI code工作区`
- 项目目录：`/data/data/com.termux/files/home/AI code工作区/buriedtown_mod`
- 源码目录：`assets/src`
- 排查路径时优先使用真实路径，不依赖 `/root` 下的软链。

---

## 3. 主要目录

| 目录 | 职责 |
|------|------|
| `assets/src/data` | 配置表、多语言文本、内容定义 |
| `assets/src/game` | 核心业务逻辑、运行时服务、状态模型 |
| `assets/src/ui` | 场景、节点、弹窗、展示与交互层 |
| `assets/src/util` | 通用工具、容错、资源辅助、配置校验 |
| `assets/src/plugin` | 支付、广告、渠道、原生插件适配 |
| `assets/res` | 高频迭代的新资源 |
| `res` | 旧资源图集（`*.plist` + `*.pvr.ccz`） |
| `tools` | 仓库级校验、smoke、资源规范化工具 |

---

## 4. 总体原则

1. **复用优先**：先找现有 service / manager / router / state 与共享组件，不为单页造轮子。
2. **理解优先**：改动前先理解完整链路（配置 → 逻辑 → UI → 资源 → 存档/事件）。
3. **系统性修复优先**：能修共享层就不在单页打补丁；问题会复现就上移修复点。
4. **可维护性优先**：每次改动要让代码更清晰、更集中、更可验证，而不是只求"先能跑"。
5. **代码为准**：文案、注释、旧经验可能与现状不一致，以当前代码行为为准。
6. **渐进式重构**：不做无边界大改；每次改动都能说明收益、边界、风险、回退点。
7. **UI 高风险意识**：所有 UI 改动默认高风险，必须先理解现有架构再下手（见 §7）。
8. **小步改动**：一次只收口一条链路或一个小模块。
9. **不动启动顺序**：`assets/src/jsList.js` 是高风险边界，默认不重排。

---

## 5. 高风险入口清单（**单一来源，其它文档引用此处**）

下列文件改动前必须先理解上下游，并配置最小回归。

**运行时与状态**

- `assets/src/jsList.js`
- `assets/src/game/game.js`
- `assets/src/game/GameRuntime.js`
- `assets/src/game/player.js`
- `assets/src/game/PlayerPersistenceService.js`
- `assets/src/game/site.js`
- `assets/src/game/Build.js`

**购买与解锁链**

- `assets/src/game/IAPPackage.js`
- `assets/src/game/PurchaseService.js`
- `assets/src/ui/PurchaseUiHelper.js`

**UI 共享底座**

- `assets/src/ui/uiUtil.js`
- `assets/src/ui/dialog.js`
- `assets/src/ui/button.js`
- `assets/src/ui/richText.js`
- `assets/src/ui/autoSpriteFrameController.js`

**业务大节点**（业务下沉重灾区）

- `assets/src/ui/battleAndWorkNode.js`

---

## 6. 现有工具分层（按层 + 代表入口）

完整入口请直接看 `assets/src/util/` 与 `assets/src/ui/` 目录，本节只列分层与代表性入口。

| 层 | 职责 | 代表入口 |
|------|------|---------|
| UI 总入口 | 字体字号、按钮工厂、通用列表项 | `ui/uiUtil.js` |
| 弹窗 | DialogBig/Small/Tiny、ItemListDialog、PayDialog 等 | `ui/dialog.js` |
| 按钮底座 | Button、ButtonWithPressed、StatusButton | `ui/button.js` |
| 资源加载 | sprite frame / plist 装载 | `ui/autoSpriteFrameController.js` |
| 富文本 | 图标 + 文字混排 | `ui/richText.js` |
| 商城/角色辅助 | 商店卡片、角色头像、礼包预览 | `ui/PurchaseUiHelper.js` |
| 主题颜色 | 颜色、遮罩、字号 preset 配置 | `util/uiTheme.js` |
| 图标映射 | 角色头像 / 地图图标资源名映射 | `util/iconHelper.js` |
| 资源 fallback | 缺图降级 | `util/resourceFallback.js` |
| 安全边界 | 防御性调用、安全创建 UI、安全加载 sprite | `util/safetyHelper.js` |
| 内容工具 | 蓝图、校验、依赖清单 | `util/contentBlueprint.js` / `configValidator.js` / `dependencyChecker.js` |
| 字符串 | 文案统一获取 | `util/stringUtil.js` |
| 时间 | 定时器与时间推进 | `util/timerHelper.js` + `game/TimeManager.js` |
| 属性 | 属性编码/批量操作 | `util/memoryUtil.js` + `util/attrHelper.js` |
| 通用工具 | clone / 回调 / 随机数 / 字符串数组转换 | `util/utils.js`（不放业务） |
| 事件总线 | 项目内统一 `utils.emitter` | `util/emitter.js` |
| 音频 | 音乐与音效统一入口 | `util/audioManager.js` |
| 网络与埋点 | 请求与日志上传 | `util/networkUtil.js` + `util/dataLog.js` |
| 业务服务 | 默认视为优先复用层 | `game/*Service.js` / `*Manager.js` / `*Router.js` / `*State.js` |

---

## 7. UI 改动规则（最高风险模块）

### 7.1 改 UI 前必须先看

`uiUtil.js`、`dialog.js`、`button.js`、`autoSpriteFrameController.js`、`richText.js`、`util/uiTheme.js`、`util/iconHelper.js`、`util/resourceFallback.js`、`util/safetyHelper.js`。

### 7.2 选型顺序

1. 先看 `uiUtil.js` 是否已有现成入口
2. 再看 `dialog.js` / `button.js` 是否已有合适基础件
3. 再看是否应复用现有 scene / node 模式
4. 最后才考虑补共享能力

### 7.3 禁止事项

- 不要把业务逻辑散写在多个 node / scene 里
- 不要把大按钮素材硬压到窄区域
- 不要把 `DrawNode` 当正式按钮皮肤使用
- 不要绕过资源加载和 fallback 层直接裸取 sprite
- 不要为单个页面新增临时 UI helper
- 不要把 `richText` 之外的方式做"图标 + 文字" 混排
- UI 不新增业务编排，业务决策走服务层

---

## 8. 资源工作流

### 8.1 资源策略

- 旧资源保留在 `res/*.plist + *.pvr.ccz`。
- 新资源优先放 `assets/res/<分类>` 目录，缺失时再回退到旧资源。
- 当前没有新美术资源；默认只能复用现有资源。

### 8.2 常用目录

`assets/res/npc` `assets/res/icon` `assets/res/ui` `assets/res/site` `assets/res/build` `assets/res/dig_build` `assets/res/dig_item` `assets/res/dig_monster` `assets/res/dig_work` `assets/res/gate` `assets/res/home` `assets/res/map` `assets/res/menu` `assets/res/rank` `assets/res/end` `assets/res/day` `assets/res/day2` `assets/res/weather`

### 8.3 命名约定

- `npc_dig_<roleType>.png`：对话立绘
- `npc_<roleType>.png`：地图头像
- `icon_item_<itemId>.png`：物品图标
- `icon_iap_<purchaseId>.png`：购买/天赋图标
- `site_<siteId>.png`：站点图标

### 8.4 立绘规范化

```bash
python3 tools/normalize-portrait.py inspect <path> --json
python3 tools/normalize-portrait.py normalize \
  --input <path> --output assets/res/npc/npc_dig_<id>.png \
  --preset npc_dig --trim-alpha --cut 0,0,0,18
```

常用预设：`npc_dig` 生成 `446x264` 立绘；`npc_map` 生成 `56x56` 地图头像。
常调参数：`--crop x,y,w,h`、`--cut l,t,r,b`、`--scale n`、`--offset x,y`、`--preview path.png`。

### 8.5 图片相关改动规则

1. 先确认是否已有可复用资源
2. 新增内容时同步补图标映射和字符串配置
3. 可能缺图的链路优先走 `ResourceFallback` / `SafetyHelper.safeLoadSprite`
4. 不为"先显示出来"把错误资源硬编码进业务页
5. 一图多义要克制；优先保持原有资源的使用语义
6. Mod 新增内容缺图或临时复用旧图时，必须同步更新 `docs/mod-image-assets.md`；专属图落地后将对应条目标为“已替换”

---

## 9. 内容扩展清单

新增角色 / 天赋 / 物品 / 建筑 / 机制时，**不要手抄检查清单**，统一走 `ContentBlueprint`：

```javascript
ContentBlueprint.printBlueprint("role", ROLE_TYPE);
ContentBlueprint.printBlueprint("talent", PURCHASE_ID);
ContentBlueprint.printBlueprint("item", ITEM_ID);
```

完成后用 `ConfigValidator` 校验：

```javascript
var result = ConfigValidator.validateItem(ITEM_ID);
if (!result.valid) { cc.error("配置不完整: " + result.errors.join(", ")); }
```

依赖梳理用 `DependencyChecker`。
**新蓝图字段的真相源是 `util/contentBlueprint.js`，本文档不再维护副本**。

---

## 10. 校验与回归

### 10.1 内容校验

```bash
node tools/validate-content.js all --lang zh
node tools/validate-content.js item-ui --strict-text
node tools/validate-content.js links build --lang zh
node tools/validate-content.js links build-action --lang zh
node tools/validate-content.js weapon-links --lang zh
node tools/validate-content.js site-links --lang zh
node tools/validate-content.js checklist role 1 --lang zh
```

### 10.2 运行时 smoke

高风险入口（见 §5）改动前后建议跑：

```bash
node tools/run-smoke.js
node tools/run-smoke.js runtime-boundaries startup
```

### 10.3 UI 改动后

跑一次 UI 可视化运行时，检查节点树、缺图和布局：

```bash
node tools/ui-preview/runtime/generate-all.js
node tools/ui-preview/runtime/inspect.js --generate --out tools/ui-preview/dist/runtime_report.md
```

### 10.4 最小回归用例（人工）

启动链：`MenuScene` → `ChooseScene` → `MainScene` 至少能完成最小启动验证。

角色：可选择 / 可解锁 / 角色专属规则生效。
天赋：已改动天赋效果正确 / 三级奖励正确。
战斗：伤害 / 精度 / 爆头 / 防御正常。
资源 UI：无缺图、错图、空文本。

---

## 11. 安全编码约定

### 11.1 结构优先

- 先通过明确输入、明确状态归属、明确模块边界解决问题；不在业务函数里堆"顺手兼容"。
- 旧代码缺口先考虑收口到现有 service / manager / router / state，再决定是否局部修补。
- 如果一次修复要连续加多个 `if` / `||` / 三元 / 兼容分支，**默认先停下**，重新检查落点。

### 11.2 类型与防重入

```javascript
if (typeof obj.fn === "function") { obj.fn(); }
```

```javascript
if (this._isProcessing) return;
this._isProcessing = true;
try { /* business logic */ } finally { this._isProcessing = false; }
```

### 11.3 影子函数法（高风险重构）

1. 旧函数改名为 `xxx_old`
2. 新函数保留原签名
3. 写验证函数对比新旧输出
4. 验证通过后再删旧实现

---

## 12. Bug 修复纪律（强制）

1. **先证据，后改动**：先拿到可复现路径、关键状态、调用链与日志证据，再动代码。
2. **禁止"看起来像问题就先改"**：任何改动都要能说出"这条证据对应这个根因"。
3. **不要为表面速度压缩排查时间**：无证据的快速改动放大返工与回归风险。
4. **改前定义验证条件**：明确"改前必现、改后消失"，至少一个主用例 + 一个回归用例。
5. **改后必须复核**：语法检查 / 关键流程复测 / 相关分支回归；无法验证就把风险与缺口写出来。
6. **谨慎对待兜底**：兜底只能保护边界，不能替代根因；临时补丁必须注明移除条件。
7. **结论可追溯**：结论可追溯到代码位置、日志或复现步骤，禁止"猜测型修复"。

---

## 13. 明确禁止

- 不要只做补丁和兜底，而不提升结构。
- 不要把重复业务逻辑复制到多个 UI 页面。
- 不要把 fallback 当主方案。
- 不要在不理解 UI 架构前直接改 UI。
- 不要新增一次性 helper 让项目更碎。
- 不要把 `utils.js` 变成业务垃圾桶。
- 不要在没确认资源链路时硬改图片名或直接替换映射。
- 不要在 UI 页绕过 `PurchaseService.getShopUiState()` 自己拼商店数据。
- 不要让"空 sprite / 空字符串 / 空 ID" 成为缺资源的隐式默认。

---

## 14. 协作预期

- 一边扩内容，一边优化结构。
- 一边修 UI bug，一边降低同类 UI bug 再发概率。
- 一边复用旧资源，一边把图片配置、图标映射、fallback 链路理顺。
- 把"临时可用"持续推进成"长期可维护"。

如果某次改动只能在"快速补丁"与"结构性修正"之间二选一，**默认选择边界清晰、可持续演进的方案**。
