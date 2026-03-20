# BuriedTown 渐进式重构计划

## 1. 目标

这轮计划的目标不是让新旧架构长期共存，而是用可控、可验证、可回退的方式，完成一次真正的架构替换。

这次替换最终服务的开发目标仍然只有 5 类：

- 增加人物
- 增加天赋
- 增加物品
- 增加建筑 / 建筑动作
- 增加特定机制

### 1.1 终局架构

1. **内容主数据层**
   - `roleConfigTable.js`
   - `talentConfigTable.js`
   - `itemConfig.js`
   - `buildConfig.js`
   - `buildActionConfig.js`
   - `formulaConfig.js`
   - 这些配置表最终要成为内容定义的唯一主源，不再长期并存 fallback 或平行硬编码表。

2. **规则解释 / 机制注册层**
   - `RoleRuntimeService.js`
   - `TalentService.js`
   - `BuildActionEffectService.js`
   - `PlayerAttrService.js`
   - 后续必要的机制注册服务
   - 这一层只负责解释配置、执行规则、挂接机制，不再吞主数据，也不继续扩大旧兼容职责。

3. **状态模型层**
   - `player.js`
   - `Build.js`
   - `buildAction.js`
   - `site.js`
   - 这一层只保留状态、生命周期和少量通用流程，不再承接内容特例和跨系统业务分支。

4. **装配 / UI / 兼容层**
   - `jsList.js`
   - `game.js`
   - `uiUtil.js`
   - `dialog.js`
   - 场景文件
   - 购买兼容入口
   - 这一层只负责装配、展示、转发和必要兼容，不直接做业务决策。

### 1.2 衡量标准

- 新增一个内容点时，优先改配置和局部服务，而不是继续回旧大文件补分支
- 新增内容时的改动文件数持续下降
- 高风险入口改动有固定 smoke 护栏，不再轻易把项目带进黑屏
- 旧 fallback、旧硬编码分组、旧兼容映射、旧散分支可以按阶段真实删除

## 2. 当前状态与阻碍

### 2.1 阶段总览

- `Phase 0` / `Phase 0.5` / `Phase 1`：已完成
- `Phase 2`：已完成（`BuildActionTypeRegistry` / `BuildActionFactory` 已落地，`Dog / Bomb / Bonfire` 已迁到通用模式，`runtimeRule` 已有最小 schema 校验）
- `Phase 3`：**当前主战场**，`Batch 3A / 3B / 3C` 已完成，`Batch 3D` 进行中
- `Phase 4`：暂不进入主推进；需等待 `Phase 3` 的跨边界真源问题先收住
- `Phase 7`：继续保留为次级路线，但不在 `runtime / restore / shop state` 仍双轨时抢主线

当前主线不再只是"继续清理角色 / 天赋 fallback"，而是要把 `runtime` 真源、购买链、购买 UI 状态源和 `restore / migration` 边界一起收口。

### 2.2 主要阻碍

4 个危险信号（按优先级排序）：

1. **`runtime` 真源不唯一**
   - `GameRuntime` 已建立，但 `getPlayer()` / `getTimer()` / `getEmitter()` / `getRecord()` 自身仍 fallback 回全局变量
   - 业务侧在 `GameRuntime` 之外又各自包了一层 fallback（见 2.3 双轨位置清单）
   - 这让初始化顺序、测试注入和状态归属问题长期被"还能跑"的兼容层掩盖

2. **`restore` 与 `migration` 混在同一条热路径里**
   - `PlayerPersistenceService._applyPostRestoreFixups()` 在正常读档路径里做角色推断、建筑补齐、解锁奖励校准、特殊物品保障、HP 校准
   - 后续每个兼容问题都容易再加一层 post-restore patch

3. **购买业务没有单一状态源**
   - `PurchaseService.getShopUiState()` 已能产出完整 view model
   - 但 `PurchaseUiHelper.getPurchaseUiSnapshot()` 在 `shopState` 缺失时仍有 ~60 行 fallback 重新推导解锁、价格、按钮、徽章
   - `IAPPackage` 内部仍保留大量硬编码 magic number（见 2.4 硬编码清单）

