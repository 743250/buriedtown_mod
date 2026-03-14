# BuriedTown 渐进式重构计划

## 1. 计划前提

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

## 2. 基于代码阅读的热点判断

下面不是拍脑袋排序，而是根据当前仓库里真实的耦合位置做的判断。

### 2.1 真正该优先改的热点

#### A. 建筑 / 动作链：这是以后最容易反复碰的屎山

重点文件：

- `assets/src/game/Build.js`
- `assets/src/game/buildAction.js`
- `assets/src/game/RoleRuntimeService.js`
- `assets/src/data/buildConfig.js`
- `assets/src/data/buildActionConfig.js`
- `assets/src/game/BuildActionEffectService.js`

为什么它优先级最高：

- `Build.js` 里还有动作可见性、背包状态、购买解锁、并发动作等多种规则混在一起
- `RoleRuntimeService.js` 里仍然维护大量按 `actionId` 分组的硬编码规则
- `buildAction.js` 体量很大，虽然已经抽出 `BuildActionEffectService`，但仍然保留不少特殊行为和旧式分支
- 以后你增加建筑、增加建筑动作、增加角色特定动作、增加工地 / 产线机制时，大概率都会碰这里

这块如果不先收，后面每加一个内容点都容易变成：

- 改配置
- 改 `Build.js`
- 改 `RoleRuntimeService.js`
- 必要时再改 `buildAction.js`

这就是最典型的“内容可扩展性差”。

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

### 2.2 值得保留并继续扩展的部分

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

### 2.3 当前不该优先的部分

#### 地图 / 站点链

- 它有重复逻辑，但**不是你接下来最常改的地方**
- 除非你下一步要做新站点类型、地图事件、特殊旅行规则、地图建筑交互，否则不该继续深挖

#### 购买展示 / 原生支付链

- 当前主要购买路径已经转向成就点兑换
- 原生支付兼容仍要保留，但不是当前内容扩展主战场

#### 战斗展示文案层

- 可以以后再瘦身
- 但它对“新增人物 / 天赋 / 物品 / 建筑 / 特定机制”的帮助不如前面几项直接

## 3. 渐进式重构原则

### 3.1 什么样的改动才算“值得做”

优先做这类改动：

- 改完后，**新增一个人物 / 天赋 / 物品 / 建筑 / 机制时，改动文件数明显减少**
- 改完后，**新增内容优先走配置，而不是继续往旧服务里堆分支**
- 改完后，**校验能更早发现错误**

不优先做这类改动：

- 只是让结构“看起来更整洁”，但不影响以后加内容的效率
- 为未来可能用到的抽象先造层
- 纯 UI 层瘦身，但对内容扩展没直接帮助

### 3.2 这轮计划里的统一约束

1. 不重排启动链；高风险入口只允许做兼容式薄改。
2. 不新建第二套 runtime。
3. 每一轮只收一个窄边界。
4. 新逻辑优先收进已有服务 / 配置表，不再新增平行 helper。
5. 只要新增一种内容类型，就同步补最小校验能力。

### 3.3 高风险入口安全改法

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

## 4. 分阶段路线

### Phase 0: 基线与工具主入口固定

目标：

- 固定当前 legacy 基线
- 固定仓库级验证主入口
- 明确“哪些旧层只做兼容，不再继续放大”

完成定义：

- `PLAN.md` 已反映真实开发优先级
- `tools/validate-content.js` 仍是唯一默认推荐的仓库验证入口
- 不再新增随手脚本替代它

### Phase 0.5: 高风险入口护栏

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
### Phase 1: 内容校验覆盖扩展

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

### Phase 2: 建筑 / 动作链收口

目标：

- 把“新增建筑 / 新增动作 / 新增角色特定动作”时最容易扩散的硬编码点收掉

主入口：

- `assets/src/game/Build.js`
- `assets/src/game/RoleRuntimeService.js`
- `assets/src/game/buildAction.js`

当前判断：

- 这是当前最该动的业务屎山
- 以后新增建筑与特定机制，最容易被这里反复卡住

范围文件：

- `assets/src/game/Build.js`
- `assets/src/game/buildAction.js`
- `assets/src/game/RoleRuntimeService.js`
- `assets/src/game/BuildActionEffectService.js`
- `assets/src/data/buildConfig.js`
- `assets/src/data/buildActionConfig.js`

完成定义：

