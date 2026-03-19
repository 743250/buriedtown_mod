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

## 2. 当前判断

### 2.1 当前状态

- `Phase 0` / `Phase 1` 基线已经基本稳定，`tools/validate-content.js` 已覆盖主要内容扩展链路
- `Phase 0.5` 的两层护栏已经落地，`tools/smoke-runtime-boundaries.js` 与 `tools/smoke-startup.js` 已可用于高风险入口冒烟
- `Phase 2` 的退出条件已基本达成：`BuildActionTypeRegistry` / `BuildActionFactory` 已落地，`Dog / Bomb / Bonfire` 已迁到通用模式，`runtimeRule` 已有最小 schema 校验
- 当前下一步应切到 `Phase 3`，但前提是不回灌 `Phase 2` 的旧特例，并继续维持现有 links + smoke 护栏

### 2.2 主要阻碍

1. **`role.js` 仍保留 fallback 角色表与旧选择兼容口**
   - `RoleConfigTable` 已能承接主配置，但 `role.js` 仍保留 `_fallbackRoleConfigTable`
   - 角色选择、角色文案回退、购买映射仍混在同一层里
   - 如果不继续收口，新增角色时仍容易把改动拉回旧兼容分支

2. **角色 / 天赋边界仍被旧购买兼容链牵制**
   - `role.js` 仍有 fallback
   - `TalentService.js` 仍承担选择存储 fallback 与兼容杂活
   - `IAPPackage.js` / `PurchaseService.js` 仍知道太多角色 / 天赋业务细节

3. **特殊物品 / 武器机制散落在多个运行时文件**
   - 特殊 `itemId`、武器效果、旅行加成、掉落效果等没有单一注册入口
   - 继续这样下去，新增一个“特殊物品”仍会演化成全仓库追踪

4. **配置层 schema 级校验仍需继续跟进**
   - `formulaConfig` / `buildActionConfig` 的 `runtimeRule` 已有最小 schema 校验
   - 但后续新增机制字段时，仍需要同步把约束补进 validator，而不是继续依赖“约定驱动”

5. **UI 仍承担了一部分业务编排**
   - `uiUtil.js`、`dialog.js` 还在直接碰玩家、购买、天赋和建筑逻辑
   - 这会把本应收进服务层的变化再次拖回 UI 分支

### 2.3 当前不该优先的部分

- 地图 / 站点链不是当前主线，除非接下来要做新站点类型、地图事件或特殊旅行规则
- 原生支付展示链需要保留兼容，但不是当前内容扩展主战场
- 战斗展示文案层可以以后再瘦身，但对“新增人物 / 天赋 / 物品 / 建筑 / 机制”的直接帮助不如前几项

### 2.4 值得继续沿现有边界扩展的部分

下面这些方向已经在往“服务 / 配置入口”收口，应该延续，而不是推倒重来：

- `PlayerAttrService.js`
- `BuildActionEffectService.js`
- `SiteConfigService.js`
- `SiteRewardService.js`
- `SiteRoomGenerator.js`
- `roleConfigTable.js`
- `talentConfigTable.js`
- `configValidator.js`

### 2.5 T版带来的补充判断

- 这次对 `T版游戏assets` 的对比结论很明确：
  - 值得借鉴的不是旧核心实现方式，而是“侧功能独立打包”的方法
  - 不值得借鉴的是页面直连业务、全局状态和存档的老写法
- 对当前仓库最有价值的 4 类经验：
  - 一个侧功能尽量带齐入口、文案、资源、最小状态入口和最小说明，而不是只补一个页面
  - 成就 / 兑换、关于 / 社区、备份 / 恢复、特殊剧情页 / 商人页这类功能，适合做成低耦合独立功能包
  - 菜单 / 导航上的入口要可发现，不能只让能力存在于底层 service 或隐藏按钮
  - 外围功能的数据导入导出应有正式入口，而不是长期依赖散落在旧页面里的临时逻辑
- 后续如果借鉴 T版，只采纳这些“方式”：
  - `独立 scene / node + 局部 service / config + 文案 / 资源配套`
  - `MenuScene / dialog / bottom navigation` 作为显式入口层
  - 最小验证和说明跟功能一起落地