4. **配置 fallback 仍在掩盖结构问题**
   - `RoleRuntimeService._defaultConfig`、`SiteConfigService._buildFallbackConfig()` 让缺配置和半接线字段继续"默认运行"

### 2.3 双轨 runtime fallback 位置清单

以下文件在 `GameRuntime` 之外仍保留自己的全局 fallback 函数：

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

Batch 3E 的目标就是把这张表清空到只剩 `GameRuntime.js` 内部的启动期兼容。

### 2.4 残余硬编码清单

购买链内仍存在的 magic number：

| 位置 | 硬编码内容 |
|------|-----------|
| `IAPPackage.initPackage():34-49` | 逐个调用 `onIAPPaied(0,101-109,120-124)` |
| `IAPPackage.resetConsumeIAP():321-330` | 逐个重置 `_record[201-209]` |
| `PurchaseService._singleUnlockRewardMap` | `105→{itemId:1305024}`, `106→{itemId:1304024}`, `107→{bid:12}` |
| `PurchaseService.getPriceOff():342` | `(purchaseId===206\|\|purchaseId===207)?50:0` |

特殊物品散落（Phase 4 范围）：17+ 个 hardcoded itemId 分布在 13 个文件，详见 Phase 4 说明。

### 2.5 当前不该优先的部分

- 地图 / 站点链不是当前主线，除非接下来要做新站点类型、地图事件或特殊旅行规则
- 原生支付展示链需要保留兼容，但不是当前内容扩展主战场
- 战斗展示文案层可以以后再瘦身，但对"新增人物 / 天赋 / 物品 / 建筑 / 机制"的直接帮助不如前几项

### 2.6 值得继续沿现有边界扩展的部分

下面这些方向已经在往"服务 / 配置入口"收口，应该延续，而不是推倒重来：

- `PlayerAttrService.js`
- `BuildActionEffectService.js`
- `SiteConfigService.js`
- `SiteRewardService.js`
- `SiteRoomGenerator.js`
- `roleConfigTable.js`
- `talentConfigTable.js`
- `configValidator.js`

### 2.7 T版带来的补充判断

- 值得借鉴的不是旧核心实现方式，而是"侧功能独立打包"的方法
- 不值得借鉴的是页面直连业务、全局状态和存档的老写法
- 后续如果借鉴 T版，只采纳：`独立 scene/node + 局部 service/config + 文案/资源配套`、`MenuScene/dialog/bottom navigation` 作为显式入口层、最小验证和说明跟功能一起落地
- 明确不回流：页面直接读写 `localStorage`、页面直接操作全局对象完成业务决策、大段 `setTimeout` 硬编排剧情、把购买/兑换主配置放回 `data` 层

## 3. 分阶段路线

### 3.1 `Phase 0` ~ `Phase 1`（已完成）

- `Phase 0`：固定 legacy 基线，`tools/validate-content.js` 作为仓库验证主入口
- `Phase 0.5`：高风险入口护栏，`tools/run-smoke.js runtime-boundaries startup`
- `Phase 1`：内容校验覆盖扩展到 `build / build-action / role runtime rule / special item reference`

### 3.2 `Phase 2`: 建筑 / 动作链（已完成）

- 已建立 `BuildActionTypeRegistry` / `BuildActionFactory`
- `DogBuildAction`、`BombBuildAction`、`BonfireBuildAction` 已迁到通用 timed-state / fuel 注册模式
- `Build.js` 回归状态模型职责，不再直接读取当前角色
- `runtimeRule` 在 `formula` / `build-action` 上都有最小 schema 护栏
- `tools/run-smoke.js runtime-boundaries` 已覆盖 build action registry 复用与 bonfire 状态机验证

### 3.3 `Phase 3`: 角色 / 天赋 / 购买 / runtime 边界定型