- 动作显隐规则不再主要依赖 `RoleRuntimeService.js` 里的大段 `actionIds` 硬编码列表
- 背包 / 特殊解锁 / 角色标签相关的动作门槛尽量从 `Build.js` 挪到可配置或集中注册的位置
- 新增一个普通建筑动作时，默认不需要再改 `buildAction.js` 的旧分支骨架
- `BuildActionEffectService.js` 继续作为通用定时动作入口，而不是只抽一半停住

执行颗粒度：

- 每一步只处理 1 个明确规则点，不在同一步同时收多个建筑 / 动作特例。
- `Build.js` 与 `buildAction.js` 不在同一步同时承担行为变化；如果必须联动，另一侧只能做兼容壳、配置映射或 smoke 补强。
- 优先先收“读取口 / 判定口”，再收“写入 / 产出流程”，避免一刀同时改读写。
- 每一步都必须对应到 1 个清晰人工验证场景，验证不过就不进入下一步。

### Phase 3: 角色 / 天赋边界定型

目标：

- 让 `RoleConfigTable` / `TalentConfigTable` 真正成为唯一配置主源
- 把旧兼容层缩回“兼容”职责，不再继续承载主逻辑

主入口：

- `assets/src/game/role.js`
- `assets/src/game/TalentService.js`

范围文件：

- `assets/src/game/role.js`
- `assets/src/data/roleConfigTable.js`
- `assets/src/game/TalentService.js`
- `assets/src/data/talentConfigTable.js`
- `assets/src/game/IAPPackage.js`
- `assets/src/game/PurchaseService.js`

完成定义：

- `role.js` 不再保留与 `RoleConfigTable` 平行的一整套 fallback 数据表
- 新增角色主要改 `roleConfigTable.js`，最多补一处运行时解释，不再多处同步
- 新增天赋主要改 `talentConfigTable.js` 与天赋服务，不再被购买兼容细节牵着走
- `IAPPackage.js` 只保留解锁 / 兑换 / 兼容职责，不继续吞角色 / 天赋效果逻辑

### Phase 4: 特殊物品 / 武器机制归口

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

### Phase 5: 解锁 / 兑换 / 兼容链收口

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

### Phase 6: 按需处理的次级路线

这些不是当前主线，只在对应需求真的出现时再推进：

- 地图 / 站点边界
- 玩家生命周期外围
- 战斗展示层瘦身
- 商店展示与购买弹窗 UI

判断条件：

- 只有当新需求直接落在这些链路上，才把它们临时拉升优先级

## 5. 验证策略

### 仓库级验证

- `node tools/validate-content.js all --lang zh`
- `node tools/validate-content.js all --lang en`
- `node tools/smoke-runtime-boundaries.js`
- `node tools/smoke-startup.js`（高风险入口改动时默认执行）
- 后续补充：
  - `build`
  - `build-action`
  - 必要时补 `role-runtime`
- 针对改动文件做最小语法检查

### 单步推进协议

- 从现在开始，默认采用“做 1 步 -> 自动校验 -> 你人工验证 -> 再进入下一步”的节奏。
- 每一步的工作量上限：
  - 只允许 1 个明确行为变化点。
  - 最多只允许 1 个高风险入口文件承担行为变化。
  - 最多带 1 个配套文件（配置、smoke 或校验）一起改。
- 每一步完成后固定执行：
  - `node tools/smoke-runtime-boundaries.js`
  - `node tools/smoke-startup.js`
  - 如果改了 `Build.js` / `buildAction.js` / `buildConfig.js` / `buildActionConfig.js`，再补 `node tools/validate-content.js links build --lang zh`
  - 如果改动直接涉及建筑动作配置，再补 `node tools/validate-content.js links build-action --lang zh`
  - 若改动碰到文案或跨语言配置，再补对应的 `--lang en`
- 每一步结束标准：
  - 自动校验通过。
  - 明确写出本步人工验证清单。
  - 停在当前步，等待你回报“通过 / 失败 / 现象”。
- 任何一步人工验证失败：
  - 不进入下一步。
  - 只允许在当前步内修复，或直接回退当前步。
- 默认采用“1 步 1 提交”的粒度，便于快速定位和回退。

### 内容扩展专项回归

当改动与内容扩展相关时，优先做这些回归：

- 新角色可选择、可解锁、角色特性生效
- 新天赋可解锁、可选择、等级效果生效
- 新物品有图标、有文案、可获取、效果生效
- 新建筑可建造、可升级、可执行动作
- 新机制在对应服务挂点上能触发

