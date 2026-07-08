# BuriedTown 渐进式重构计划（精简版，保留关键信息）

## 1. 目标与衡量标准

目标：在可控、可验证、可回退的节奏内完成架构替换，服务 5 类内容扩展：
- 增加人物
- 增加天赋
- 增加物品
- 增加建筑 / 建筑动作
- 增加特定机制

衡量标准（粗）：
- 新增内容优先改配置与服务，不回旧大文件堆分支
- 新增内容的改动文件数持续下降
- 高风险入口改动有固定 smoke 护栏
- 旧 fallback / 硬编码 / 兼容映射可按阶段真实删除

### 1.1 终局衡量（"扩展闭环"，每条要可验证）

下面五条是 §1 衡量标准的可执行版本，也是反向证明 Phase 3/4/5 是否真正完成的"终极 smoke"：

- **加 1 个角色**：仅改 `roleConfigTable.js` + 字符串 + 资源；`ConfigValidator` 通过即上线
- **加 1 个天赋**：仅改 `talentConfigTable.js` + 字符串 + 资源
- **加 1 个物品**：仅改 `itemConfig.js` + 字符串 + 资源；不再触碰 `BattleEquipmentSystem` / `TravelService` / `Storage` / `buff` / `player.js`
- **加 1 个建筑**：仅改 `buildConfig.js` + `buildActionConfig.js` + 字符串 + 资源
- **加 1 个机制**：仅在对应服务加挂点，不动 `player.js` / `site.js`

任何一条若仍需要碰旧大文件，就说明对应 Phase 还没收完，哪条不达标 → 看 §4 对应清单。

## 2. 终局架构（边界）

1. 内容主数据层  
   `roleConfigTable.js` / `talentConfigTable.js` / `itemConfig.js` / `buildConfig.js` / `buildActionConfig.js` / `formulaConfig.js`
2. 规则解释 / 机制注册层  
   `RoleRuntimeService.js` / `TalentService.js` / `BuildActionEffectService.js` / `PlayerAttrService.js` / 其它机制服务
3. 状态模型层  
   `player.js` / `Build.js` / `buildAction.js` / `site.js`
4. 装配 / UI / 兼容层  
   `jsList.js` / `game.js` / `uiUtil.js` / `dialog.js` / 场景文件 / 购买兼容入口

## 3. 当前状态（主线结论）

- Phase 0~2 已完成
- Phase 3 主线：3A/3B/3C/3D/3E/3F **已完成**；**3G 清单已落盘**(`docs/3G-restore-lists.md`,21 条 restore 调用 / 8 条 migration 规则 / 12 条副作用)+ **主线拆分已完成**(weather.restore 副作用拆分,消除 latent bug),buildAction 定时器评估后保留(设计上合理副作用),次要 migration 收口留待后续
- Phase 4 **全部 9/9 项已完成**(详见 §4.3),§1.1"加 1 个物品"扩展闭环解锁
- Phase 5（utils.js 购买残留收口）**已完成** — 三处历史项实际早已迁入 PurchaseService,本批补收最后一处裸 `201` 为 `PurchaseService.EXTERNAL_BRIDGE_PURCHASE_ID` 常量(详见 §4.2)
- Phase 7 为次级路线，只有在主线稳定后推进

当前主要阻碍（按优先级，已按现状重排）：
1. ~~**3G**~~ ✅ 主线拆分已完成(weather.restore 副作用拆分,消除 latent bug;buildAction 定时器评估后保留;详见 docs/3G-restore-lists.md §3G 实现决定)
2. ~~**配置 fallback** 仍掩盖结构问题~~ ✅ R5 核对完成:`RoleRuntimeService._defaultConfig` 与 `SiteConfigService._buildFallbackConfig` 均为**合法边界**(可选字段默认值 / siteId 缺失防崩),不清退。`_defaultConfig.roomBuilds` 含具体业务默认值(陌生人初始建筑)是设计层面问题,留待未来"角色配置 schema 重设计"(非本计划范畴)
3. ~~**Phase 4 散落**~~ ✅ 已完成
4. ~~**Phase 5 未启动**~~ ✅ 已完成(详见 §4.2)
5. **R7 未启动**：`dialog / uiUtil` 职责收口尚无清单（详见 §8）