- 目标：
  - 让 `RoleConfigTable` / `TalentConfigTable` 真正成为唯一配置主源
  - 把旧兼容层缩回"兼容"职责
  - 把 `runtime` 真源、购买链、shop state、`restore / migration` 一起收口
- 主要文件：
  - `assets/src/game/role.js`
  - `assets/src/game/TalentService.js`
  - `assets/src/game/IAPPackage.js`
  - `assets/src/game/PurchaseService.js`
  - `assets/src/game/GameRuntime.js`
  - `assets/src/game/PlayerPersistenceService.js`
- 退出标准：
  - `role.js` 不再保留平行 fallback 数据表 ✓
  - 新增角色主要改 `roleConfigTable.js` ✓
  - 新增天赋主要改 `talentConfigTable.js` 与天赋服务 ✓
  - 购买链只保留解锁 / 兑换 / 兼容职责
  - `GameRuntime` 成为唯一 runtime 入口
  - 商店 UI 不再重算购买业务状态
  - `restore` 与 `migration` 明确分层

### 3.4 `Phase 4`: 特殊物品 / 武器机制归口

- 目标：
  - 把散落的特殊 `itemId` / 武器行为 / 工具效果收成可追踪入口
- 当前散落实况（17+ hardcoded itemId，13 个文件）：
  - 旅行速度：`TravelService.js` — 1304024(靴子) / 1305034(摩托) / 1305044(战损摩托)
  - 武器分类：`BattleEquipmentSystem.js` — 1303022(陷阱) / 1303012,1303033,1303044(炸弹) / 1301071,1301082(电枪)
  - 子弹常量：`BattleEquipmentSystem.js` / `Battle.js` — 1305011
  - 密室修正：`site.js` — 1305064(探险家) / 1305053(手电筒)
  - 药品效果：`player.js` — 1104011(绷带) / 1104032(青霉素特殊逻辑)
  - Buff 类型：`buff.js` / `PlayerAttrService.js` — 1107012 / 1107022 / 1107032 / 1107042
  - 武器耐久映射：`WeaponCraftService.js` — 12 个 base→durable 硬编码对
  - 重量修正：`Storage.js` — 1305044
  - 购买奖励：`PurchaseService.js` / `IAPPackage.js` — 1305024 / 1304024
- 主要文件：
  - `assets/src/game/BattleEquipmentSystem.js`
  - `assets/src/game/player.js`
  - `assets/src/game/site.js`
  - `assets/src/game/TravelService.js`
  - `assets/src/game/Storage.js`
  - `assets/src/game/WeaponCraftService.js`
  - `assets/src/game/buff.js`
  - `assets/src/game/PlayerAttrService.js`
  - `assets/src/data/itemConfig.js`
- 退出标准：
  - 新增一个特殊物品 / 武器 / 工具时，有明确单一注册入口
  - 特殊机制不再默认扩散到多个运行时文件
  - `player.js` / `site.js` 更多回归状态与流程职责

### 3.5 `Phase 5`: 解锁 / 兑换 / 兼容链收口

- 目标：
  - 只处理那些会妨碍内容扩展的旧购买 / 兑换兼容逻辑
  - 不把这条链重新抬成主战场
- 退出标准：
  - 解锁 / 兑换 / 兼容语义回到单一主入口
  - 购买链只保留适配器职责，不再参与内容规则编排
  - 新增可兑换内容时，不再需要同步维护多套旧映射

### 3.6 `Phase 6`: 按需处理的次级路线

- 只在需求直接落到这些链路时再推进：
  - 地图 / 站点边界
  - 玩家生命周期外围
  - 战斗展示层瘦身
  - 商店展示与购买弹窗 UI

### 3.7 `Phase 7`: 产品化次级路线

- 定位：
  - 借鉴 T版"侧功能独立打包"方式的次级路线
  - 不替代 `Phase 3 ~ 5` 主线，只在不打断主线收口时推进
