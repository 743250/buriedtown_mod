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

1. 不改启动链。
2. 不新建第二套 runtime。
3. 每一轮只收一个窄边界。
4. 新逻辑优先收进已有服务 / 配置表，不再新增平行 helper。
5. 只要新增一种内容类型，就同步补最小校验能力。

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
- 后续补充：
  - `build`
  - `build-action`
  - 必要时补 `role-runtime`
- 针对改动文件做最小语法检查

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

## 6. 当前下一步

这一轮已经把 `Phase 1` 的仓库级校验主入口补到位：

- `tools/validate-content.js` 已覆盖 `build` / `build-action`
- `role` 校验已补上 `roomBuilds / unlockSites / unlockNpcs / specialItems / zipline` 这类运行时配置边界
- `all` 默认检查现在会把建筑链一起纳入

这一轮已经完成 `Phase 2` 的第一刀：

- `Build.js` 不再自己维护那几组背包 / 购买动作显隐硬编码
- 动作锁定态与显隐规则已统一收口到 `RoleRuntimeService.js`
- 已为一批特殊配方补上动作级 `runtimeRule`，后续新增同类内容可以优先改动作配置

所以下一轮不再继续做第一刀收口，而是直接进入建筑动作链的第二刀。

具体顺序：

1. 先做 `Phase 2` 的第二刀：继续把 `buildAction.js` 里可复用的定时效果动作往 `BuildActionEffectService.js` 收。
2. 然后继续清理建筑动作链里仍按动作类型 / 特例散落的旧分支。
3. 等建筑 / 动作链明显稳定后，再进入 `Phase 3`，处理角色 / 天赋与旧购买兼容的边界问题。
4. 地图 / 购买链继续维持“按需回归，不主动深挖”的优先级。

一句话版：

- **Phase 1 已补完，Phase 2 第一刀已落地；下一步继续收 `buildAction.js`，再碰角色 / 天赋兼容。**