- 明确不回流的旧做法：
  - 页面直接读写 `localStorage`
  - 页面直接操作 `player`、`Achievement`、`Medal` 等全局对象完成业务决策
  - 用大段 `setTimeout` + 显隐脚本硬编排剧情流转
  - 把购买 / 兑换主配置重新放回 `data` 层
- 当前仓库在 `medal.js`、`MedalSceneView.js`、`PurchaseService.js` 这一层已经比 T版更适合作为长期维护基座
  - 因此后续重点应放在“入口与打包完整性”补强，而不是回退实现层

## 3. 分阶段路线

### 3.1 `Phase 0`: 基线与工具主入口固定

- 目标：
  - 固定当前 legacy 基线
  - 固定仓库级验证主入口
  - 明确哪些旧层只做兼容，不再继续放大
- 主入口：
  - `tools/validate-content.js`
- 退出标准：
  - `tools/validate-content.js` 仍是默认仓库验证入口
  - 不再新增平行的“临时主校验脚本”

### 3.2 `Phase 0.5`: 高风险入口护栏

- 目标：
  - 给高风险入口建立固定的安全改法
  - 给启动链建立最小可重复冒烟验证
- 主入口：
  - `tools/smoke-runtime-boundaries.js`
  - `tools/smoke-startup.js`
- 退出标准：
  - 高风险入口改动前后都能跑最小仓库级 smoke
  - 启动链至少覆盖 `jsList`、`game.init()`、`MenuScene / ChooseScene / MainScene` 可达性

### 3.3 `Phase 1`: 内容校验覆盖扩展

- 目标：
  - 把校验重点扩到 `build / build-action / role runtime rule / special item reference`
  - 给最常新增的内容链建立最小可用校验
- 主要文件：
  - `tools/validate-content.js`
  - `tools/lib/content-validator.js`
  - `contentBlueprint.js`
  - `configValidator.js`
- 退出标准：
  - 能校验建筑配置里的 `condition / cost / produceList / build refs`
  - 能校验建筑动作配置里的 `cost / produce / effect`
  - 能校验角色运行时配置里的 `roomBuilds / unlockSites / unlockNpcs / specialItems / zipline`
  - 校验失败能明确指出 `id` 和来源文件

### 3.4 `Phase 2`: 建筑 / 动作链

- 目标：
  - 在 `buildAction.js` 中建立通用动作类型注册机制
  - 先把 `Build.js` 的内容特例读取口迁出，再迁移现有特例动作
- 主要文件：
  - `assets/src/game/buildAction.js`
  - `assets/src/game/Build.js`
  - `assets/src/game/RoleRuntimeService.js`
  - `assets/src/data/buildConfig.js`
  - `assets/src/data/buildActionConfig.js`
  - `assets/src/data/formulaConfig.js`
- 退出标准：
  - 新增普通建筑动作时，不需要手写新 class，也不需要改 `Build.js`
  - `DogBuildAction`、`BombBuildAction`、`BonfireBuildAction` 已迁到通用模式
  - `Build.js` 回归状态模型职责
  - `RoleRuntimeService.js` 主要负责解释配置和运行时上下文
  - `runtimeRule` 在校验工具里有最小 schema 校验
- 退场对象：
  - `Build.js` 中不属于状态模型职责的建筑内容特例
  - `buildAction.js` 中各自独立的特例动作 class
  - `RoleRuntimeService.js` 中残留的角色特定硬编码

### 3.5 `Phase 3`: 角色 / 天赋边界定型

- 目标：
  - 让 `RoleConfigTable` / `TalentConfigTable` 真正成为唯一配置主源
  - 把旧兼容层缩回“兼容”职责
- 主要文件：
  - `assets/src/game/role.js`
  - `assets/src/game/TalentService.js`
  - `assets/src/game/IAPPackage.js`
  - `assets/src/game/PurchaseService.js`
- 前置条件：
  - `Phase 2` 退出标准全部达成
  - `IAPPackage.js` 的接口边界已先梳理清楚
- 退出标准：
  - `role.js` 不再保留平行 fallback 数据表
  - 新增角色主要改 `roleConfigTable.js`
  - 新增天赋主要改 `talentConfigTable.js` 与天赋服务
  - 购买链只保留解锁 / 兑换 / 兼容职责

### 3.6 `Phase 4`: 特殊物品 / 武器机制归口

- 目标：
  - 把散落的特殊 `itemId` / 武器行为 / 工具效果收成可追踪入口