### 地图 / 商店回归

- 只有当本轮真的改动地图 / 商店链时才做完整人工回归
- 对纯内容扩展，不再默认把地图 / 商店作为第一优先回归项

## 6. 当前真实状态与下一步

这部分以当前 `HEAD` 的真实代码为准，不再沿用已被回退提交影响的阶段描述。

### 6.1 当前阶段状态

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

- 仍在进行中，不能再写成“第一刀已经完成”。
- 之前一部分建筑 / 动作链收口尝试已随黑屏问题相关提交回退，当前代码里仍保留大量旧式硬编码边界。
- 这一轮已完成多组安全切口：`jin` / `luo` / `stranger` / `king` / `jie` / `yazi` / `bier` 这类角色标签动作显隐规则，以及 `powered` 这类运行时条件规则，已从 `RoleRuntimeService.js` 迁到 `formulaConfig.js`，并由 smoke 固定行为。
- 目前真实状态是：
  - `Build.js` 里仍有建筑特例与直接运行时访问。
  - `RoleRuntimeService.js` 顶部硬编码显隐分组已清空，动作显隐主流程现在主要走配置规则。
  - `buildAction.js` 虽已抽出 `BuildActionEffectService.js`，但还没有把旧分支骨架真正降到次要地位。

#### `Phase 3`

- 还不应正式展开。
- 当前主要阻塞点不是“没想清楚怎么做”，而是 `Phase 2` 没收住前，角色 / 天赋边界改造仍容易和购买兼容、UI 调用、旧全局逻辑交叉爆炸。

### 6.2 当前最主要的阻碍

1. **混合架构阻碍局部开发**
   - 现在同时存在脚本加载顺序驱动、全局单例驱动、局部服务化三套组织方式。
   - 新增一个内容点时，仍经常需要先判断“到底应该改配置、改服务、还是改旧全局文件”。

2. **建筑 / 动作链仍是当前第一阻碍**
   - 这条链直接决定后续加建筑、加动作、加角色特定动作时会不会继续全仓库扩散。
   - 如果这里不继续收口，后续内容扩展还会不断回流到 `Build.js` / `RoleRuntimeService.js` / `buildAction.js`。

3. **UI 仍然承担业务编排职责**
   - `uiUtil.js`、`dialog.js` 仍直接碰 `player`、战斗、购买、天赋与建筑逻辑。
   - 这会导致很多本应是“内容或服务层”的改动，最后仍要回头补 UI 旧分支。

4. **角色 / 天赋边界仍被旧购买兼容链牵制**
   - `role.js` fallback、`TalentService.js` 兼容职责、`IAPPackage.js` / `PurchaseService.js` 的角色天赋解锁语义还没有彻底拆清。
   - 所以“加人物 / 加天赋”虽然已经比过去好，但仍未达到真正局部修改。

5. **高风险入口仍然脆弱**
   - `assets/src/jsList.js`
   - `assets/src/game/game.js`
   - `assets/src/game/player.js`
   - `assets/src/game/site.js`
   - `assets/src/game/Build.js`
   - `assets/src/game/IAPPackage.js`
   - `assets/src/game/PurchaseService.js`
   - 这些文件仍要继续遵守“兼容式薄改、一次提交只让一个入口承担行为变化”的规则。

### 6.3 更新后的执行顺序（一步一验版）
1. **固定护栏：后续每一步都先过 smoke**
   - 高风险入口改动默认先过 `node tools/smoke-runtime-boundaries.js` 与 `node tools/smoke-startup.js`。
   - 这一步不再作为“待补任务”，而是后续每个微步骤的固定前置门槛。

2. **`Step 2.1`：`Build.js` 并发动作上限单点收口**
   - 范围上限：`assets/src/game/Build.js` + 1 个配套文件。
   - 只处理 `getConcurrentActionLimit()` 里 `id === 2` 的特例，不顺手改其他动作逻辑。
   - 自动校验：两层 smoke + `node tools/validate-content.js links build --lang zh`
   - 人工验证：`id === 2` 建筑升级后仍可同时占用 2 个动作槽，其余建筑仍保持 1 个。

