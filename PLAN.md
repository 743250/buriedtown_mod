# BuriedTown 渐进式重构计划（精简版，保留关键信息）

## 1. 目标与衡量标准

目标：在可控、可验证、可回退的节奏内完成架构替换，服务 5 类内容扩展：
- 增加人物
- 增加天赋
- 增加物品
- 增加建筑 / 建筑动作
- 增加特定机制

衡量标准：
- 新增内容优先改配置与服务，不回旧大文件堆分支
- 新增内容的改动文件数持续下降
- 高风险入口改动有固定 smoke 护栏
- 旧 fallback / 硬编码 / 兼容映射可按阶段真实删除

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
- Phase 3 为主线，核心目标是把 runtime 真源、购买链、shop state、restore/migration 一起收口
- Phase 4 已启动（特殊物品/武器入口收口）
- Phase 7 为次级路线，只有在主线稳定后推进

当前主要阻碍（按优先级）：
1. runtime 真源不唯一（GameRuntime 之外仍有双轨 fallback）
2. restore 与 migration 混在读档热路径
3. 购买业务没有单一状态源（UI 仍有 fallback 推导）
4. 配置 fallback 长期掩盖结构问题（`RoleRuntimeService._defaultConfig` / `SiteConfigService._buildFallbackConfig`）

## 4. 关键清单（保留关键信息）

### 4.1 双轨 runtime fallback 清单

目标：清理到只剩 `GameRuntime.js` 启动期兼容。

| 文件 | fallback 函数 | 回退目标 |
|------|-------------|---------|
| `buildAction.js:9-31` | `getBuildActionRuntimePlayer/Timer/Emitter/Record()` | `player` / `cc.timer` / `utils.emitter` / `Record` |
| `site.js:25-29` | `getSiteRuntimePlayer()` | `player` |
| `map.js:6-12` | 匿名 getter | `player` / `utils.emitter` |
| `MapActor.js:6-12` | 匿名 getter | `player` / `cc.timer` |
| `MapInteractionController.js:7-19` | 匿名 getter | `player` / `cc.timer` / `Record` |
| `BattleActors.js:312` | 内联检查 | `player.weather` |
| `ziplineManager.js:29,111` | 内联检查 | `player` |
| `ZiplineNetworkService.js:98-108` | 内联检查 | `player` / `player.map` |
| `GameRuntime.js:57-103` | `getPlayer/Timer/Emitter/Record()` 自身 | `player` / `cc.timer` / `utils.emitter` / `Record` |

### 4.2 购买链残余硬编码

| 位置 | 硬编码内容 |
|------|-----------|
| `IAPPackage.initPackage()` | 逐个调用 `onIAPPaied(0,101-109,120-124)` |
| `IAPPackage.resetConsumeIAP()` | 逐个重置 `_record[201-209]` |
| `PurchaseService._singleUnlockRewardMap` | 105/106/107 → 物品/建筑映射 |
| `PurchaseService.getPriceOff()` | 206/207 硬编码折扣 |

### 4.3 Phase 4 特殊物品散落清单（17+ itemId，13 文件）

- 旅行速度：`TravelService.js` — 1304024 / 1305034 / 1305044  
- 武器分类：`BattleEquipmentSystem.js` — 1303022 / 1303012 / 1303033 / 1303044 / 1301071 / 1301082  
- 子弹常量：`BattleEquipmentSystem.js` / `Battle.js` — 1305011  
- 密室修正：`site.js` — 1305064 / 1305053  
- 药品效果：`player.js` — 1104011 / 1104032  
- Buff 类型：`buff.js` / `PlayerAttrService.js` — 1107012 / 1107022 / 1107032 / 1107042  
- 武器耐久映射：`WeaponCraftService.js` — 12 个 base→durable 对  
- 重量修正：`Storage.js` — 1305044  
- 购买奖励：`PurchaseService.js` / `IAPPackage.js` — 1305024 / 1304024  

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
| 3D | 🔄 进行中 | 购买链职责收边，清理硬编码 |
| 3E | ⏳ 待开始 | runtime 真源唯一化 |
| 3F | 🔄 进行中 | shop state 单一入口 |
| 3G | ⏳ 待开始 | restore / migration 分层 |

当前下一步顺序：
1. 收完 3F（锁定 `PurchaseService.getShopUiState()`）
2. 清 3E（双轨 runtime fallback）
3. 做 3G（restore/migration 分层）

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

## 8. R 系列整改计划（精简但保留）

| R | 状态 | 目标 |
|---|------|------|
| R1 | 🔄 进行中 | 边界清单化 + 契约断言 |
| R2 | ⏳ 待开始 | runtime 真源唯一化（对齐 3E） |
| R3 | 🔄 进行中 | shop state 单一入口（对齐 3F） |
| R4 | ⏳ 待开始 | restore/migration 分层（对齐 3G） |
| R5 | ⏳ 待开始 | 配置 fallback 清退 |
| R6 | ✅ 已落地 | UI 资源解析统一化 |
| R7 | ⏳ 待开始 | dialog / uiUtil 职责收口 |

## 9. 最小回归

- `MenuScene` / `ChooseScene` / `MainScene`