- 主要文件：
  - `assets/src/game/BattleEquipmentSystem.js`
  - `assets/src/game/player.js`
  - `assets/src/game/site.js`
  - `assets/src/game/TravelService.js`
  - `assets/src/game/Storage.js`
  - `assets/src/game/PlayerPersistenceService.js`
  - `assets/src/game/WeaponCraftService.js`
  - `assets/src/data/itemConfig.js`
- 退出标准：
  - 新增一个特殊物品 / 武器 / 工具时，有明确单一注册入口
  - 特殊机制不再默认扩散到多个运行时文件
  - `player.js` / `site.js` 更多回归状态与流程职责

### 3.7 `Phase 5`: 解锁 / 兑换 / 兼容链收口

- 目标：
  - 只处理那些会妨碍内容扩展的旧购买 / 兑换兼容逻辑
  - 不把这条链重新抬成主战场
- 主要文件：
  - `assets/src/game/IAPPackage.js`
  - `assets/src/game/PurchaseService.js`
  - `assets/src/game/TalentService.js`
  - `assets/src/game/role.js`
- 退出标准：
  - 解锁 / 兑换 / 兼容语义回到单一主入口
  - 购买链只保留适配器职责，不再参与内容规则编排
  - 新增可兑换内容时，不再需要同步维护多套旧映射

### 3.8 `Phase 6`: 按需处理的次级路线

- 只在需求直接落到这些链路时再推进：
  - 地图 / 站点边界
  - 玩家生命周期外围
  - 战斗展示层瘦身
  - 商店展示与购买弹窗 UI

### 3.9 `Phase 7`: 产品化次级路线

- 定位：
  - 这是借鉴 T版“侧功能独立打包”方式的次级路线
  - 不替代 `Phase 3 ~ 5` 主线，只在不打断主线收口时推进
- 目标：
  - 沿当前服务 / 配置边界，把外围功能做成可发现、可维护、可验证的独立功能包
  - 优先补强“入口与打包完整性”，而不是回退到旧式页面直写业务
- 主要文件：
  - `assets/src/ui/MenuScene.js`
  - `assets/src/ui/dialog.js`
  - `assets/src/ui/MedalSceneView.js`
  - `assets/src/ui/radioNode.js`
  - `assets/src/ui/bottomFrame.js`
  - 必要时新增局部 service / config / string 入口
- 实施原则：
  - 每个功能包至少带齐“入口 + 文案 + 资源 + 最小状态入口 + 最小验证”
  - UI 只做展示和转发，不直接碰外围存档和 gameplay 状态
  - 新入口优先挂到已有 `MenuScene`、dialog、bottom navigation，不重排 `jsList`
  - 涉及导出 / 恢复时，先抽 service 或工具入口，再接 UI

1. **`Batch 7A`: 成就 / 兑换入口显性化**
   - 主行为文件：
     - `assets/src/ui/MenuScene.js`
     - `assets/src/ui/MedalSceneView.js`
     - `assets/src/ui/shopScene.js`
     - `assets/src/ui/PurchaseUiHelper.js`
   - 目标：
     - 把已有成就 / 兑换能力做成更明确的菜单与场景入口
     - 让玩家能在 `MenuScene` 和成就页中更直接理解“成就点 -> 兑换”的关系
   - 同批不做：
     - 不重写 `medal.js` 的成就判定逻辑
     - 不在同一批里同时改购买结果解释

2. **`Batch 7B`: 关于 / 社区入口统一化**
   - 主行为文件：
     - `assets/src/ui/MenuScene.js`
     - `assets/src/ui/dialog.js`
     - `assets/src/plugin/commonUtil.js`
   - 配套文件：
     - `assets/src/data/clientData.js`
     - 必要时新增局部配置文件
   - 目标：
     - 把“关于、社区、更新说明、外链”从散点按钮和渠道分支收成单一维护入口
     - 让对外信息页成为正式内容页 / 弹窗，而不是继续散落在页面分支里
   - 同批不做：
     - 不改支付 SDK
     - 不在同一批里混入商店或存档逻辑

