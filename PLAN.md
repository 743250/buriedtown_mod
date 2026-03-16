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
- 当前主战场是 `Phase 2`，也就是建筑 / 动作链
- `Phase 3` 之后暂不应正式展开，因为 `Phase 2` 没收住前，角色 / 天赋 / 购买兼容仍容易重新缠住

### 2.2 主要阻碍

1. **`buildAction.js` 缺少可扩展的动作注册机制**
   - `Formula` 只覆盖制作模式
   - `createTimedEffectBuildAction` 只覆盖定时效果模式
   - `DogBuildAction`、`BombBuildAction`、`BonfireBuildAction` 仍是独立特例
   - 当前新增一个非制作类动作，仍需要手写 class、手动接入 `save()` / `restore()` 和 `Build.js`

2. **`Build.js` 仍是内容特例路由中心**
   - 状态模型、配置读取、内容特例判断仍混在一起
   - 这部分已证明可以逐项迁出，但还没完全收口

3. **角色 / 天赋边界仍被旧购买兼容链牵制**
   - `role.js` 仍有 fallback
   - `TalentService.js` 仍承担兼容杂活
   - `IAPPackage.js` / `PurchaseService.js` 仍知道太多角色 / 天赋业务细节

4. **特殊物品 / 武器机制散落在多个运行时文件**
   - 特殊 `itemId`、武器效果、旅行加成、掉落效果等没有单一注册入口
   - 继续这样下去，新增一个“特殊物品”仍会演化成全仓库追踪

5. **配置层 schema 级校验还不够**
   - `runtimeRule` 之类的结构仍偏“约定驱动”
   - key 写错时容易静默失效，而不是尽早报错

6. **UI 仍承担了一部分业务编排**
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

## 4. 当前主战场：`Phase 2`

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
   - 当前批次
   - 目标：
     - `DogBuildAction` 迁移到通用模式
     - `BombBuildAction` 迁移到通用模式
   - 判断原则：
     - 如果模式不够用，就扩展模式
     - 不再保留“收口后依旧独立存在的特例 class”

4. **批次 D：迁移重状态动作到通用模式**
   - 紧随批次 C
   - 目标：
     - `BonfireBuildAction` 迁移到通用模式
   - 这是注册模式的压力测试；如果篝火能被覆盖，`Phase 2` 的架构目标基本成立

### 4.5 当前下一步

- 下一步进入 `批次 C`
- 第一小步是 `Step 2.7`：把 `DogBuildAction` 迁移到通用模式

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

- 对 `BonfireBuildAction` 这类多状态机动作，在批次 D 补一个最小状态验证脚本
- 至少覆盖：
  - 初始状态 -> 加燃料 -> 燃烧中 -> 燃尽
  - `save()` -> `restore()` 后状态一致
- 脚本放在 `tools/` 目录，与现有 smoke 工具同级

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
- `Phase 2`：进行中，`批次 A`、`批次 B` 已完成，下一步进入 `批次 C`
- `Phase 3`：暂不展开，等 `Phase 2` 收住后再进

### 6.2 `Phase 2` 已完成内容

- `RoleRuntimeService._buildActionVisibilityGroups` 已清空，动作显隐规则已迁到 `formulaConfig.runtimeRule`
- `Build.js` 当前角色读取口已清空
- 公式动作和休息类动作已切到显式动作类型入口
- `BuildActionTypeRegistry` 已建立

### 6.3 当前剩余工作

- 在 `批次 C` / `批次 D` 中把 `DogBuildAction`、`BombBuildAction`、`BonfireBuildAction` 迁到通用模式
- 为 `runtimeRule` 补最小 schema 校验
- 完成 `Phase 2` 后，再正式进入角色 / 天赋边界定型

### 6.4 当前下一步

- 从 `Step 2.7` 开始：`DogBuildAction` 迁移到通用模式
- 该步通过后，再处理 `BombBuildAction`
- `BonfireBuildAction` 作为最后的模式压力测试收尾