## 4. 关键清单（保留关键信息）

### 4.1 双轨 runtime fallback 清单

目标：清理到只剩 `GameRuntime.js` 启动期兼容（已基本达成）。

**现状：除 `GameRuntime.js` 自身保留启动期边界外，业务侧均已直调 `GameRuntime.getXxx()`，不再有 `|| 全局` 旁路。**

| 文件 | 旧 fallback 函数 | 现状 | 真删窗口 |
|------|---------------|------|---------|
| `buildAction.js:9-31` | `getBuildActionRuntimePlayer/Timer/Emitter/Record()` | ✅ 已收口（直调 GameRuntime，无 `\|\|` 旁路） | 3G 完成后评估能否内联到调用点 |
| `site.js:25-35` | `getSiteRuntimePlayer/Timer/Emitter/Record()` | ✅ 已收口 | 3G 完成后评估 |
| `map.js:4-10` | `getMapRuntimePlayer/Emitter()` | ✅ 已收口 | 3G 完成后评估 |
| `MapActor.js:4-10` | `getMapActorRuntimePlayer/Timer()` | ✅ 已收口 | 3G 完成后评估 |
| `MapInteractionController.js:5-15` | `getMapInteractionRuntimePlayer/Timer/Record()` | ✅ 已收口 | 3G 完成后评估 |
| `BattleActors.js` 313/322 行 | `runtimePlayer.weather` 检查 | ✅ 已是 `runtimePlayer && runtimePlayer.weather` 防御性检查（非旁路） | 不删（属正常防御） |
| `ziplineManager.js:5-14` | `getZiplineRuntimePlayer/Timer/Record()` | ✅ 已收口 | 3G 完成后评估 |
| `ZiplineNetworkService.js:94-108` | 内联 GameRuntime.getPlayer | ✅ 已收口 | 不删（属合理调用） |
| `GameRuntime.js:64-106` | `getPlayer/Timer/Emitter` 自身 fallback | 🔒 启动期保留（合法边界） | **永不删**（启动链兜底，删除即破坏冷启） |

**3E 关闭判据**：上表全部为 ✅ 或 🔒 — **已满足**。
**剩余动作**：`3G` 完成 restore/migration 分层后，评估是否把这 8 个 `getXxxRuntimeYyy()` 透传函数直接内联到调用点（消除一层无意义间接），但这是清扫，不算结构变动。

### 4.2 购买链残余硬编码

历史清单已逐项收口完成（截至 3F 收尾时核对）：

| 历史项 | 现状 |
|------|-----|
| `IAPPackage.initPackage()` 逐个调用 `onIAPPaied(0,101-109,120-124)` | ✅ 已清，仅保留 `_applyEnvironmentFlags()` + `initIAPRecord()` |
| `IAPPackage.resetConsumablePurchaseRecords()` 逐个重置 201-209 | ✅ 已清，改为遍历 `purchaseId >= 200` 配置项 |
| `PurchaseService._singleUnlockRewardMap` 105/106/107 | ✅ 已清，统一走 `getUnlockReward()` |
| `PurchaseService.getPriceOff()` 206/207 硬编码折扣 | ✅ 已清，从 config `discountPercent` 计算 |

UI 侧旁路：`shopScene.js` 已改走 `PurchaseService.getPurchaseInfo()`，`assets/src/ui/` 下零处直接访问 `PurchaseList`。

仍残留（Phase 5 范畴）—— 核对现状后实际只剩一处：

| 位置 | PLAN 历史描述 | 实际现状 |
|------|---------|---------|
| `util/utils.js:396` `doBridgeReceive` | 硬编码 `PurchaseList[201].effect` + 直接发奖 + `Record.saveAll()` | ✅ **已完成** — 早已改走 `PurchaseService.applyExternalReward(purchaseId, count)`;本批把裸 `201` 收口为 `PurchaseService.EXTERNAL_BRIDGE_PURCHASE_ID` 常量 |
| `util/utils.js:443` `getProductIdMap` | 全表遍历 PurchaseList | ✅ **已完成**(早于本批) — 已收到 `PurchaseService._getProductIdMap()`(PurchaseService.js:1002),utils.js 不再持有 |
| `util/utils.js:500-528` Android SDK queryResult 价格回填 | 直写 `PurchaseList[xx].priceList[i]` | ✅ **已完成**(早于本批) — 已不在 utils.js,迁移到 `PurchaseService` 内部 |

