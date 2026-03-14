# BuriedTown 渐进式重构计划

## 1. 目标

这轮计划的目标不是“长期和旧架构共存”，而是**用可控、可验证、可回退的方式，完成一次彻底的架构替换**。

这次替换最终要服务的内容目标仍然不变：

- 增加**人物**
- 增加**天赋**
- 增加**物品**
- 增加**建筑 / 建筑动作**
- 增加一些**特定机制**

但“彻底改变”在这个项目里不是抽象口号，而是下面这套**终局架构**：

1. **内容主数据层**
   - `roleConfigTable.js`
   - `talentConfigTable.js`
   - `itemConfig.js`
   - `buildConfig.js`
   - `buildActionConfig.js`
   - `formulaConfig.js`
   - 这些表最终要成为内容定义的唯一主源，不再长期并存第二套 fallback 或平行硬编码表。

2. **规则解释 / 机制注册层**
   - `RoleRuntimeService.js`
   - `TalentService.js`
   - `BuildActionEffectService.js`
   - `PlayerAttrService.js`
   - 后续必要的机制注册服务
   - 这些文件最终只负责解释配置、执行规则、挂接机制，不再吞内容数据本体，也不再继续扩大旧兼容职责。

3. **状态模型层**
   - `player.js`
   - `Build.js`
   - `buildAction.js`
   - `site.js`
   - 这些文件最终只保留状态、生命周期、少量通用流程，不再持续承接内容特例和跨系统业务分支。

4. **装配 / UI / 兼容层**
   - `jsList.js`
   - `game.js`
   - `uiUtil.js`
   - `dialog.js`
   - 场景文件
   - 购买兼容入口
   - 这些入口最终只负责装配、转发、展示和必要兼容，不再直接做业务决策。

计划的衡量标准也围绕这个终局展开：

- 新增一个内容点时，改动文件数持续下降
- 新逻辑优先走配置与服务入口，而不是继续堆回旧大文件
- 高风险入口改动有固定 smoke 护栏，不再轻易把项目带进黑屏
- 旧 fallback、旧硬编码分组、旧兼容映射、旧散分支可以**按阶段真实删除**

## 2. 项目现状

当前项目不是“完全没有边界”，而是处于**过渡架构**状态：

- 新边界已经长出来：配置表、部分服务层、内容校验和 smoke 护栏都已经开始形成
- 旧边界还没有真正退出：大量运行时决策仍散落在 `Build.js`、`buildAction.js`、`player.js`、`site.js`、`IAPPackage.js` 这类旧入口里
- 当前最大的现实问题不是“想不出小步怎么做”，而是**没有彻底完成替换前，旧体系仍在反向影响新体系**

当前真实阶段大致是：

- `Phase 0` / `Phase 1` 基线已经基本稳定：`tools/validate-content.js` 已覆盖内容扩展主链
- `Phase 0.5` 的两层护栏已经落地：`tools/smoke-runtime-boundaries.js` 与 `tools/smoke-startup.js` 可以拦住一部分黑屏和入口断链
- `Phase 2` 仍是当前主战场：动作显隐主流程已经大量转到配置，但 `Build.js` / `buildAction.js` 仍保留关键硬编码边界
- `Phase 3` 之后还不适合正式展开，因为建筑 / 动作链没有收住前，角色 / 天赋 / 购买兼容很容易重新互相缠住

详细代码阅读、热点判断和边界说明见第 `7` 节。

## 3. 当前最大的阻碍

当前最影响”彻底替换旧架构”的，不是”哪段代码最丑”，而是下面这些阻碍。排序按对内容扩展的实际阻碍程度，不是按代码行数。

1. **`buildAction.js` 没有可扩展的动作注册机制——这是当前第一阻碍**
   - 1107 行，6+ 个动作类，每个类各自重复一套 `_run()` / `_finish()` / `save()` / `restore()` 骨架。
   - `Formula` 类是配置驱动的，工作得很好——但它只覆盖”制作”这一种动作模式。
   - `createTimedEffectBuildAction` 工厂覆盖了”定时效果”模式（Rest / Drink / DrinkTea / Smoke），方向是对的，但适用范围有限。
   - `DogBuildAction`、`BombBuildAction`、`BonfireBuildAction` 三个类各自独立，没有共用骨架，也没有注册入口。
   - **结果：现在要新增一个”非制作类”建筑动作，唯一的做法是去 `buildAction.js` 里手写一个新 class、手动实现 save/restore、手动接入 Build.js。这是”增加建筑动作”和”增加特定机制”两个开发目标最直接的瓶颈。**
   - 这个问题不是”代码重复”——而是**缺少扩展机制**。逐个收口只是减少重复，建立注册机制才是真正降低后续新增动作的成本。

2. **`Build.js` 仍是内容特例的路由中心**
   - 570 行里混合了状态模型、配置读取、内容特例判断（`_isWorkSitePowered()`、`_getMaxLevel()` 等）。
   - `concurrentActionLimit` 已成功迁到 `buildConfig`，证明读取口逐个迁出是可行的。
   - 剩余的读取口收口是机械性工作，方向明确，风险可控。

3. **`RoleRuntimeService.js` 的主要阻碍已经解除，但有残留**
   - `_buildActionVisibilityGroups` 已清空，角色标签和运行时条件规则已迁到 `formulaConfig.runtimeRule`。
   - 残留问题：`_getMaxLevel()` 里仍有 `if (buildId === 16)` 等角色特定硬编码。
   - 这些残留不再构成系统性阻碍，可以在批次 A 中随 `Build.js` 读取口一起收掉。

4. **角色 / 天赋边界仍被旧购买兼容链牵制**
   - `role.js` fallback、`TalentService.js` 兼容职责、`IAPPackage.js`（29K）/ `PurchaseService.js` 的角色天赋解锁语义还没有彻底拆清。
   - 所以”加人物 / 加天赋”虽然已经比过去好，但仍未达到真正局部修改。