3. **`Batch 7C`: 成就 / 勋章 / dataLog 备份恢复入口**
   - 主行为文件：
     - `assets/src/ui/radioNode.js`
     - `assets/src/game/achievement.js`
     - `assets/src/game/medal.js`
     - `assets/src/util/dataLog.js`
   - 配套文件：
     - 必要时新增独立 transfer / import-export service
   - 目标：
     - 为成就、勋章、外围日志建立正式导出 / 恢复入口
     - 把这条链从页面内临时逻辑收成可校验、可复用的独立能力
   - 同批不做：
     - 不恢复 `eval` 类能力
     - 不让 UI 直接操作 `localStorage` 完成校验和恢复

4. **`Batch 7D`: 独立侧功能包模板化**
   - 主行为文件：
     - `assets/src/ui/bottomFrame.js`
     - `assets/src/ui/StoryScene.js`
     - `assets/src/ui/dialog.js`
   - 配套文件：
     - 对应 feature config / string / asset
   - 目标：
     - 沉淀一个可复用的“特殊商人 / 剧情结局页 / 一次性事件页”落地模板
     - 后续新增侧功能时，优先复用模板，不再回旧核心补一次性分支
   - 同批不做：
     - 不直接修改 `player.js` / `site.js` 的主流程职责

- 退出标准：
  - 新增一个侧功能时，不需要同时改动多个旧核心文件
  - 菜单或导航新增入口时，业务变化主要落在局部 service / config / string
  - 关于 / 社区、成就入口、外围数据导出恢复不再依赖散落的页面内临时逻辑

## 4. `Phase 2` 收口记录

### 4.1 为什么 `Phase 2` 是当前第一优先级

- 以后最容易被反复改到的是建筑 / 动作链
- 这条链已经从“三个文件都很乱”收窄成一个核心问题：`buildAction.js` 没有可扩展的动作注册机制
- 只要这里不收住，后面“新增建筑动作 / 新增特定机制”就还会退回到手写 class + 手工接入

### 4.2 已有可复用参照

- `createTimedEffectBuildAction(type, config)`
  - 已经为 `Rest / Drink / DrinkTea / Smoke` 提供了共用 `_run()` / `_finish()` / `save()` / `restore()` 模板
  - 这是通用动作注册模式最直接的参照
- `Formula`
  - 已经证明“配置驱动 + 通用生命周期管理”可以覆盖高频动作类型
- `formulaConfig.runtimeRule`
  - 已经证明动作显隐规则可以从硬编码迁到配置

### 4.3 通用动作注册模式必须回答的问题

- 新增一种动作类型时，需要提供哪些配置 shape 和行为钩子
- 框架负责哪些通用能力，例如生命周期、`save()` / `restore()`、UI 按钮接入、计时管理、状态恢复
- 特殊状态机如何挂钩，例如篝火温度 / 燃料、炸弹一次性激活、狗舍喂养周期

### 4.4 当前批次拆解

1. **批次 A：`Build.js` 读取口收口**
   - 已完成
   - 重点成果：
     - `concurrentActionLimit` 已迁到 `buildConfig`
     - 通电相关读取口已迁到 `buildConfig.requirePoweredWorksite`
     - 休息动作与 `Room.init()` 的角色读取口已迁到服务 / 工厂侧
     - `Build.js` 已不再直接读取当前角色

2. **批次 B：建立通用动作注册模式**
   - 已完成
   - 重点成果：
     - 批量制作上限、单次制作入口、陷阱制作入口已统一收进 `Formula`
     - `BuildActionTypeRegistry` 已建立
     - 公式动作和休息类动作已走显式动作类型入口

3. **批次 C：迁移轻量特例到通用模式**
   - 已完成
   - 目标：
     - `DogBuildAction` 迁移到通用模式
     - `BombBuildAction` 迁移到通用模式
   - 重点成果：
     - `registerTimedStateBuildActionType("dog", ...)` 已接管狗舍主动作
     - `registerTimedStateBuildActionType("bomb", ...)` 已接管炸弹主动作
   - 判断原则：
     - 如果模式不够用，就扩展模式
     - 不再保留“收口后依旧独立存在的特例 class”

4. **批次 D：迁移重状态动作到通用模式**
   - 已完成
   - 目标：
     - `BonfireBuildAction` 迁移到通用模式
   - 重点成果：
     - `registerFuelBuildActionType("bonfire", ...)` 已接管篝火状态机
     - `tools/smoke-runtime-boundaries.js` 已覆盖 bonfire save/restore 与燃料状态验证
   - 这是注册模式的压力测试；篝火已被覆盖，`Phase 2` 的架构目标可视为成立

### 4.5 当前下一步