**Phase 5 关闭判据**：`assets/src/util/utils.js` 下 `PurchaseList[` 直接访问归零(已满足);`utils.doBridgeReceive` 仅持有 `PurchaseService.EXTERNAL_BRIDGE_PURCHASE_ID` 常量引用,不持有发奖/存档逻辑。Phase 5 关闭。

### 4.3 Phase 4 特殊物品散落清单

按"配置 / 局部 service / UI 显示"三类归档；现状基于代码核对。

| 散落点 | itemId | 现状 | 归档目标 | 类型 |
|--------|--------|------|---------|------|
| `TravelService.js:11-13` ROLE_SPEED 表 | 1304024 / 1305034 / 1305044 | ✅ **已完成** — 改为读 `itemConfig[id].travelKind` + `travelSpeedBonus` + `travelAccelerateRealTime`,TravelService 遍历 storage 取 max | （已归档到配置） | — |
| `BattleEquipmentSystem.js:140-146` 武器分类分支 | 1303022 / 1303012 / 1303033 / 1303044 / 1301071 / 1301082 | ✅ **已完成** — `classifyEquipmentKind` 改为优先读 `effect_weapon.equipmentKind`;音效分支(1301071/1301082)改为读 `effect_weapon.attackSound` | （已归档到配置） | — |
| `BattleEquipmentSystem.js:11` / `Battle.js:23` | BULLET_ID 1305011 | ✅ **已完成**(早于本批) — 已统一走 `BattleConst.BULLET_ID`,定义仅在 `constants.js:29` | （已归档） | — |
| `site.js:197-199` 密室 ITEM_EXPLORER / FLASHLIGHT | 1305064 / 1305053 | ✅ **已完成** — 常量收到 `SiteConfigService.getSecretRoomModifierItemIds()`,site.js 改为遍历 | （已归档到局部 service） | — |
| `player.js:494-531` 药品分支 + `item1104032Effect` | 1104011 / 1104032 | ✅ **已完成**(早于本批) — 已改走 `MedicineItemId` 常量(在 `constants.js`);分支逻辑仍保留在 player.js,但无裸 ID 硬编码 | （部分归档到常量表） | — |
| `buff.js:142-172` BuffItemEffectType + switch | 1107012 / 1107022 / 1107032 / 1107042 | ✅ **已完成** — `getItemBuffMeta` switch 改为读 `effect_buff.attrList` / `blockChangeAttrMap` / `suppressAttrEffectMap` / `statBonusMap` / `buffClass` 字段;`createItemBuff` 用 `buffClass === "maxHp"` 选 Buff 类。`BuffItemEffectType` 常量保留作为 PlayerAttrService 反查 attr→itemId 的过渡(后续 R5 收口) | （已归档到配置,常量表待 R5 清退） | — |
| `WeaponCraftService.js` 耐久映射 | 12 个 base→durable 对 | ✅ **已完成** — 改为从 `itemConfig[id].durableItemId` 读取 | （已归档到配置） | — |
| `Storage.js` 重量修正 | 1305044 | ✅ **已完成** — 当前 `Storage.js` 已无该 ID 引用 | （已归档） | — |
| `PurchaseService.js` / `IAPPackage.js` 购买奖励 | 1305024 / 1304024 | ✅ **已完成** — 当前两文件已无该 ID 引用 | （已归档到配置） | — |

**Phase 4 关闭判据**：上表全部为 ✅。当前完成 9/9 项,§1.1"加 1 个物品"扩展闭环解锁(配置驱动,不再有裸 ID 散落)。

## 5. 分阶段路线（保留重点）

### Phase 0~1（已完成）
- 校验与 smoke 护栏建立

### Phase 2（已完成）
- `BuildActionTypeRegistry` / `BuildActionFactory` 已落地

### Phase 3（主线）
目标：配置主源 + 购买链 + shop state + runtime 真源 + restore/migration 分层。

### Phase 4（已启动）
目标：特殊物品/武器入口收口到配置或局部 service。