5. **UI 仍然承担业务编排职责**
   - `uiUtil.js`、`dialog.js` 仍直接碰 `player`、战斗、购买、天赋与建筑逻辑。
   - 这会导致很多本应是”内容或服务层”的改动，最后仍要回头补 UI 旧分支。

6. **配置层缺少 schema 级校验**
   - `formulaConfig.js`（30K）是当前最大的配置文件之一，随着更多规则从硬编码迁入，它还会继续膨胀。
   - `runtimeRule` 的格式（`includeAnyTags`、`powered` 等）目前是自由约定，`validate-content.js` 只校验链接完整性，不校验 `runtimeRule` 结构本身。
   - 如果配置写错了 key 名（比如 `includeTags` 而非 `includeAnyTags`），不会报错，只会静默失效。

7. **高风险入口仍然脆弱**
   - `jsList.js`、`game.js`、`player.js`、`site.js`、`Build.js`、`IAPPackage.js`、`PurchaseService.js`。
   - 已有 smoke 护栏兜底，但仍要遵守”兼容式薄改、一次提交只让一个入口承担行为变化”的规则。

8. **旧层没有明确退场标准**
   - 现在已经有不少新服务、新配置入口，但如果不提前写清”哪些旧层最终必须删除”，项目很容易变成”新旧长期并存”。
   - 所以这份计划必须同时回答：**新架构是什么**，以及**旧架构怎么退场**。

## 4. 整个项目先做什么、后做什么

总路线不是“永远渐进修补”，而是按 **建立新主入口 -> 迁移调用点 -> 删除旧层** 的顺序完成替换：

1. **`Phase 0.5` 护栏常驻**
   - 后续所有高风险入口改动都默认先过 smoke，再进入业务改动。
   - 这是整个替换过程的安全前提，不是独立终点。

2. **先收 `Phase 2`：建筑 / 动作链——核心是建立动作类型注册机制**
   - 目标不是逐个收口旧代码，而是**建立一个通用的动作类型注册模式**，然后把现有特例动作迁移上去。
   - `Build.js` 的读取口先迁出（机械性工作），然后 `buildAction.js` 建立注册机制（架构性工作），最终 `Build.js` / `buildAction.js` 只保留状态和通用流程。

3. **再收 `Phase 3`：角色 / 天赋边界**
   - 等建筑 / 动作链明显稳定后，再处理 `role.js`、`TalentService.js`、`IAPPackage.js`、`PurchaseService.js` 的职责边界。
   - 最终要让角色 / 天赋主数据和运行时解释解耦，并删除长期并存的 fallback / 兼容业务层。

4. **然后收 `Phase 4`：特殊物品 / 武器机制**
   - 让特殊 `itemId`、武器效果、掉落效果、旅行加成等不再散落在多个运行时分支里。
   - 最终要形成机制注册点，而不是继续让 `player.js` / `site.js` 当特殊规则集散地。

5. **最后收 `Phase 5`：解锁 / 兑换 / 兼容链**
   - 这条链只处理会妨碍内容扩展的旧映射和兼容逻辑，不重新抬成主战场。
   - 最终要把购买 / 兑换链压回“适配器”和“兼容层”职责，不再反向支配内容结构。

6. **`Phase 6` 按需插队**
   - 地图 / 站点 / 商店 / 战斗展示等次级路线，只在当期需求直接落到这些链路时再推进。
   - 这些线不是不做，而是不让它们打乱主架构替换顺序。

## 5. 当前阶段具体怎么分批推进和验证

当前阶段是 `Phase 2`。这一步的核心不是"逐个修补旧文件"，而是**建立通用的动作类型注册机制，然后把现有特例动作迁移上去**。

当前阶段的终局目标是：

- `Build.js` 回归状态模型职责，不再持续承接按 `buildId`、`roleType`、`storage`、`power` 散落的内容特例
- `RoleRuntimeService.js` 主要解释配置和运行时上下文（动作显隐硬编码分组已清空 ✅）
- **`buildAction.js` 拥有通用的动作类型注册机制**：新增一个非制作类动作时，通过配置 + 注册完成，而不是手写新 class 并重复 save/restore 骨架

当前阶段的执行原则调整为“同链路小步改、按批次统一验证、验证后再推进”：

- 一个批次允许积累 `2 ~ 4` 个同一链路、同一验证场景下的小改动
- 一个批次默认只让 `1` 个高风险入口文件承担主要行为变化；必要时最多带 `1 ~ 2` 个配套文件
- 只有批次收尾时才做完整自动校验和人工验证，不再要求每个微步骤都单独停下来验证
- 批次验证失败时，不进入下一批；只在当前批次内修复或回退

固定自动校验：

- `node tools/smoke-runtime-boundaries.js`
- `node tools/smoke-startup.js`
- 改 `Build.js` / `buildConfig.js` 时补 `node tools/validate-content.js links build --lang zh`
- 改 `buildAction.js` / `buildActionConfig.js` 时补 `node tools/validate-content.js links build-action --lang zh`

当前 `Phase 2` 的分批拆解：

1. **批次 A：`Build.js` 读取口收口**
   - ~~`Step 2.1`：并发动作上限单点收口~~ ✅ 已完成（`concurrentActionLimit` 已迁到 `buildConfig`）
   - ~~`Step 2.2`：通电状态读取口统一~~ ✅ 已完成（电炉 / 电网的激活条件已迁到 `buildConfig.requirePoweredWorksite`）
   - ~~`Step 2.3a`：休息动作角色读取口统一~~ ✅ 已完成（`RestBuild` 改为复用 `BuildActionFactory.createRestActions()`）
   - ~~`Step 2.3b`：`Room.init()` 角色读取口统一~~ ✅ 已完成（`RoleRuntimeService.applyRoomBuildStates()` 改为内部兜底当前角色）
   - ~~`批次 A` 收尾：`_getMaxLevel()` / 动作显隐角色读取口完全退出 `Build.js`~~ ✅ 已完成（`Build.js` 已不再直接读取当前角色）