- `Phase 2` 可视为已收口完成
- 下一步进入 `Phase 3`
- 第一小步建议是 `Step 3.1`：清点 `role.js` fallback 与 `IAPPackage.js` / `PurchaseService.js` 的角色映射边界

## 5. 统一约束与验证

### 5.1 什么样的改动值得做

优先做这类改动：

- 改完后，新增人物 / 天赋 / 物品 / 建筑 / 机制时，改动文件数明显减少
- 改完后，新增内容优先走配置和服务，而不是继续往旧文件堆分支
- 改完后，校验能更早发现错误

不优先做这类改动：

- 只是让结构看起来更整洁，但不改善后续新增内容的效率
- 为未来可能用到的抽象先造层
- 纯 UI 层瘦身，但对内容扩展没有直接帮助

### 5.2 统一约束

1. 不重排启动链；高风险入口只允许做兼容式薄改
2. 不新建第二套 runtime
3. 每一轮只收一个窄边界
4. 新逻辑优先收进已有服务 / 配置表，不再新增平行 helper
5. 只要新增一种内容类型，就同步补最小校验能力
6. UI 层不允许新增业务编排分支；业务决策必须走服务层，UI 只做展示和转发
7. 借鉴 T版 时，只迁移“入口与功能打包方式”，不回迁页面直写存档、全局状态和旧渠道分支

### 5.3 高风险入口安全改法

适用范围：

- `assets/src/jsList.js`
- `assets/src/game/game.js`
- `assets/src/game/player.js`
- `assets/src/game/site.js`
- `assets/src/game/Build.js`
- `assets/src/game/IAPPackage.js`
- `assets/src/game/PurchaseService.js`

统一方法：

- 入口文件只做稳定外壳；新逻辑优先放到已有服务或配置入口后面
- 先加兼容层，再切调用点；不一上来删旧逻辑、改顺序、换数据格式
- 先做影子运行 / 结果比对，再做行为切换；尤其是购买状态、角色映射、存档恢复链路
- 一次提交最多只允许一个高风险入口承担行为变化，其他入口只做兼容配套

文件级守则：

- `jsList.js` 只允许追加，不在同一提交里同时新增、删除、重排多个高风险脚本
- `game.js` 只允许抽离单个初始化步骤，不在同一提交里同时改初始化顺序和内容
- `player.js` 只允许按窄职责改动，`useItem`、`save/restore`、`hourly update`、`battle` 不混改
- `site.js` 与 `Build.js` 只允许先保留 fallback / 兼容口，再逐个切调用点
- `IAPPackage.js` 与 `PurchaseService.js` 只允许先做兼容映射或影子比对，不在同一提交里同时重写映射规则、UI 状态和持久化格式

### 5.4 仓库级验证

- `node tools/validate-content.js all --lang zh`
- `node tools/validate-content.js all --lang en`
- `node tools/smoke-runtime-boundaries.js`
- `node tools/smoke-startup.js`
- 针对改动文件做最小语法检查

补充规则：

- 改 `Build.js` / `buildConfig.js` 时，补 `node tools/validate-content.js links build --lang zh`
- 改 `buildAction.js` / `buildActionConfig.js` 时，补 `node tools/validate-content.js links build-action --lang zh`
- 改动碰到文案或跨语言配置时，补对应 `--lang en`
- 后续若需要，可补 `role-runtime` 专项校验

### 5.5 批次推进协议

- 默认采用“积累 1 个批次 -> 自动校验 -> 人工验证 -> 再进入下一批”的节奏
- 每个批次默认覆盖同一链路内 `2 ~ 4` 个相关小改动
- 每个批次默认只允许 `1` 个高风险入口文件承担主要行为变化
- 最多带 `1 ~ 2` 个配套文件一起改
- 若某类改动带有计时 / 存档恢复 / 多状态机风险，可以单独成批
- 每个批次收尾时固定执行 smoke；涉及 `build` / `build-action` 时再补 links 校验
- 每个批次结束标准：
  - 自动校验通过
  - 明确写出人工验证清单
  - 停在当前批次，等待验证结果
- 任何一个批次人工验证失败：
  - 不进入下一批
  - 只允许在当前批次内修复或直接回退当前批次
- 默认采用“1 批 1 提交”的粒度
- 每个批次验证通过后立即打 tag，例如 `phase2-batchA`