- 实施原则：
  - 每个功能包至少带齐"入口 + 文案 + 资源 + 最小状态入口 + 最小验证"
  - UI 只做展示和转发，不直接碰外围存档和 gameplay 状态
  - 新入口优先挂到已有 `MenuScene`、dialog、bottom navigation，不重排 `jsList`

1. **`Batch 7A`: 成就 / 兑换入口显性化**
   - 主行为文件：`MenuScene.js` / `MedalSceneView.js` / `shopScene.js` / `PurchaseUiHelper.js`
   - 同批不做：不重写 `medal.js` 的成就判定逻辑、不同时改购买结果解释

2. **`Batch 7B`: 关于 / 社区入口统一化**
   - 主行为文件：`MenuScene.js` / `dialog.js` / `commonUtil.js`
   - 同批不做：不改支付 SDK、不混入商店或存档逻辑

3. **`Batch 7C`: 成就 / 勋章 / dataLog 备份恢复入口**
   - 主行为文件：`radioNode.js` / `achievement.js` / `medal.js` / `dataLog.js`
   - 同批不做：不恢复 `eval` 类能力、不让 UI 直接操作 `localStorage`

4. **`Batch 7D`: 独立侧功能包模板化**
   - 主行为文件：`bottomFrame.js` / `StoryScene.js` / `dialog.js`
   - 同批不做：不直接修改 `player.js` / `site.js` 的主流程职责

- 退出标准：
  - 新增一个侧功能时，不需要同时改动多个旧核心文件
  - 菜单或导航新增入口时，业务变化主要落在局部 service / config / string

## 4. 统一约束与验证

### 4.1 什么样的改动值得做

优先做这类改动：

- 改完后，新增人物 / 天赋 / 物品 / 建筑 / 机制时，改动文件数明显减少
- 改完后，新增内容优先走配置和服务，而不是继续往旧文件堆分支
- 改完后，校验能更早发现错误

不优先做这类改动：

- 只是让结构看起来更整洁，但不改善后续新增内容的效率
- 为未来可能用到的抽象先造层
- 纯 UI 层瘦身，但对内容扩展没有直接帮助

### 4.2 统一约束

1. 不重排启动链；高风险入口只允许做兼容式薄改
2. 不新建第二套 runtime
3. 每一轮只收一个窄边界
4. 新逻辑优先收进已有服务 / 配置表，不再新增平行 helper
5. 只要新增一种内容类型，就同步补最小校验能力
6. UI 层不允许新增业务编排分支；业务决策必须走服务层，UI 只做展示和转发
7. 借鉴 T版 时，只迁移"入口与功能打包方式"，不回迁页面直写存档、全局状态和旧渠道分支
8. `GameRuntime` 是 runtime 单一入口；新 gameplay / runtime 代码不再新增对 `player`、`cc.timer`、`utils.emitter` 的双轨 fallback
9. `restore` 与 `migration` 必须分离；`PlayerPersistenceService` 不继续在正常读档热路径追加推断 / 补齐 / 补发型 fixup
10. 商店 / 购买 UI 只消费服务层 view model；`PurchaseUiHelper.js`、`uiUtil.js`、`dialog.js` 不再重新推导购买业务状态

### 4.3 高风险入口安全改法

适用范围：

- `assets/src/jsList.js`
- `assets/src/game/game.js`
- `assets/src/game/GameRuntime.js`
- `assets/src/game/player.js`
- `assets/src/game/PlayerPersistenceService.js`
- `assets/src/game/site.js`
- `assets/src/game/Build.js`
- `assets/src/game/IAPPackage.js`
- `assets/src/game/PurchaseService.js`
- `assets/src/ui/PurchaseUiHelper.js`
- `assets/src/ui/uiUtil.js`

统一方法：

- 入口文件只做稳定外壳；新逻辑优先放到已有服务或配置入口后面
- 先加兼容层，再切调用点；不一上来删旧逻辑、改顺序、换数据格式
- 先做影子运行 / 结果比对，再做行为切换；尤其是购买状态、角色映射、存档恢复链路
- 一次提交最多只允许一个高风险入口承担行为变化，其他入口只做兼容配套