2. **批次 B：建立通用动作注册模式（Phase 2 的架构关键批次）**
   - ~~`Step 2.4`：批量制作上限读口收口~~ ✅ 已完成（`Formula.getMaxBatchCraftCount()` 已统一走 `config.batchCount` 读口）
   - ~~`Step 2.5`：单次制作入口复用 `_runMakeAction(1)`~~ ✅ 已完成（`Formula.clickAction1()` 已只保留 `_runMakeAction(1)` 启动路径）
   - ~~`Step 2.6`：`TrapBuildAction` 复用 `Formula` 的制作启动路径~~ ✅ 已完成（陷阱已改为复用 `Formula.clickAction1()` / `place()`，只覆写差异钩子）
   - ~~`批次 B` 收尾：把 `Formula` / `createTimedEffectBuildAction` 提炼为显式动作类型注册入口~~ ✅ 已完成（`BuildActionTypeRegistry` 已接管 `formula` / `rest` / `smoke` / `drink` / `drink_tea`）
   - **设计目标**：批次 B 的产出不只是"复用代码"，而是**验证并确立一个通用的动作类型注册模式**。这个模式应该回答：新增一种动作类型时，需要提供什么（配置 shape + 行为钩子），框架负责什么（save/restore/生命周期/UI 接入）。`createTimedEffectBuildAction` 工厂和 `Formula` 类是这个模式的两个已有参照。

3. **批次 C：迁移轻量特例到通用模式**
   - `Step 2.7`：`DogBuildAction` 迁移到通用模式
   - `Step 2.8`：`BombBuildAction` 迁移到通用模式
   - 注意：不是"逐个收口后仍留下独立 class"，而是验证批次 B 建立的注册模式能否覆盖这两类动作。如果模式不够用，在这里扩展模式，而不是保留独立 class。

4. **批次 D：迁移重状态动作到通用模式**
   - `Step 2.9`：`BonfireBuildAction` 迁移到通用模式
   - 这是对注册模式的压力测试：篝火带计时、温度、燃料、存档恢复四路状态机耦合。如果通用模式能覆盖篝火，说明模式足够健壮。

批次排序依据：

- **A 在前**：先收 `Build.js` 读取口 / 判定口（机械性工作），降低后续批次的交叉风险。
- **B 是架构关键**：建立通用动作注册模式——这是整个 Phase 2 的核心交付物，决定后续 C/D 是"迁移"还是"又一次逐个修补"。
- **C 验证模式**：`DogBuildAction` / `BombBuildAction` 逻辑轻量、状态简单，适合作为模式的第一批迁移对象。
- **D 压力测试**：`BonfireBuildAction` 是最重的单点，如果模式能覆盖它，Phase 2 的架构目标就算达成。

已有参考模式：

- `createTimedEffectBuildAction` 工厂已经为 Rest / Drink / DrinkTea / Smoke 四类动作提供了共用的 `_run` / `_finish` / `save` / `restore` 模板。批次 B 应以这个工厂为参照来设计通用注册模式，而不是另起抽象。
- `Formula` 类是另一个参照：它证明了配置驱动 + 通用生命周期管理可以覆盖最高频的动作类型。

回退策略：

- 每个批次验证通过后立即打 tag（如 `phase2-batchA`），确保回退粒度是"回到上一个已验证批次"而不是"回退整个 Phase 2"。

这些步骤不是终点，而是为下面这些旧层退场做清场：

- `Build.js` 里与内容特例耦合的硬编码读取口
- `buildAction.js` 里各自独立的特例动作 class（最终应被通用注册模式取代）
- `RoleRuntimeService.js` 里残留的角色特定硬编码

详细验证协议与每个批次的验证目标见第 `7` 节。

## 6. 预期达到的目标

### 6.1 终局架构完成标志

当这轮计划真正完成时，项目应该达到下面这些状态：

- 新增人物 / 天赋 / 物品 / 建筑 / 机制时，默认先改配置和局部服务，而不是全仓库 grep 旧分支
- `Build.js` / `buildAction.js` / `player.js` / `site.js` 主要承担状态和通用流程，不再是内容主规则集散地
- `RoleRuntimeService.js`、`TalentService.js`、各类效果 / 机制服务只负责规则解释和执行，不再继续背负主数据和旧兼容杂活
- UI、场景、启动入口只负责装配、展示、跳转、转发，不再直接编排业务
- 高风险入口有固定 smoke 护栏，启动链和核心运行时边界不再轻易被改崩

### 6.2 必须退场的旧层

这轮计划不是“给旧层再包一层”，而是要让下面这些旧层最终具备删除条件：

- `role.js` 里的 `_fallbackRoleConfigTable`
- `RoleRuntimeService.js` 里未来新增的大段 `actionId` / `actionIds` 硬编码显隐分组
- `Build.js` 里不属于通用状态模型的 `buildId` / `roleType` / `storage` / `power` 内容特例
- `buildAction.js` 里重复的配方制作、陷阱放置、炸弹激活、狗舍、篝火等旧式流程骨架
- `IAPPackage.js` / `PurchaseService.js` 里直接理解角色 / 天赋效果的业务逻辑
- `player.js` / `site.js` 里散落的特殊 `itemId` / 武器 / 工具效果硬编码分支

允许存在临时兼容层，但前提是：

- 必须明确它服务哪个阶段迁移
- 必须明确它替代的是哪一层旧逻辑
- 必须明确什么时候可以删除

### 6.3 阶段退出标准

每个 Phase 的详细退出标准、完成定义和退场对象见第 `7.3` 节对应 Phase 描述。

总结版：