### 5.6 额外验证建议

- `BonfireBuildAction` 这类多状态机动作的最小状态验证已并入 `tools/smoke-runtime-boundaries.js`
- 已覆盖：
  - 初始状态 -> 加燃料 -> 燃烧中 -> 燃尽
  - `save()` -> `restore()` 后状态一致
- 后续若再新增多状态建筑动作，沿同一 smoke 入口继续扩展，而不是另起平行脚本

### 5.7 内容扩展专项回归

当改动与内容扩展直接相关时，优先回归：

- 新角色可选择、可解锁、角色特性生效
- 新天赋可解锁、可选择、等级效果生效
- 新物品有图标、有文案、可获取、效果生效
- 新建筑可建造、可升级、可执行动作
- 新机制在对应服务挂点上能触发

地图 / 商店链只有在本轮真的改到时，才做完整人工回归。

## 6. 当前真实状态与下一步

### 6.1 当前状态

- `Phase 0`：可视为已完成
- `Phase 0.5`：高风险入口 smoke 已落地，后续入口改动默认先过护栏
- `Phase 1`：可视为已完成，`build` / `build-action` / `role` 运行时配置边界已有基础校验
- `Phase 2`：可视为已完成，退出标准已达成
- `Phase 3`：下一主战场，建议先从角色 fallback 与购买兼容边界清点开始
- `Phase 7`：已立项为次级路线，用于承接 T版 值得保留的产品化做法，但不抢当前主线

### 6.2 `Phase 2` 已完成内容

- `RoleRuntimeService._buildActionVisibilityGroups` 已清空，动作显隐规则已迁到 `formulaConfig.runtimeRule`
- `Build.js` 当前角色读取口已清空
- 公式动作和休息类动作已切到显式动作类型入口
- `BuildActionTypeRegistry` 已建立
- `DogBuildAction`、`BombBuildAction`、`BonfireBuildAction` 已分别迁到通用 timed-state / fuel 注册模式
- `buildActionConfig.runtimeRule` 已接入内容校验，`runtimeRule` 在 `formula` / `build-action` 上都有最小 schema 护栏
- `tools/smoke-runtime-boundaries.js` 已覆盖 build action registry 复用与 bonfire 状态机验证

### 6.3 当前剩余工作

- 进入 `Phase 3`，把 `role.js` 的 fallback 角色表与旧选择兼容口继续收窄
- 梳理 `TalentService.js`、`IAPPackage.js`、`PurchaseService.js` 的角色 / 天赋 / 解锁职责边界
- 在不破坏现有 smoke 的前提下，逐步把购买链缩回“解锁 / 兑换 / 兼容适配”职责

### 6.4 当前下一步

- `Step 3.1` 的盘点已完成，结论见第 `7` 节
- `Batch 3A` 已完成：`role.js` 的并行 fallback 角色表已删除，旧 `roleType` 键只保留到分槽键的单向迁移
- `Batch 3B` 已完成：`IAPPackage.js` 的角色 / 道具兑换硬编码 fallback 映射已删除，purchase->exchange 关系已由配置驱动并补了 smoke
- `Batch 3C` 已完成：`TalentService.js` 的运行时读写已收敛到 `chosenTalents_slot_<slot>`，旧全局键与 `chosenTalent_slot_<slot>` 只保留迁移职责
- `Batch 3D` 已开始：`RoleRuntimeService`、`utils.updatePayInfo()` 与 `role.isRoleUnlocked()` 已去掉对 `IAPPackage` / `Medal` 的直接读取或解释依赖，外围购买状态统一回 `PurchaseService`
- 当前下一步继续 `Batch 3D`：把剩余 runtime / gameplay 侧的购买状态读取继续收口到 `PurchaseService`，避免新逻辑再越过服务层碰 `IAPPackage`
- 如果主线间隙要插入一个低风险产品化批次，优先 `Batch 7B`
  - 原因：它主要涉及 `MenuScene`、`dialog`、`commonUtil` 和局部配置，不直接触碰 gameplay 主链

## 7. `Phase 3` 启动记录

### 7.1 `Step 3.1` 盘点结论