文件级守则：

- `jsList.js` 只允许追加，不在同一提交里同时新增、删除、重排多个高风险脚本
- `game.js` 只允许抽离单个初始化步骤，不在同一提交里同时改初始化顺序和内容
- `GameRuntime.js` 只允许继续收口单一运行时入口，不新增第三套 runtime 读取 helper
- `player.js` 只允许按窄职责改动，`useItem`、`save/restore`、`hourly update`、`battle` 不混改
- `PlayerPersistenceService.js` 相关改动默认先区分 `migration` / `restore`，不把 repair 逻辑继续堆回正常读档链
- `site.js` 与 `Build.js` 只允许先保留 fallback / 兼容口，再逐个切调用点
- `IAPPackage.js` 与 `PurchaseService.js` 只允许先做兼容映射或影子比对，不在同一提交里同时重写映射规则、UI 状态和持久化格式
- `PurchaseUiHelper.js` 与 `uiUtil.js` 只允许消费服务层状态，不在 UI 侧复制购买 / 解锁 / 等级业务判断

### 4.4 仓库级验证

- `node tools/validate-content.js all --lang zh`
- `node tools/validate-content.js all --lang en`
- `node tools/run-smoke.js runtime-boundaries startup`
- 针对改动文件做最小语法检查

补充规则：

- 改 `Build.js` / `buildConfig.js` 时，补 `node tools/validate-content.js links build --lang zh`
- 改 `buildAction.js` / `buildActionConfig.js` 时，补 `node tools/validate-content.js links build-action --lang zh`
- 改动碰到文案或跨语言配置时，补对应 `--lang en`
- 后续若需要，可补 `role-runtime` 专项校验

### 4.5 批次推进协议

- 默认采用"积累 1 个批次 -> 自动校验 -> 人工验证 -> 再进入下一批"的节奏
- 每个批次默认覆盖同一链路内 `2 ~ 4` 个相关小改动
- 每个批次默认只允许 `1` 个高风险入口文件承担主要行为变化，最多带 `1 ~ 2` 个配套文件
- 若某类改动带有计时 / 存档恢复 / 多状态机风险，可以单独成批
- 每个批次收尾时固定执行 smoke；涉及 `build` / `build-action` 时再补 links 校验
- 每个批次结束标准：自动校验通过、明确写出人工验证清单、停在当前批次等待验证
- 任何一个批次人工验证失败：不进入下一批，只允许修复或回退
- 默认采用"1 批 1 提交"的粒度，验证通过后立即打 tag

### 4.6 内容扩展专项回归

当改动与内容扩展直接相关时，优先回归：

- 新角色可选择、可解锁、角色特性生效
- 新天赋可解锁、可选择、等级效果生效
- 新物品有图标、有文案、可获取、效果生效
- 新建筑可建造、可升级、可执行动作
- 新机制在对应服务挂点上能触发

地图 / 商店链只有在本轮真的改到时，才做完整人工回归。

## 5. `Phase 3` 记录

### 5.1 盘点结论（Step 3.1 / 3.2）

以下是 Phase 3 启动前的盘点，已按后续批次完成情况标注：

1. **`role.js`** → **已由 Batch 3A 解决**
   - `_fallbackRoleConfigTable` 已删除，`RoleConfigTable` 成为角色唯一主源
   - 保留旧键 `roleType` → 分槽键 `roleType_slot_<slot>` 的单向迁移

2. **`TalentService.js`** → **已由 Batch 3C 解决**
   - `bindIAPCompatApi()` 已删除
   - 分槽键 `chosenTalents_slot_<slot>` 已成为唯一运行时读写入口
   - 旧全局键 `chosenTalents` / `chosenTalent` 只保留单向迁移