| Phase | 核心退出条件 |
|-------|-------------|
| 2 | 新增普通建筑动作不需要改 `Build.js` / `buildAction.js` 旧分支 |
| 3 | `role.js` fallback 表可删除；购买链不再承载角色 / 天赋业务语义 |
| 4 | 新增特殊物品有单一注册入口，不再散落到 `player.js` / `site.js` 多处 |
| 5 | 解锁 / 兑换映射回到单一主入口，购买链只保留兼容职责 |

## 7. 详细展开

这份计划以当前最真实的开发目标为准：

- 后续主要工作是**增加人物**
- 增加**天赋**
- 增加**物品**
- 增加**建筑 / 建筑动作**
- 增加一些**特定机制**

所以重构优先级不再按“哪里最乱就先改哪里”，而是按：

1. **以后会不会反复改到**
2. **每次加内容会不会都要全仓库 grep**
3. **是否容易因为缺校验而静默出错**
4. **是否会迫使我们继续把逻辑塞回旧屎山文件**

结论先写在前面：

- **地图 / 站点不是当前主线**
- **购买链也不是当前主线**
- 当前最值得投入的是：
  - **建筑 / 动作链**
  - **角色 / 天赋配置边界**
  - **特殊物品 / 武器机制归口**
  - **内容校验覆盖面**

关键要求仍然不变：

- 不破坏当前可打包的 legacy 基线
- 不制造第二套平行实现
- 每一轮结束后都更接近“新增内容时只改局部”的状态

### 7.1 基于代码阅读的热点判断

下面不是拍脑袋排序，而是根据当前仓库里真实的耦合位置做的判断。

#### 真正该优先改的热点

#### A. 建筑 / 动作链：这是以后最容易反复碰的屎山

重点文件：

- `assets/src/game/buildAction.js`（**当前第一瓶颈**）
- `assets/src/game/Build.js`
- `assets/src/game/RoleRuntimeService.js`
- `assets/src/data/buildConfig.js`
- `assets/src/data/buildActionConfig.js`
- `assets/src/data/formulaConfig.js`
- `assets/src/game/BuildActionEffectService.js`

这条链上三个文件的阻碍程度不一样（基于当前 HEAD 真实状态）：

**`buildAction.js`——最重，缺少扩展机制：**

- 1107 行，6+ 个动作类，每个类各自重复 `_run()` / `_finish()` / `save()` / `restore()` 骨架。
- `Formula` 只覆盖”制作”模式，`createTimedEffectBuildAction` 只覆盖”定时效果”模式。
- `DogBuildAction` / `BombBuildAction` / `BonfireBuildAction` 三个类完全独立，没有共用骨架，没有注册入口。
- **新增一个非制作类动作 = 手写新 class + 手动实现 save/restore + 手动接入 Build.js。这是”增加建筑动作 / 增加特定机制”最直接的瓶颈。**

**`Build.js`——中等，机械性迁出：**

- `_isWorkSitePowered()`、`_getMaxLevel()` 等内容特例仍在，但 `concurrentActionLimit` 已成功迁到 `buildConfig`，路径已验证。
- 剩余读取口是同类型的机械工作。

**`RoleRuntimeService.js`——主要阻碍已解除：**

- `_buildActionVisibilityGroups` 已清空，角色标签 / 运行时条件规则已迁到 `formulaConfig.runtimeRule`。
- 残留的 `_getMaxLevel()` 硬编码可随 `Build.js` 读取口一起迁出。

所以这条链的真正瓶颈已经从”三个文件都很乱”收窄到**”`buildAction.js` 没有可扩展的动作注册机制”**这一个点。

#### B. 角色 / 天赋配置边界：方向对了，但还停在半新半旧

重点文件：

- `assets/src/data/roleConfigTable.js`
- `assets/src/game/role.js`
- `assets/src/data/talentConfigTable.js`
- `assets/src/game/TalentService.js`
- `assets/src/game/IAPPackage.js`
- `assets/src/game/PurchaseService.js`

为什么它必须进主计划：

- `RoleConfigTable` / `TalentConfigTable` 已经是正确方向
- 但 `role.js` 里还保留着一整套 `_fallbackRoleConfigTable`，属于明显的重复数据源
- `TalentService.js` 里除了天赋本身逻辑，还承担了旧存档迁移、已选天赋恢复、IAP 兼容 API 绑定等职责
- `IAPPackage.js` 仍然知道太多角色 / 天赋 / 解锁细节

这意味着以后加人物 / 天赋时，虽然已经不是纯硬编码时代了，但仍然可能出现：

- 配置表加了
- 服务层还要补兼容
- 兑换 / 解锁那边也要再摸一遍

这块不收口，新增内容时会一直有“明明已经数据驱动了一半，但还得去旧逻辑里补洞”的痛感。

#### C. 特殊物品 / 武器机制：目前散得最厉害

重点文件：

- `assets/src/game/BattleEquipmentSystem.js`
- `assets/src/game/player.js`
- `assets/src/game/site.js`
- `assets/src/game/TravelService.js`
- `assets/src/game/Storage.js`
- `assets/src/game/PlayerPersistenceService.js`
- `assets/src/game/WeaponCraftService.js`
- `assets/src/game/PurchaseService.js`

为什么它很危险：

- 仓库里仍有大量按 `itemId` 直接写死的逻辑
- 武器类别、特殊枪械、特殊道具、旅行加成、密室探测、背包扩容、购买奖励等效果分散在多个系统里
- 这类逻辑平时不显眼，但你一旦开始加“特殊物品 / 特殊武器 / 特殊工具”，就会立刻变成全仓库追踪

如果这一块不治理，以后新增一个“有特殊效果的物品”，很可能不是改 `itemConfig`，而是：

- 改 `itemConfig.js`
- 改 `BattleEquipmentSystem.js`
- 改 `player.js`
- 改 `TravelService.js`
- 改 `Storage.js`
- 有时还要碰 `site.js` 或存档修复逻辑