### Phase 5（次主线）
目标：解锁/兑换/兼容链收口，购买链只保留适配器职责。

### Phase 6/7（按需）
地图/站点、战斗展示、侧功能包，仅在不打断主线时推进。

T 版借鉴原则（保留）：只借鉴“功能独立打包”，不回迁 UI 直连业务/存档/全局状态。

## 6. Phase 3 批次状态（简表）

| Batch | 状态 | 关键结论 |
|-------|------|----------|
| 3A | ✅ 完成 | `role.js` 主表唯一化 |
| 3B | ✅ 完成 | 兑换映射去硬编码 |
| 3C | ✅ 完成 | 天赋选择兼容收口 |
| 3D | ✅ 完成 | 购买链职责收边，硬编码 105/106/107/206/207 / 101-124 / 201-209 已清 |
| 3E | ✅ 完成 | 双轨 runtime fallback 业务侧已清退；§4.1 清单全 ✅ 或 🔒 |
| 3F | ✅ 完成 | shop state 单一入口；UI 零旁路（`shopScene` 改走 `PurchaseService.getPurchaseInfo`） |
| 3G | ✅ 主线拆分完成 | weather.restore 副作用拆分;buildAction 定时器评估后保留;详见 docs/3G-restore-lists.md |

当前下一步顺序：
1. ~~**3G**~~ ✅ 主线拆分完成(weather.restore 副作用拆分)
2. ~~**Phase 4**~~ ✅ 全 9/9 项归档完成(§4.3)
3. ~~**Phase 5**~~ ✅ utils.js 购买残留收口完成(§4.2)
4. ~~**R5**~~ ✅ 配置 fallback 核对完成(两个均为合法边界,不清退)
5. **R7**(dialog / uiUtil 职责收口)— 清单已落盘(`docs/R7-ui-basement-lists.md`),待实现 uiUtil 11 项业务编排迁出 + dialog.js 4 个含重业务 Dialog 下沉

3E 已收口的窄边界（保留备查）：
- `MapNode` / `MapEntity` / `home` / `MapZiplineController` / `MapZiplineBuildController` / `ZiplineEndpointPanelController` / `ZiplineActionService`
- `buildNode` / `gateNode` / `storageNode` / `siteStorageNode` / `workRoomStorageNode` / `npcStorageNode` / `equipNode` / `SectionTableView` / `ItemChangeNode`

### 6.1 3G 启动准备（待补清单）

3G 是高风险变动，启动前必须先以子代理（只读）输出三张清单：
- **restore 调用图**：所有调用 `player.restore` / `Build.restore` / `site.restore` 等的入口与触发链
- **migration 规则清单**：当前散落在 restore 内的版本兼容、字段补齐、旧字段重命名等规则
- **读档热路径副作用**：restore 过程中触发的事件、定时器注册、UI 通知

清单未输出之前**不动代码**。

## 7. 统一约束与验证

统一约束：
1. 不重排启动链；高风险入口只做薄改
2. 不新建第二套 runtime
3. 每轮只收一个窄边界
4. 新逻辑优先收进已有服务/配置，不新增平行 helper
5. 新增内容类型必须补最小校验
6. UI 不新增业务编排，业务决策走服务层
7. 只借鉴 T 版“入口与打包方式”，不回迁页面直写存档/全局状态
8. `GameRuntime` 是唯一 runtime 入口
9. `restore` 与 `migration` 必须分离
10. 商店/UI 只消费服务层 view model

高风险入口清单：
`jsList.js` / `game.js` / `GameRuntime.js` / `player.js` / `PlayerPersistenceService.js` / `site.js` / `Build.js` /
`IAPPackage.js` / `PurchaseService.js` / `PurchaseUiHelper.js` / `uiUtil.js`

验证入口：
```bash
node tools/validate-content.js all --lang zh
node tools/validate-content.js all --lang en
node tools/run-smoke.js runtime-boundaries startup
```

内容扩展专项回归：
- 新角色可选择/解锁/特性生效
- 新天赋可解锁/可选/效果生效
- 新物品有图标/文案/效果生效
- 新建筑可建造/升级/动作生效
- 新机制能在对应服务挂点触发

### 7.1 启动链收口（新增）