3. **`IAPPackage.js`** → **已由 Batch 3B 解决**
   - `getExchangeIdsByPurchaseId()` 的 `108~114` / `105~107` 硬编码 fallback 映射已删除
   - `_getConfiguredExchangeIdsByPurchaseId()` 已完全通过 `ExchangeAchievementConfig + role + TalentService` 推导
   - 仍残留的问题：`resetIAPPaid()` 仍直接处理角色选择回退和存档修正

4. **`PurchaseService.js`** → **Batch 3D 继续收口**
   - 已接近统一入口形状：角色列表来自 `role.getAllRoleTypes()`，天赋列表来自 `TalentService.getTalentPurchaseIdList()`
   - 仍残留的问题：`_singleUnlockRewardMap` 硬编码 105/106/107 → 物品/建筑映射、`getPriceOff()` 硬编码 206/207 折扣

5. **架构复核仍成立的结论**：
   - `GameRuntime` 还没有成为唯一运行时入口（双轨位置见 2.3）
   - `PlayerPersistenceService._applyPostRestoreFixups()` 仍在"修存档"而不是只"还原存档"
   - `PurchaseUiHelper.getPurchaseUiSnapshot()` 仍在 UI 层重算业务（`shopState` 缺失时走 ~60 行 fallback）
   - `RoleRuntimeService._defaultConfig` / `SiteConfigService._buildFallbackConfig()` 仍在掩盖缺配置

### 5.2 `Phase 3` 分批计划

1. **`Batch 3A`: `role.js` 主表唯一化** — ✅ 已完成
   - 删除 `_fallbackRoleConfigTable`，保留旧键单向迁移
   - `RoleConfigTable` 成为角色唯一主源

2. **`Batch 3B`: 角色 / 道具兑换映射去硬编码** — ✅ 已完成
   - `getExchangeIdsByPurchaseId()` 只依赖 `ExchangeAchievementConfig`、`role`、`TalentService`
   - `IAPPackage.js` 不再维护平行 purchase→exchange 表

3. **`Batch 3C`: 天赋选择兼容收口** — ✅ 已完成
   - 分槽键成为唯一运行时读写入口
   - `bindIAPCompatApi()` 已删除

4. **`Batch 3D`: 购买链职责收边** — 🔄 进行中
   - 主行为文件：`PurchaseService.js` / `IAPPackage.js`
   - 目标：
     - 把 `PurchaseService` 固定成商店 / 购买统一入口
     - 把 `IAPPackage` 缩回 SDK 记录、兑换适配、最小 UI 状态查询职责
     - 角色 / 天赋规则 API 不再继续扩散到购买层
   - 收口原则：
     - 如果某段逻辑本质上是"规则解释"，优先回服务层
     - 如果某段逻辑本质上是"已购买 / 可兑换 / 可取消"的兼容判断，才留在购买链
   - 当前子步：
     - ✅ `RoleRuntimeService` 与 `utils.updatePayInfo()` 不再直接碰 `IAPPackage`
     - ✅ `role.isRoleUnlocked()` 优先通过 `PurchaseService` 判断角色解锁状态
     - 🔄 继续切断 runtime / gameplay 对 `IAPPackage` 的残余状态读取依赖
     - 🔄 让 `TalentService` 成为天赋效果、选择状态和运行时加成的唯一出口
   - 待清理的硬编码：
     - `IAPPackage.initPackage()` 里逐个 purchaseId 调用 `onIAPPaied`
     - `IAPPackage.resetConsumeIAP()` 里逐个重置 201-209
     - `PurchaseService._singleUnlockRewardMap` 里 105/106/107 的物品/建筑映射
     - `PurchaseService.getPriceOff()` 里 206/207 的硬编码折扣
   - 备注：如果这一批开始触碰过多奖励回收、旧存档修复或菜单商店刷新细节，可主动止步，把剩余兼容清理推迟到 `Phase 5`