这对后续加机制最伤维护性。

#### D. 内容校验覆盖面不够：这是“慢性高风险”

重点文件：

- `assets/src/util/contentBlueprint.js`
- `assets/src/util/configValidator.js`
- `tools/validate-content.js`
- `tools/lib/content-validator.js`

当前判断：

- 现有 CLI 和运行时校验对 `role / talent / item / site` 已经有一定帮助
- 但**对你后续最常改的 `build / build-action / role runtime rule / special item mechanic` 还没有形成同等级兜底**

这会导致一个很典型的问题：

- 表面上“配置化”了
- 但因为缺少跨文件检查，改错了引用、漏了资源、漏了 unlock 关系，不一定马上爆
- 最后还是得靠手动回归和记忆排查

如果只从长期效率看，这一块并不“最乱”，但它的 ROI 很高。

#### 值得保留并继续扩展的部分

这些不是当前屎山重点，应该尽量沿着已有边界继续做，而不是推倒重来：

- `assets/src/game/PlayerAttrService.js`
- `assets/src/game/BuildActionEffectService.js`
- `assets/src/game/SiteConfigService.js`
- `assets/src/game/SiteRewardService.js`
- `assets/src/game/SiteRoomGenerator.js`
- `assets/src/data/roleConfigTable.js`
- `assets/src/data/talentConfigTable.js`
- `assets/src/util/configValidator.js`

判断标准：

- 已经在往“服务 / 配置入口”方向收口
- 后续可以继续扩展，不必再回退到旧的大文件里加分支

#### 当前不该优先的部分

#### 地图 / 站点链

- 它有重复逻辑，但**不是你接下来最常改的地方**
- 除非你下一步要做新站点类型、地图事件、特殊旅行规则、地图建筑交互，否则不该继续深挖

#### 购买展示 / 原生支付链

- 当前主要购买路径已经转向成就点兑换
- 原生支付兼容仍要保留，但不是当前内容扩展主战场

#### 战斗展示文案层

- 可以以后再瘦身
- 但它对“新增人物 / 天赋 / 物品 / 建筑 / 特定机制”的帮助不如前面几项直接

### 7.2 渐进式重构原则

#### 什么样的改动才算“值得做”

优先做这类改动：

- 改完后，**新增一个人物 / 天赋 / 物品 / 建筑 / 机制时，改动文件数明显减少**
- 改完后，**新增内容优先走配置，而不是继续往旧服务里堆分支**
- 改完后，**校验能更早发现错误**

不优先做这类改动：

- 只是让结构“看起来更整洁”，但不影响以后加内容的效率
- 为未来可能用到的抽象先造层
- 纯 UI 层瘦身，但对内容扩展没直接帮助

#### 这轮计划里的统一约束

1. 不重排启动链；高风险入口只允许做兼容式薄改。
2. 不新建第二套 runtime。
3. 每一轮只收一个窄边界。
4. 新逻辑优先收进已有服务 / 配置表，不再新增平行 helper。
5. 只要新增一种内容类型，就同步补最小校验能力。
6. UI 层（`uiUtil.js`、`dialog.js`）不允许新增业务编排分支；新增内容的业务决策必须走服务层，UI 只做展示和转发。

#### 高风险入口安全改法

适用范围：

- `assets/src/jsList.js`
- `assets/src/game/game.js`
- `assets/src/game/player.js`
- `assets/src/game/site.js`
- `assets/src/game/Build.js`
- `assets/src/game/IAPPackage.js`
- `assets/src/game/PurchaseService.js`

统一方法：

- 入口文件只做稳定外壳；新逻辑优先放到已有服务或配置入口后面，不直接在入口里堆新分支。
- 先加兼容层，再切调用点；不允许一上来删旧逻辑、改顺序、换数据格式。
- 先做影子运行 / 结果比对，再做行为切换；尤其是购买状态、角色映射、存档恢复这类链路。
- 一次提交最多只允许一个高风险入口承担“行为变化”，其他入口只能做兼容配套。

文件级守则：

- `jsList.js` 只允许追加，不允许在同一提交里同时新增、删除、重排多个高风险脚本。
- `game.js` 只允许抽离单个初始化步骤，不允许在同一提交里同时改初始化顺序与初始化内容。
- `player.js` 只允许按窄职责改动：`useItem`、`save/restore`、`hourly update`、`battle` 不能混改。
- `site.js` 与 `Build.js` 只允许先保留 fallback / 兼容口，再逐个切调用点，不允许同一提交同时改配置结构与消费逻辑。
- `IAPPackage.js` 与 `PurchaseService.js` 只允许先做兼容映射或影子比对，不允许同一提交同时重写映射规则、UI 状态和持久化格式。

### 7.3 分阶段路线

#### Phase 0: 基线与工具主入口固定

目标：

- 固定当前 legacy 基线
- 固定仓库级验证主入口
- 明确“哪些旧层只做兼容，不再继续放大”

完成定义：

- `PLAN.md` 已反映真实开发优先级
- `tools/validate-content.js` 仍是唯一默认推荐的仓库验证入口
- 不再新增随手脚本替代它

#### Phase 0.5: 高风险入口护栏

目标：

- 固定高风险入口的安全改动方式，避免再因入口联动修改触发黑屏。
- 给启动链建立最小可重复的冒烟验证，而不是继续依赖人工点点点。

主入口：

- `tools/smoke-runtime-boundaries.js`
- `tools/smoke-startup.js`（最小启动链冒烟）

完成定义：

- 对这 7 个入口文件形成明确的允许改法与禁止组合。
- 改动任一高风险入口前后，都能跑最小仓库级 smoke。
- 启动链至少覆盖 `jsList` 装载、`game.init()`、`MenuScene / ChooseScene / MainScene` 的可达性检查。
- 后续再做 `Phase 2+` 时，默认先过护栏，再谈业务重构。