目标：减少重复入口与隐式副作用，让启动流程可读、可测、可回退。

要点：
- 统一入口：`MenuScene` / `StoryScene` / 继续游戏都走同一 `game.startGame()` 或 `game.bootstrap()`（命名待定）
- 明确启动阶段：`Record/slot 预备` → `GameRuntime.bootstrap` → `player.restore` → `game.start`
- 防重入：在 `game.init/start` 增加 `_isInitializing/_isStarted` 防抖
- 全局写回集中：全局 `player/cc.timer/utils.emitter` 的写回只在 `GameRuntime` 单点发生
- 保持 `jsList.js` 顺序不动

验收标准：
- 启动入口只有一条，UI 不再分叉初始化逻辑
- `tools/run-smoke.js runtime-boundaries startup` 通过
- 最小人工回归通过（`MenuScene` / `ChooseScene` / `MainScene`）

### 7.2 子代理与 Hook 使用策略（新增）

目标：让“结构收口”阶段的协作方式也服务主线，不把多代理和自动化变成新的双轨来源。

子代理使用原则：
- 子代理以“只读分析、清单化、契约梳理、回归面收集”为主，不默认并行改高风险入口
- 主代理负责最终实现收口；高风险文件默认单线程改动
- 子代理适用于大任务拆分，不适用于简单链路修补
- 子代理输出应优先是：调用链清单、契约字段列表、风险点、最小回归建议

子代理推荐落点：
- 3D / 3F：拆分扫描 `PurchaseService.js` / `PurchaseUiHelper.js` / `uiUtil.js` / `dialog.js` 的 shop state 消费与重复推导点，由主代理统一收口到 `PurchaseService.getShopUiState()`
- 3E：按 runtime fallback 清单逐项核对现状，并单独审查启动链写回点是否继续泄漏到 `GameRuntime` 之外
- 3G：分离 `restore` 调用图、`migration` 规则清单、读档热路径副作用，再由主代理统一做分层实现
- Phase 4：整理特殊 itemId / weapon id 散落点，按“配置 / 局部 service / UI 显示”三类归档

子代理禁区：
- 不并行改 `jsList.js` / `game.js` / `GameRuntime.js` / `player.js` / `site.js` / `IAPPackage.js` / `PurchaseService.js` / `uiUtil.js`
- 不为赶进度新增 fallback、影子状态、一次性 helper
- 不让不同子代理各自补兼容分支后再尝试拼接

Hook 使用原则：
- Hook 负责“守回归”，不负责承载业务逻辑
- `pre-commit` 只放快速、明确、与改动范围强相关的检查
- `pre-push` 放全量内容校验和较慢的 smoke
- Hook 失败信息应直接指向配置类型、入口文件或 smoke 名称，便于快速回退

推荐 Hook 分层（按现实开发体验调整）：
- `pre-commit`（保持轻量，避免成为绕道理由）：
  - 对暂存的 `*.js` 执行 `node --check`
  - 改到内容配置时执行**对应**定向校验（命中文件触发）：
    - `itemConfig.js` / 字符串表 / 物品展示链：`node tools/validate-content.js item-ui --strict-text`
    - `buildConfig.js`：`node tools/validate-content.js links build --lang zh`
    - `buildActionConfig.js`：`node tools/validate-content.js links build-action --lang zh`
    - 武器/战斗链：`node tools/validate-content.js weapon-links --lang zh`
    - 站点链：`node tools/validate-content.js site-links --lang zh`
- `pre-push`（承担"重护栏"）：
  - `node tools/validate-content.js all --lang zh`
  - `node tools/validate-content.js all --lang en`
  - `node tools/run-smoke.js runtime-boundaries startup`
- **opt-in 重护栏**（避免 pre-commit 拖慢提交体验）：
  - 改到高风险入口（§5）时**显式**跑：`BT_PRECOMMIT_SMOKE=1 git commit ...`
  - 或在 commit message 里带 `[smoke]` 触发；缺省路径不跑 smoke
  - 失败信息直接指向触发的入口文件名与 smoke 名

为什么把 smoke 从默认 pre-commit 移走：在 termux + 旧 Cocos 项目下，每次提交都跑 startup smoke 会显著拖慢节奏，反而会诱导绕过 hook（CLAUDE.md §11 已禁止 `--no-verify`），不如把它放到 pre-push 与显式入口。