1. **`role.js`**
   - `_fallbackRoleConfigTable` 仍在文件内保留，但 `assets/src/jsList.js` 已保证 `src/data/roleConfigTable.js` 先于 `src/game/role.js` 加载
   - 这张 fallback 表现在更像“启动期兜底遗留”，不再是正常内容扩展入口；而且它只覆盖基础展示字段，不覆盖 `RoleConfigTable` 里已经在使用的 `roomBuilds / unlockSites / unlockNpcs / battleModifiers / zipline` 等字段
   - 仍然真正有兼容价值的不是这张表，而是角色选择存储迁移：当前主键是 `roleType_slot_<slot>`，旧键 `roleType` 只是单存档时代的回退口

2. **`TalentService.js`**
   - 已没有平行天赋主表 fallback，主数据实际上已经完全来自 `TalentConfigTable`
   - 当前保留的兼容主要有两类：
     - 旧全局键 `chosenTalents` / `chosenTalent`
     - 当前分槽键之外的单选镜像键 `chosenTalent_slot_<slot>`
   - `bindIAPCompatApi(IAPPackage)` 说明购买层仍在对外暴露大量天赋规则 API，这条边界还没有真正收回“兼容层”

3. **`IAPPackage.js`**
   - `_getConfiguredExchangeIdsByPurchaseId()` 已经能通过 `ExchangeAchievementConfig + role + TalentService` 推导角色 / 天赋 / 道具兑换关系
   - `getExchangeIdsByPurchaseId()` 仍保留 `108~114`、`105~107` 的硬编码 fallback 映射；这是 `Phase 3` 最适合继续删除的一段 legacy
   - `resetIAPPaid()` 仍直接处理角色选择回退、单次解锁奖励回收、部分存档修正，说明购买兼容层还握着一部分内容副作用

4. **`PurchaseService.js`**
   - 当前已经接近薄服务：角色购买列表来自 `role.getAllRoleTypes()`，天赋购买列表来自 `TalentService.getTalentPurchaseIdList()`
   - 这说明它已经具备承接统一入口的形状；现阶段不该优先重写 `PurchaseService.js`，而应先清掉 `IAPPackage.js` 里仍然硬编码的角色 / 天赋语义

### 7.2 `Phase 3` 分批建议

1. **`Batch 3A`: `role.js` 主表唯一化**
   - 状态：
     - 已完成
   - 主行为文件：
     - `assets/src/game/role.js`
   - 配套文件：
     - `assets/src/data/roleConfigTable.js`
   - 目标：
     - 删除 `_fallbackRoleConfigTable`
     - 保留旧键 `roleType` -> 分槽键 `roleType_slot_<slot>` 的单向迁移
     - `role.js` 不再维护平行角色数据，只负责读取配置、选择状态和少量兼容
   - 同批不做：
     - 不改 `assets/src/jsList.js` 顺序
     - 不在同一批里同时改角色购买逻辑和 `ChooseScene` 展示逻辑
   - 退出标准：
     - `RoleConfigTable` 成为角色唯一主源
     - 新增角色时不再需要同步维护 `role.js` 内部表

2. **`Batch 3B`: 角色 / 道具兑换映射去硬编码**
   - 状态：
     - 已完成
   - 主行为文件：
     - `assets/src/game/IAPPackage.js`
   - 配套文件：
     - `assets/src/game/PurchaseService.js`
     - 必要时补 `tools/validate-content.js` / `tools/lib/content-validator.js` 的最小 purchase-exchange 断链校验
   - 目标：
     - 让 `getExchangeIdsByPurchaseId()` 只依赖 `ExchangeAchievementConfig`、`role`、`TalentService`
     - 删除 `108~114`、`105~107` 的硬编码映射 fallback
     - 继续保留取消兑换、奖励回收等兼容行为，不在同一批里重写
   - 同批不做：
     - 不同时重写 `resetIAPPaid()` 的副作用分支
     - 不同时改支付 SDK 结果解释
   - 退出标准：
     - 角色 / 天赋 / 道具兑换关系可以从配置和服务侧反查
     - `IAPPackage.js` 不再维护平行 purchase->exchange 表