优先级说明：

- 这不是业务价值最高的一刀，但它决定后续重构会不会再次被黑屏打断。
#### Phase 1: 内容校验覆盖扩展

目标：

- 把校验重点从 `role / talent / item / site` 扩到你最常新增的内容链
- 为 `build / build-action / role runtime rule / special item reference` 建立最小可用校验

主入口：

- `tools/validate-content.js`
- `assets/src/util/contentBlueprint.js`

范围文件：

- `tools/validate-content.js`
- `tools/lib/content-validator.js`
- `assets/src/util/contentBlueprint.js`
- `assets/src/util/configValidator.js`
- `assets/src/data/buildConfig.js`
- `assets/src/data/buildActionConfig.js`
- `assets/src/data/roleConfigTable.js`
- 视需要补充 `assets/src/data/itemConfig.js`

完成定义：

- 能校验建筑配置里的 `condition / cost / produceList / build refs`
- 能校验建筑动作配置里的 `cost / produce / effect` 结构
- 能校验角色运行时配置里的 `roomBuilds / unlockSites / unlockNpcs / specialItems / zipline`
- 校验失败能明确指出 `id` 和来源文件

优先级说明：

- 这不是最“脏”的代码，但它是后续所有内容扩展的基础兜底，ROI 很高

#### Phase 2: 建筑 / 动作链——建立动作类型注册机制

目标：

- **核心目标**：在 `buildAction.js` 中建立通用的动作类型注册机制，让新增动作类型通过”配置 + 注册”完成，而不是手写新 class。
- **前置目标**：先把 `Build.js` 的内容特例读取口迁出，降低后续改动的交叉风险。

主入口：

- `assets/src/game/buildAction.js`（架构改造主战场）
- `assets/src/game/Build.js`（读取口迁出）

次要入口（已大幅完成，只处理残留）：

- `assets/src/game/RoleRuntimeService.js`（显隐硬编码已清空，残留 `_getMaxLevel()` 随 `Build.js` 一起迁）

范围文件：

- `assets/src/game/Build.js`
- `assets/src/game/buildAction.js`
- `assets/src/game/RoleRuntimeService.js`
- `assets/src/game/BuildActionEffectService.js`
- `assets/src/data/buildConfig.js`
- `assets/src/data/buildActionConfig.js`
- `assets/src/data/formulaConfig.js`（`runtimeRule` 迁入目标）

已有参考模式（新模式应基于这些建立，不另起抽象）：

- `createTimedEffectBuildAction(type, config)` 工厂——为 Rest / Drink / DrinkTea / Smoke 四类动作提供共用的 `_run` / `_finish` / `save` / `restore` 模板。**这是通用注册模式最直接的参照。**
- `Formula` 类——证明了配置驱动 + 通用生命周期管理可以覆盖最高频的动作类型（制作链）。
- `formulaConfig.runtimeRule`（`includeAnyTags` / `powered` 等）——动作显隐规则的迁入目标已验证可行。

通用动作注册模式需要回答的问题：

- 新增一种动作类型时，需要提供什么？（配置 shape + 行为钩子）
- 框架负责什么？（save/restore 生命周期、UI 按钮接入、计时管理、状态恢复）
- 如何处理特殊状态？（篝火的温度/燃料、炸弹的一次性激活、狗舍的喂养周期）

完成定义：

- **通用动作注册机制已建立**：新增一个非制作类动作时，通过配置 + 注册完成，而不是手写新 class
- 动作显隐规则已完全迁到配置（已完成 ✅）
- `Build.js` 的内容特例读取口已迁到 `buildConfig` 或服务层
- 现有特例动作（Dog / Bomb / Bonfire）已迁移到通用模式，不再各自维护独立 class
- `runtimeRule` 字段在 `validate-content.js` 中有最小 schema 校验（至少校验 key 名合法性）

退场对象：

- `Build.js` 里不属于状态模型职责的建筑内容特例
- `buildAction.js` 里各自独立的 `DogBuildAction` / `BombBuildAction` / `BonfireBuildAction` class（被通用注册模式取代）
- `RoleRuntimeService.js` 里残留的 `_getMaxLevel()` 角色特定硬编码

退出标准：

- **新增一个建筑动作时，默认只需要：1) 在配置中定义动作类型和参数，2) 如有特殊行为则注册行为钩子——不需要手写新 class、不需要改 `Build.js`**
- `Build.js` 回归状态模型职责
- `RoleRuntimeService.js` 主要解释配置与运行时上下文

执行颗粒度：

- 每一步只处理 1 个明确规则点，不在同一步同时收多个建筑 / 动作特例。
- `Build.js` 与 `buildAction.js` 不在同一步同时承担行为变化；如果必须联动，另一侧只能做兼容壳、配置映射或 smoke 补强。
- 批次 A 先收读取口 / 判定口（机械性工作），批次 B 建立注册模式（架构性工作），批次 C/D 验证模式能否覆盖特例。
- 每一步都必须对应到 1 个清晰人工验证场景，验证不过就不进入下一步。

#### Phase 3: 角色 / 天赋边界定型

目标：

- 让 `RoleConfigTable` / `TalentConfigTable` 真正成为唯一配置主源
- 把旧兼容层缩回”兼容”职责，不再继续承载主逻辑

前置条件：

- Phase 2 退出标准全部达成
- `IAPPackage.js` 接口边界已明确（见下方”前置准备”）

主入口：

- `assets/src/game/role.js`
- `assets/src/game/TalentService.js`

范围文件：

- `assets/src/game/role.js`
- `assets/src/data/roleConfigTable.js`
- `assets/src/game/TalentService.js`
- `assets/src/data/talentConfigTable.js`
- `assets/src/game/IAPPackage.js`（29K——是除数据文件外最大的逻辑文件，不能当小文件处理）
- `assets/src/game/PurchaseService.js`