执行建议：
- Phase 3 主线默认采用“1 个主代理 + 只读子代理 + hook 护栏”
- Phase 4 内容收口可增加 1 个清单型子代理，但仍由主代理统一落代码
- 在 R7 `dialog / uiUtil` 职责收口完成前，不扩张为复杂 UI 自动化 hook
- 如果某轮任务无法明确切成只读分析与单点实现两部分，则优先不用子代理

## 8. R 系列整改计划（索引视角，状态从 Phase 推导）

R 系列不再独立持有状态，仅作为"主题视角索引"，状态以对应 Phase 批次为准。

| R | 主题 | 对应 Phase | 状态来源 |
|---|------|-----------|---------|
| R1 | 边界清单化 + 契约断言 | Phase 1 + §5 | 持续维护 |
| R2 | runtime 真源唯一化 | 3E | 见 §6（✅ 完成） |
| R3 | shop state 单一入口 | 3F | 见 §6（✅ 完成） |
| R4 | restore/migration 分层 | 3G | ✅ 主线拆分完成(weather.restore 副作用拆分) |
| R5 | 配置 fallback 清退 | Phase 4/5 末段 | ✅ 核对完成 — 两个 fallback 均为合法边界(可选字段默认值 / siteId 缺失防崩),不清退;`_defaultConfig.roomBuilds` 业务默认值问题留待未来 schema 重设计 |
| R6 | UI 资源解析统一化 | — | ✅ 已落地 |
| R7 | dialog / uiUtil 职责收口 | — | 清单已落盘(`docs/R7-ui-basement-lists.md`),待实现 |

### 8.1 R7 待补清单（启动 R7 前必须先输出）

`uiUtil.js` 与 `dialog.js` 是 UI 共享底座中最厚的两块；R7 启动前必须先以子代理（只读）输出：

- **uiUtil.js 职责盘点**：把当前导出函数按"UI 工厂 / 主题与字号 / 业务编排"三档分类，业务编排部分需要标记应迁出的目标位置
- **dialog.js 业务下沉清单**：枚举每个 Dialog（DialogBig/Small/Tiny/PayDialog/ItemListDialog 等）当前是否带业务回调或状态；带业务的需要标记可拆出的 helper 候选
- **混用扫描**：扫描 `assets/src/ui/` 下哪些场景同时使用 `uiUtil.createXxx` 与裸 `cc.Sprite/cc.LabelTTF` 创建 UI（说明工厂尚未覆盖到位）

清单未输出之前**不动代码**；和 3G 共用"先清单后实现"的纪律。

## 9. 最小回归

- `MenuScene` / `ChooseScene` / `MainScene`

## 10. 反例库（已踩过的坑，扩展时禁忌索引）

下列踩坑来自项目运行历史，所有内容扩展与 UI 改动前应检视一遍：

- **`string_zh.js` 用 JS 对象字面量，同 ID 后定义会静默覆盖**：新增 ID 前必须先 `grep '"<id>"'` 查重；曾因 1369-1372 经济广播覆盖椅子抽烟文案。
- **顶部 `StatusButton` 的 label 用比例字体**：`updateView` 重置 fontSize + 重收敛会让同字符数串（"00:00" / "11:11"）字号反复变化；`fitInlineStatusButtonLabel` 已改 sticky（只朝更小方向收敛），改回非 sticky 即复发。
- **副本 `canClose` 与滑索联动**：`Site.canClose()` 现还会检查 `ZiplineNetworkService.hasLinksForEntity`；`ZiplineNetworkService.sanitize` 见到 `entity.closed === true` 会丢弃 link，所以"关站点 → 链路自动剪掉"是隐性副作用，改 `canClose` 必须同步评估滑索面。
- **NPC 动态经济**：`NpcEconomyService` 与 `RadioFeedService` 装配点在 `jsList.js`，前者必须排在 `npc.js` 之前、后者其后；事件名 `npcEconomy:priceShift`，未解锁 NPC 不广播；任何启动顺序变动都会破坏。

如果某条扩展会触发其中任何一项，回到 §1.1 扩展闭环重新评估"是否应该让代码走配置而不是再加分支"。