5. **`Batch 3E`: runtime 真源唯一化** — ⏳ 待开始
   - 主行为文件：
     - `assets/src/game/GameRuntime.js`
     - `assets/src/game/buildAction.js`（4 个 fallback 函数）
     - `assets/src/game/site.js`（`getSiteRuntimePlayer`）
     - `assets/src/game/map.js`（2 个匿名 getter）
     - `assets/src/ui/MapActor.js`（2 个匿名 getter）
     - `assets/src/ui/MapInteractionController.js`（3 个匿名 getter）
   - 目标：
     - 让 gameplay / runtime 模块统一只通过 `GameRuntime` 取 `player`、`timer`、`emitter`、`record`
     - 把旧全局对象读取压回 `game.js` 启动层或测试适配层，不再长期停留在业务热路径
   - 同批不做：不同时重写 `TimerManager` 本身、不混改 UI 场景展示逻辑
   - 退出标准：
     - 2.3 清单中的业务文件不再直接回退到 `player`、`cc.timer`、`utils.emitter`
     - runtime 依赖缺失时，在测试或启动阶段显式暴露，而不是在业务里静默兜底

6. **`Batch 3F`: 商店 / 购买 UI 单一状态源** — 🔄 进行中
   - 主行为文件：`PurchaseService.js` / `PurchaseUiHelper.js` / `uiUtil.js` / `dialog.js` / `shopScene.js`
   - 目标：
     - 让 `PurchaseService.getShopUiState()` 成为 shop state 唯一业务主出口
     - 删除 `PurchaseUiHelper.getPurchaseUiSnapshot()` 中 `shopState` 缺失时的 ~60 行 fallback
     - 让 UI 退回展示与转发职责
   - 当前落地：
     - `PurchaseUiHelper.getPurchaseUiSnapshot()` 已删除业务 fallback，只消费 `PurchaseService.getShopUiState()`
     - `ChooseScene` / `uiUtil.js` / `MedalSceneView.js` / `topFrame.js` / `home.js` / `deathNode.js` 已收口 UI 侧的直接购买状态读取
   - 同批不做：不同时重写资源 fallback 和图标装配策略、不混改支付结果解释
   - 退出标准：商店 UI 不再重算购买业务状态

7. **`Batch 3G`: `restore / migration` 分层** — ⏳ 待开始
   - 主行为文件：`PlayerPersistenceService.js` / `RoleRuntimeService.js` / `TalentService.js` / `PurchaseService.js`
   - 目标：
     - 把 `_applyPostRestoreFixups()` 中的一次性历史兼容迁移和正常读档恢复拆成两层
     - 当前 fixup 内容：角色推断、建筑补齐(`ensureRoomBuildStates`)、解锁奖励校准(`reconcileUnlockRewardsForPlayer`)、特殊物品保障(`ensureSpecialItems`)、HP校准(`reconcilePlayerHpByTalentSelection`)
     - 禁止继续把新的兼容问题写成 post-restore fixup
   - 同批不做：不一次性重写全部存档格式、不同时改动新开局流程
   - 退出标准：
     - 正常 `restore` 只负责还原已知状态
     - 历史兼容以明确 migration 入口存在，而不是散落在正常读档热路径

### 5.3 `Phase 3` 人工回归重点

- `MenuScene -> ChooseScene`：角色列表顺序、已解锁 / 未解锁状态、当前选择角色显示正常
- `shopScene`：角色、天赋、道具的购买按钮、价格展示、取消购买按钮状态正常
- 旧存档迁移：仅有旧键 `roleType` / `chosenTalent` / `chosenTalents` 的存档仍能被读取并完成一次性迁移
- `MainScene`：角色特性、天赋选择、天赋等级效果在新开局与读档后都正常生效
- runtime 初始化 / 事件链：`GameRuntime` 提供的 `player / timer / emitter / record` 在启动后和场景切换中保持一致
- 读档后状态一致性：不再依赖隐式补齐才能让角色、初始建筑、解锁和特殊物品恢复正常

### 5.4 当前进度与下一步

- 已完成：`Batch 3A` / `Batch 3B` / `Batch 3C`
- 进行中：`Batch 3D` / `Batch 3F`
- 待开始：`Batch 3E` / `Batch 3G`