前置准备（在 Phase 2 收尾或 Phase 3 正式启动前完成）：

- 梳理 `IAPPackage.js` 对外暴露的接口清单，明确哪些是”角色 / 天赋业务语义”、哪些是”解锁 / 兑换适配器”。
- `game.start()` 里的 `IAPPackage.applyActiveTalentStartGifts()` 调用需要明确归属：是启动链职责还是天赋服务职责。
- 这一步只做接口梳理和文档标注，不改行为。

完成定义：

- `role.js` 不再保留与 `RoleConfigTable` 平行的一整套 fallback 数据表
- 新增角色主要改 `roleConfigTable.js`，最多补一处运行时解释，不再多处同步
- 新增天赋主要改 `talentConfigTable.js` 与天赋服务，不再被购买兼容细节牵着走
- `IAPPackage.js` 只保留解锁 / 兑换 / 兼容职责，不继续吞角色 / 天赋效果逻辑

退场对象：

- `role.js` 里的 `_fallbackRoleConfigTable`
- `TalentService.js` 里的非天赋核心兼容杂活
- `IAPPackage.js` / `PurchaseService.js` 里直接理解角色 / 天赋效果的业务语义

退出标准：

- 角色 / 天赋主数据只保留一套主源
- 角色 / 天赋新增流程不再默认跨 `role.js`、`TalentService.js`、购买链多处补逻辑
- 购买链对角色 / 天赋只保留解锁与兼容接口，不再主导业务结构

#### Phase 4: 特殊物品 / 武器机制归口

目标：

- 把散落在各处的特殊 `itemId` / 武器行为 / 工具效果收成可追踪入口

主入口：

- `assets/src/game/BattleEquipmentSystem.js`
- `assets/src/game/player.js`

范围文件：

- `assets/src/game/BattleEquipmentSystem.js`
- `assets/src/game/player.js`
- `assets/src/game/site.js`
- `assets/src/game/TravelService.js`
- `assets/src/game/Storage.js`
- `assets/src/game/PlayerPersistenceService.js`
- `assets/src/game/WeaponCraftService.js`
- `assets/src/data/itemConfig.js`

完成定义：

- 新增一个特殊武器 / 特殊工具 / 特殊掉落道具时，不需要全仓库 grep 一遍 `itemId`
- 武器分类、特殊音效、特殊伤害效果、特殊掉落效果尽量有集中注册点
- 特定机制优先挂在“机制注册 / 服务入口”上，而不是继续在 `player.js` 或 `BattleEquipmentSystem.js` 里写散分支

退场对象：

- `player.js` / `site.js` / `TravelService.js` 里散落的特殊 `itemId` 业务分支
- `BattleEquipmentSystem.js` 里无法复用、无法注册的特殊武器判断

退出标准：

- 新增一个特殊物品 / 武器 / 工具时，有明确单一注册入口
- 特殊机制不再默认扩散到多个运行时文件
- `player.js` / `site.js` 更多回归状态与流程职责

#### Phase 5: 解锁 / 兑换 / 兼容链收口

目标：

- 只处理那些会妨碍内容扩展的旧购买 / 兑换兼容逻辑
- 不把这条链重新抬成主战场

范围文件：

- `assets/src/game/IAPPackage.js`
- `assets/src/game/PurchaseService.js`
- `assets/src/game/TalentService.js`
- `assets/src/game/role.js`

完成定义：

- 新增角色 / 天赋 / 可兑换道具时，不需要同时改多套平行映射
- 成就点兑换路径稳定
- 原生支付兼容保留，但不再反向支配内容结构

退场对象：

- `IAPPackage.js` / `PurchaseService.js` 里内容结构相关的历史映射杂层
- 为兼容旧支付 / 旧兑换留下的平行业务入口

退出标准：

- 解锁 / 兑换 / 兼容语义回到单一主入口
- 购买链只保留适配器职责，不再参与内容规则编排
- 新增可兑换内容时，不再需要同步维护多套旧映射

#### Phase 6: 按需处理的次级路线

这些不是当前主线，只在对应需求真的出现时再推进：

- 地图 / 站点边界
- 玩家生命周期外围
- 战斗展示层瘦身
- 商店展示与购买弹窗 UI

判断条件：

- 只有当新需求直接落在这些链路上，才把它们临时拉升优先级

### 7.4 验证策略

#### 仓库级验证

- `node tools/validate-content.js all --lang zh`
- `node tools/validate-content.js all --lang en`
- `node tools/smoke-runtime-boundaries.js`
- `node tools/smoke-startup.js`（高风险入口改动时默认执行）
- 后续补充：
  - `build`
  - `build-action`
  - 必要时补 `role-runtime`
- 针对改动文件做最小语法检查

#### 批次推进协议

- 从现在开始，默认采用“积累 1 个批次 -> 自动校验 -> 你人工验证 -> 再进入下一批”的节奏。
- 每个批次的工作量上限：
  - 默认覆盖同一链路内 `2 ~ 4` 个相关小改动。
  - 默认只允许 `1` 个高风险入口文件承担主要行为变化。
  - 最多带 `1 ~ 2` 个配套文件（配置、smoke 或校验）一起改。
  - 如果某一类改动带有计时 / 存档恢复 / 多状态机风险，可以单独成批，不强行凑批。
- 每个批次收尾时固定执行：
  - `node tools/smoke-runtime-boundaries.js`
  - `node tools/smoke-startup.js`
  - 如果批次改了 `Build.js` / `buildAction.js` / `buildConfig.js` / `buildActionConfig.js`，再补对应 `build` / `build-action` links 校验
  - 若改动碰到文案或跨语言配置，再补对应的 `--lang en`
- 每个批次结束标准：
  - 自动校验通过。
  - 明确写出本批次人工验证清单。
  - 停在当前批次，等待你回报“通过 / 失败 / 现象”。