3. **`Step 2.2`：`Build.js` 通电状态读取口统一**
   - 范围上限：`assets/src/game/Build.js` + 1 个配套文件。
   - 只处理 `ElectricStoveBuild.isActive()` 与 `ElectricFenceBuild.isActive()` 对 `player.map.getSite(WORK_SITE)` 的直连访问。
   - 自动校验：两层 smoke + `node tools/validate-content.js links build --lang zh`
   - 人工验证：工作站通电 / 断电时，这两个建筑的激活状态与现有表现一致。

4. **`Step 2.3`：`Build.js` 角色类型读取口统一**
   - 范围上限：`assets/src/game/Build.js` + 1 个配套文件。
   - 只处理 `RestBuild.initBuildActions()` 与 `Room.init()` 内的 `player.roleType` 读取。
   - 自动校验：两层 smoke + `node tools/validate-content.js links build --lang zh`
   - 人工验证：不同角色进入房间后，休息建筑动作列表与房间初始建筑状态保持不变。

5. **`Step 2.4`：`buildAction.js` 批量制作上限读口收口**
   - 范围上限：`assets/src/game/buildAction.js` + 1 个配套文件。
   - 只处理 `Formula.getMaxBatchCraftCount()` 里的背包读取，不提前改制作流程。
   - 自动校验：两层 smoke + `node tools/validate-content.js links build-action --lang zh`
   - 人工验证：支持批量制作的公式动作，最大批次数与背包材料数量保持一致。

6. **`Step 2.5`：`buildAction.js` 单次制作入口复用 `_runMakeAction(1)`**
   - 范围上限：`assets/src/game/buildAction.js` + 1 个配套文件。
   - 只处理 `Formula.clickAction1()` 在 `step === 0` 时的制作入口，让单次制作与批量制作共用同一条启动路径。
   - 自动校验：两层 smoke + `node tools/validate-content.js links build-action --lang zh`
   - 人工验证：普通配方的单次制作、批量制作入口都能正常开始，材料扣除与产出不变。

7. **`Step 2.6`：`TrapBuildAction` 复用 `Formula` 的制作启动路径**
   - 范围上限：`assets/src/game/buildAction.js` + 1 个配套文件。
   - 只处理 `TrapBuildAction.clickAction1()` 在 `step === 0` 时的启动分支，不改领取产出逻辑。
   - 自动校验：两层 smoke + `node tools/validate-content.js links build-action --lang zh`
   - 人工验证：陷阱类建筑的放置、等待、领取三段流程保持原样。

8. **`Step 2.7`：`DogBuildAction` 单类收口**
   - 范围上限：`assets/src/game/buildAction.js` + 1 个配套文件。
   - 只处理 `DogBuildAction` 的运行时读取 / 写入口，不顺手改其他动作类。
   - 自动校验：两层 smoke + `node tools/validate-content.js links build-action --lang zh`
   - 人工验证：喂狗动作、提示文案与可用状态保持一致。

9. **`Step 2.8`：`BombBuildAction` 单类收口**
   - 范围上限：`assets/src/game/buildAction.js` + 1 个配套文件。
   - 只处理 `BombBuildAction` 的激活状态读写，不顺手改狗舍或篝火逻辑。
   - 自动校验：两层 smoke + `node tools/validate-content.js links build-action --lang zh`
   - 人工验证：炸弹可激活、重复激活拦截、读档恢复状态三条路径保持一致。

10. **`Step 2.9`：`BonfireBuildAction` 单类收口**
    - 范围上限：`assets/src/game/buildAction.js` + 1 个配套文件。
    - 只处理篝火燃料 / 计时 / 温度更新这一类运行时边界，不与其他动作类合并。
    - 自动校验：两层 smoke + `node tools/validate-content.js links build-action --lang zh`
    - 人工验证：加燃料、燃尽、温度变化、读档恢复保持一致。

11. **`Phase 2` 连续稳定后，再进入 `Phase 3`**
    - 届时再处理 `role.js` fallback、`TalentService.js` 兼容边界、`IAPPackage.js` / `PurchaseService.js` 的职责收缩。
    - 购买链不作为当前主线单独深挖，但作为角色 / 天赋边界整顿时的配套阻塞项必须处理。

12. **地图 / 站点继续维持按需优先级**
    - 除非下一阶段目标直接要求新增站点类型、旅行规则或地图交互，否则不主动把主精力转到地图链。


一句话版：
- **`Phase 0.5` 第二层护栏已固定为默认前置；接下来按 `Step 2.1 -> Step 2.9` 的节奏，一次只动一个行为点，每做一步就先过 smoke、再做人工验证。**