3. **`Batch 3C`: 天赋选择兼容收口**
   - 状态：
     - 已完成
   - 主行为文件：
     - `assets/src/game/TalentService.js`
   - 配套文件：
     - `assets/src/game/IAPPackage.js`
   - 目标：
     - 让分槽键成为唯一运行时读写入口
     - 旧键 `chosenTalents` / `chosenTalent` 只保留单向迁移职责
     - 评估 `chosenTalent_slot_<slot>` 单选镜像是否仍有旧 UI 依赖，确认后再删除或继续薄兼容
     - 禁止继续向 `bindIAPCompatApi()` 增加新的 gameplay API
   - 同批不做：
     - 不在同一批里混改天赋数值效果和选择存储
     - 不在同一批里重写三级奖励逻辑
   - 退出标准：
     - `TalentConfigTable + TalentService` 成为天赋主入口
     - 旧键只承担迁移，不再参与长期状态读取

4. **`Batch 3D`: 购买链职责收边**
   - 状态：
     - 进行中
   - 主行为文件：
     - `assets/src/game/PurchaseService.js`
     - `assets/src/game/IAPPackage.js`
   - 目标：
     - 把 `PurchaseService` 固定成商店 / 购买统一入口
     - 把 `IAPPackage` 缩回 SDK 记录、兑换适配、最小 UI 状态查询职责
     - 角色 / 天赋规则 API 不再继续扩散到购买层
   - 收口原则：
     - 如果某段逻辑本质上是“规则解释”，优先回服务层
     - 如果某段逻辑本质上是“已购买 / 可兑换 / 可取消”的兼容判断，才留在购买链
   - 当前子步：
     - 已完成：`RoleRuntimeService` 与 `utils.updatePayInfo()` 不再直接碰 `IAPPackage`
     - 已完成：`role.isRoleUnlocked()` 优先通过 `PurchaseService` 判断角色解锁状态，不再在人物层直接解释兑换结果
     - 继续切断 runtime / gameplay 对 `IAPPackage` 的残余状态读取依赖
     - 让 `TalentService` 成为天赋效果、选择状态和运行时加成的唯一出口
     - 让 `PurchaseService` 成为商店 / 解锁入口，`IAPPackage` 只保留购买记录、兑换适配和必要商店状态职责
   - 备注：
     - 如果这一批开始触碰过多奖励回收、旧存档修复或菜单商店刷新细节，可主动止步，把剩余兼容清理推迟到 `Phase 5`

### 7.3 `Phase 3` 默认验证

- `Batch 3A` 默认执行：
  - `node tools/validate-content.js links role --lang zh`
  - `node tools/validate-content.js links role --lang en`
  - `node tools/validate-content.js checklist role 1 --lang zh`
  - `node tools/smoke-startup.js`

- `Batch 3B` 默认执行：
  - `node tools/validate-content.js links role --lang zh`
  - `node tools/validate-content.js links talent --lang zh`
  - `node tools/smoke-runtime-boundaries.js`
  - `node tools/smoke-startup.js`

- `Batch 3C` 默认执行：
  - `node tools/validate-content.js links talent --lang zh`
  - `node tools/validate-content.js links talent --lang en`
  - `node tools/validate-content.js checklist talent 120 --lang zh`
  - `node tools/smoke-startup.js`

- `Batch 3D` 默认执行：
  - `node tools/validate-content.js all --lang zh`
  - `node tools/validate-content.js all --lang en`
  - `node tools/smoke-runtime-boundaries.js`
  - `node tools/smoke-startup.js`

### 7.4 `Phase 3` 人工回归重点

- `MenuScene -> ChooseScene`
  - 角色列表顺序、已解锁 / 未解锁状态、当前选择角色显示正常
- `shopScene`
  - 角色、天赋、道具的购买按钮、价格展示、取消购买按钮状态正常
- 旧存档迁移
  - 仅有旧键 `roleType` / `chosenTalent` / `chosenTalents` 的存档仍能被读取，并完成一次性迁移
- `MainScene`
  - 角色特性、天赋选择、天赋等级效果在新开局与读档后都正常生效

### 7.5 当前批次进度

- 已完成：
  - `Batch 3A`
  - `Batch 3B`
  - `Batch 3C`
- 进行中：
  - `Batch 3D`
- 当前下一批：
  - `Batch 3D` 当前子步：继续清理 runtime / gameplay 侧对 `IAPPackage` 的残余直连
- 原因：
  - 角色主表、兑换映射、天赋选择存储这三条最直接的 legacy 主入口已经收住
  - 下一步该继续判断哪些 purchase 状态读取仍然只是因为兼容历史而挂在 `IAPPackage`
  - 如果某些接口已经只剩转发职责，应考虑回收到 `TalentService`、`PlayerAttrService` 或其他现有服务