- 任何一个批次人工验证失败：
  - 不进入下一批。
  - 只允许在当前批次内修复，或直接回退当前批次。
- 默认采用”1 批 1 提交”的粒度，便于快速定位和回退。
- **每个批次验证通过后立即打 tag**（如 `phase2-batchA`），确保多批次叠加后仍可按批次粒度回退。
- 多批次回退预案：如果连续两个批次叠加后发现问题，允许回退到上一个 tag，而不是只能回退当前批次或整个 Phase。

#### 复杂状态动作的最小自动验证

- 对带有多状态机耦合的动作（如 `BonfireBuildAction` 的计时 / 温度 / 燃料 / 存档恢复），人工验证成本高且容易遗漏。
- 建议在批次 D 时补充最小可重复的状态验证脚本（不必引入完整测试框架），至少覆盖：
  - 初始状态 -> 加燃料 -> 燃烧中 -> 燃尽的状态转换
  - `save()` -> `restore()` 后状态一致性
- 脚本放在 `tools/` 目录，与现有 smoke 工具同级。

#### 内容扩展专项回归

当改动与内容扩展相关时，优先做这些回归：

- 新角色可选择、可解锁、角色特性生效
- 新天赋可解锁、可选择、等级效果生效
- 新物品有图标、有文案、可获取、效果生效
- 新建筑可建造、可升级、可执行动作
- 新机制在对应服务挂点上能触发

#### 地图 / 商店回归

- 只有当本轮真的改动地图 / 商店链时才做完整人工回归
- 对纯内容扩展，不再默认把地图 / 商店作为第一优先回归项

### 7.5 当前真实状态与下一步

这部分以当前 `HEAD` 的真实代码为准，不再沿用已被回退提交影响的阶段描述。

#### 当前阶段状态

#### `Phase 0`

- 可视为已完成。
- `PLAN.md` 已切到“围绕新增人物 / 天赋 / 物品 / 建筑 / 机制”的真实开发目标。
- `tools/validate-content.js` 仍是默认仓库级校验主入口。

#### `Phase 0.5`

- 已完成第二层最小护栏，但还没有完全收口。
- `tools/smoke-runtime-boundaries.js` 已落地，可覆盖语法、运行时上下文和 `jsList` / 模块边界 smoke。
- `tools/smoke-startup.js` 已落地，可覆盖 `project.json -> preloading.js -> game.init/start -> MenuScene/MainScene/ChooseScene` 的最小启动链契约。
- 这两类 smoke 仍不替代完整场景人工回归，但已经能拦住一批入口联动导致的黑屏与断链问题。
- 结论：后续所有高风险入口改动，默认先过这两层 smoke，再进入业务改动。

#### `Phase 1`

- 当前可视为已完成。
- `tools/validate-content.js` 已覆盖 `build` / `build-action`。
- `role` 校验已覆盖 `roomBuilds / unlockSites / unlockNpcs / specialItems / zipline` 等运行时配置边界。
- `node tools/validate-content.js all` 当前通过，可作为内容扩展的基线检查。

#### `Phase 2`

- 仍在进行中，**批次 A**、**批次 B** 已完成，下一步进入**批次 C**。
- 已完成的工作：
  - `RoleRuntimeService._buildActionVisibilityGroups` 已清空 ✅ 角色标签和运行时条件规则已迁到 `formulaConfig.runtimeRule`。
  - `Step 2.1`：`concurrentActionLimit` 已迁到 `buildConfig` ✅（commit `5b4a493`）。
  - `Step 2.2`：电炉 / 电网的通电激活读取口已迁到 `buildConfig.requirePoweredWorksite`，`Build.js` 不再保留对应空壳子类 ✅。
  - `Step 2.3a` / `Step 2.3b`：休息动作与 `Room.init()` 的角色读取口已迁到服务 / 动作工厂侧；`Build.js` 不再直接取当前角色来拼休息动作或初始化房间建筑 ✅。
  - `批次 A` 收尾：`_getMaxLevel()` 与动作显隐的角色读取已改为服务内部兜底；`Build.js` 已清空当前角色读取口 ✅。
  - `Step 2.4` / `Step 2.5` / `Step 2.6`：批量制作上限、单次制作启动路径、陷阱制作启动路径都已收进 `Formula` 主路径；`TrapBuildAction` 只保留差异钩子 ✅。
  - `批次 B` 收尾：`BuildActionTypeRegistry` 已建立，`Build.js` 默认公式动作和休息类动作都已改为通过显式动作类型入口创建 ✅。
- 当前剩余工作（按批次）：
  - **批次 C/D**（模式验证）：把 Dog / Bomb / Bonfire 迁移到通用模式。
- 核心判断变化：Phase 2 的瓶颈已从"三个文件都很乱"收窄到"`buildAction.js` 没有可扩展的动作注册机制"这一个点。`RoleRuntimeService` 的主要阻碍已解除。

#### `Phase 3`

- 还不应正式展开。
- 当前主要阻塞点不是“没想清楚怎么做”，而是 `Phase 2` 没收住前，角色 / 天赋边界改造仍容易和购买兼容、UI 调用、旧全局逻辑交叉爆炸。

#### 当前下一步

当前阻碍和执行顺序见第 `3` 节和第 `4` 节，不在此重复。

Phase 2 批次细化拆解见第 `5` 节。当前**批次 A**、**批次 B** 已完成，下一步进入**批次 C**，从 `Step 2.7`（`DogBuildAction` 迁移到通用模式）开始。

一句话版：
- **总路线是 `Phase 0.5 护栏常驻 -> Phase 2 建立动作注册机制 -> Phase 3 角色天赋 -> Phase 4 特殊物品/武器 -> Phase 5 解锁兑换兼容 -> Phase 6 按需插队`；Phase 2 的核心交付物是通用动作类型注册机制（批次 B），批次 A 是前置清场，批次 C/D 是模式验证和迁移。**