当前下一步按顺序推进：
1. 先收完 `Batch 3F`：清理商店外残留 UI 购买状态读取点，锁定 `PurchaseService.getShopUiState()` 单一状态源
2. 再进入 `Batch 3E`：清理双轨 runtime fallback（优先处理 2.3 清单）
3. 最后进入 `Batch 3G`：把 `restore` 与 `migration` 拆开

在 `Batch 3E ~ 3G` 没有稳定前，不插入 `Batch 7B`。

## 6. 重构整改计划（新增）

### 6.1 目标（与现有 Phase 并行推进）

- 让模块边界可读、可测、可执行，不再依赖脚本顺序和隐式全局兜底
- 让职责真正落位：配置 → 服务 → 状态模型 → UI/装配
- 让接口稳定：关键服务 API 有固定契约与最小 smoke 护栏
- 让系统收敛：减少 fallback、减少平行状态源、减少 UI 侧业务推导

### 6.2 整改范围与落地原则

- 整改范围仅覆盖影响“新增人物/天赋/物品/建筑/机制”的关键链路
- 所有整改都必须能对应到现有 Phase 或 Batch，避免另起平行主线
- 高风险入口只允许做薄改或兼容式切换，禁止大改序或多点重写
- 新增或变更接口必须同步补最小契约验证

### 6.3 整改批次（R 系列，与 Phase 3/4 对齐）

1. **R1：边界清单化与接口契约冻结** — 🔄 已启动
   交付物：关键服务与核心入口的接口清单、责任归属表、最小契约断言。
   当前落地：
   - `tools/run-smoke.js runtime-boundaries startup`：执行高价值 smoke 护栏
   - `tools/precommit/run-tests.js`：提交前默认跑高价值 smoke
   覆盖对象：`GameRuntime`、`RoleRuntimeService`、`TalentService`、`BuildActionEffectService`、`PurchaseService`、`PlayerPersistenceService`。
   下一步：
   - 补充 `RoleRuntimeService` / `BuildActionEffectService` 的行为级边界断言
   - 在 `R2 ~ R4` 推进时，继续把高风险回归收进 `runtime-boundaries`
   验收标准：高风险入口与现有 smoke 同步，新增高风险入口必须先补最小断言。

2. **R2：runtime 真源唯一化（对应 Batch 3E）**
   动作要点：清理 2.3 清单中的 fallback；所有运行时依赖统一经 `GameRuntime` 获取。
   验收标准：业务文件不再直接回退到 `player` / `cc.timer` / `utils.emitter`。

3. **R3：商店 UI 单一状态源（对应 Batch 3F）** — 🔄 进行中
   动作要点：UI 仅消费 `PurchaseService.getShopUiState()`；删除 UI 侧重算逻辑。
   验收标准：`PurchaseUiHelper.getPurchaseUiSnapshot()` 不再有业务 fallback。

4. **R4：restore / migration 分层（对应 Batch 3G）**
   动作要点：`PlayerPersistenceService` 只还原状态；历史兼容迁移走独立入口。
   验收标准：正常读档路径不再承担修复与补偿逻辑。

5. **R5：配置 fallback 清退（对应 Phase 4 之前的收口）**
   动作要点：逐步移除 `RoleRuntimeService._defaultConfig`、`SiteConfigService._buildFallbackConfig` 的常驻兜底。
   验收标准：缺配置直接暴露，规则解释必须依赖主配置表。

### 6.4 验收指标（每批次都要对照）

- 新增内容时，改动文件数量下降且集中在配置与服务层
- 高风险入口的改动必须被 smoke 覆盖
- 业务侧不新增新的 fallback 或平行状态源
- UI 层不新增业务判断分支

### 6.5 风险与回退策略

- 触碰高风险入口时，优先采用影子函数比对与渐进切换
- 一次提交只允许一个高风险入口承担主要行为变化
- 每批次结束必须有最小人工回归清单与清晰回退点
