# BuriedTown `assets/src/game` 架构治理计划

## 1. 计划目的

这份计划聚焦 `assets/src/game` 的运行时架构治理，目标不是“把文件拆得更碎”，而是解决下面几类已经影响后续开发效率的问题：

1. **全局状态入口过多**
   - `player`
   - `cc.timer`
   - `utils.emitter`
   - `Record`

   当前很多模块直接读取或写入这些对象，导致一个小需求容易扩散到多个文件。

2. **模块边界不统一**
   - 一部分文件是全局脚本风格
   - 一部分文件又支持 `require` / `module.exports`
   - 还有大量 `typeof xxx !== "undefined"` 的兼容分支

   这种“半模块化”状态让依赖关系难以预测，也让加载顺序和兼容逻辑混在一起。

3. **核心对象职责过重**
   - `player.js` 仍然承担过多协调与业务细节
   - `buildAction.js` 同时承载规则、计时、副作用、UI 触发
   - `BattleScene.js` 和 `Battle.js` 存在双轨实现倾向

4. **新旧架构并存但收口不彻底**
   - 已经有 `PlayerPersistenceService`、`PlayerNavigationState`、`TravelService`、`BattleSettlementService` 等较好的服务层
   - 但旧入口仍在继续吸收业务逻辑，导致“理论上已抽离，实际上仍要全仓库找改动点”

这轮治理的成功标准只有三个：

1. **一个中小需求的默认改动路径更可预测**
2. **新增逻辑优先落在服务或配置，而不是继续堆到全局对象**
3. **场景/UI 文件不再持有新的核心业务规则**

---

## 2. 范围

本计划只覆盖 `assets/src/game` 目录下的运行时与领域逻辑，重点关注以下文件和链路：

- 启动与运行时装配：`game.js`
- 玩家核心：`player.js`
- 时间系统：`TimeManager.js`
- 地图 / 导航：`map.js`、`PlayerNavigationState.js`、`TravelService.js`
- 建筑 / 动作：`Build.js`、`buildAction.js`、`BuildActionEffectService.js`
- 战斗：`Battle.js`、`BattleScene.js`、`BattleActors.js`、`BattleEquipmentSystem.js`
- 存档恢复：`PlayerPersistenceService.js`
- 站点与奖励：`site.js`、`SiteRewardService.js`、`SiteRoomGenerator.js`

不在本轮优先范围内的内容：

- 纯展示层美化
- 低频外围系统的小型命名整理
- 没有明显降低维护成本的目录重排
- 以“统一风格”为名但没有减少改动落点的抽象

---

## 3. 核心原则

### 3.1 先收高扇出边界，再处理局部重复

优先治理会向全仓库扩散影响的入口：

- 全局状态访问
- 场景直接驱动业务
- 旧兼容层继续吸收新逻辑

不优先治理只影响单文件阅读体验的局部重复。

### 3.2 新逻辑必须落在明确层次

后续新增逻辑必须优先落在以下层次之一：

1. **Config / Data**
2. **Domain Service**
3. **Runtime Entity / State**
4. **UI Controller / Scene**
5. **Compat / Adapter**

其中：

- **Scene / UI** 不负责新增业务规则
- **Compat / Adapter** 不负责新增核心玩法推导
- **Runtime Entity** 只保存状态和少量天然属于对象本身的行为
- **Domain Service** 负责解释规则和组合流程

### 3.3 不再新增平行实现

本轮治理明确禁止：

- 再造一套新的战斗运行时而旧实现不收口
- 再造一套新的建筑动作入口而旧入口继续增长
- 新增“看起来更现代”的目录，但旧调用链完全不迁移

### 3.4 每一步都必须留下可验证边界

每个阶段完成后，至少要能回答两个问题：

1. 新增一个同类需求时，默认先改哪两个文件？
2. 如果行为异常，默认先看哪个服务而不是全仓库 grep？

---

## 4. 当前问题清单

### P1. 运行时上下文散落

现状：

- `game.js` 负责初始化 `player`、`Emitter`、`TimerManager`
- 但大多数业务模块直接拿全局对象用，缺少统一上下文入口

后果：

- 依赖不透明
- 难以做最小验证
- 新服务经常被迫继续使用全局对象

### P2. `Player` 仍然是事实上的上帝对象

现状：

- 已有 `PlayerPersistenceService`、`PlayerAttrService`、`PlayerNavigationState`
- 但 `player.js` 仍承担大量流程编排、属性变化、副作用触发、跨系统协调

后果：

- 新功能很容易继续堆进 `player.js`
- 玩家相关问题仍需要从大文件入口开始排查

### P3. 建筑动作链职责混杂

现状：

- `buildAction.js` 同时处理动作定义、消耗校验、计时、结算、副作用、UI 事件
- 仍直接依赖 `player`、`cc.timer`、`utils.emitter`、`Record`

后果：

- 新增建筑动作时改动路径不可预测
- 规则和展示很难独立验证

### P4. 战斗链路存在双轨

现状：

- `Battle.js` 明显在向可测试 runtime 收敛
- `BattleScene.js` 仍内置一套偏完整的战斗对象与 UI 控制逻辑

后果：

- 战斗规则可能出现两套解释
- 未来改平衡、改武器、改结算时容易分叉

### P5. 模块风格混用

现状：

- 同目录下同时存在全局脚本、Node 风格导出、运行时兼容守卫

后果：

- 文件边界不稳定
- 依赖方向不清楚
- 兼容代码容易继续污染业务层

---

## 5. 执行顺序

> 顺序固定为：先稳住运行时边界，再收口高频业务链，最后统一模块边界与验证。不能跳步。

### Phase 1：建立统一运行时上下文入口

定位：**先减少全局状态的直接扩散，不先拆大文件。**

目标：

- 为 `player`、`timer`、`emitter`、`record` 建立单一运行时访问入口
- 新服务默认依赖运行时上下文，而不是直接读写全局变量
- 旧全局变量暂时保留，但只作为兼容出口，不再作为新逻辑主入口

要做什么：

1. 在 `game.js` 附近建立统一的运行时上下文对象或适配层
2. 先让高扇出服务通过该入口取依赖
3. 明确哪些对象属于运行时单例，哪些对象属于领域服务
4. 给旧代码提供最小兼容桥，避免一次性大迁移

本阶段优先改动链路：

- `game.js`
- `player.js`
- `buildAction.js`
- `map.js`
- `TravelService.js`

完成标准：

- 新增一个服务时，不再默认直接访问 `player` / `cc.timer` / `utils.emitter`
- 至少一条高频链路已经改为通过统一上下文取运行时依赖
- 旧全局变量不再继续成为新增代码的首选入口

停止标准：

- 只做到“新代码有统一入口”即可
- 不在这一阶段追求把所有旧全局调用一次性清零

最小验证：

- 游戏启动 smoke test
- 读档 / 新开局 smoke test
- 一个依赖计时器的动作 smoke test

### Phase 2：收口 `Player`，把它降为协调者

定位：**让 `Player` 负责组装流程，不继续沉淀具体规则。**

目标：

- `player.js` 不再继续增长新的业务规则分支
- 玩家属性、导航、持久化、跨系统副作用各自有固定落点
- 玩家相关问题能先定位到具体服务，而不是默认先看 `player.js`

要做什么：

1. 继续把属性变更与范围副作用收口到 `PlayerAttrService`
2. 把导航与地图位置状态严格收口到 `PlayerNavigationState` + `TravelService`
3. 让 `PlayerPersistenceService` 继续保持唯一存档入口
4. 为 `player.js` 制定明确约束：只保留装配、委托、少量生命周期流程

本阶段优先改动链路：

- `player.js`
- `PlayerAttrService.js`
- `PlayerPersistenceService.js`
- `PlayerNavigationState.js`
- `TravelService.js`

完成标准：

- 新增一个玩家状态规则时，默认先看服务而不是 `player.js`
- `player.js` 不再新增新的 `itemId` / `roleType` / 特例规则分支
- 玩家相关主流程已经能按“属性 / 导航 / 存档”三类快速定位

停止标准：

- 只收高频玩家规则
- 不为了纯粹把所有旧委托方法全部删掉

最小验证：

- 属性变化回归
- 休息 / 时间流逝回归
- 读档后位置与状态恢复回归

### Phase 3：建筑动作链分层，规则与表现彻底分开

定位：**把当前最容易扩散的建筑动作链收口成“定义 - 执行 - 表现”三层。**

目标：

- 新增建筑动作时，默认改动路径稳定
- 规则结算和 UI 副作用分离
- 计时与存档交互不再散落在动作定义里

要做什么：

1. 把 `buildAction.js` 中的动作定义与执行流程拆开
2. 用统一执行入口承接消耗、产出、计时、结算
3. 让 `BuildActionEffectService` 只负责展示和交互反馈
4. 逐步消除动作定义中对 `player`、`cc.timer`、`Record`、`utils.emitter` 的直接依赖

本阶段优先改动链路：

- `buildAction.js`
- `Build.js`
- `BuildActionEffectService.js`

完成标准：

- 新增建筑动作时，默认只改动作定义与执行服务，不直接改 UI 辅助逻辑
- 建筑动作计时与结算已经有单一主入口
- 建筑动作异常可优先定位到规则层或表现层之一

停止标准：

- 先覆盖高频建筑动作
- 不追求一次性重写所有历史动作类

最小验证：

- 一个即时动作 smoke test
- 一个计时动作 smoke test
- 动作完成后的存档恢复 smoke test

### Phase 4：战斗运行时单轨化

定位：**必须选定一套战斗规则主入口，场景层只做展示与交互。**

目标：

- `Battle.js` 成为唯一战斗规则与结算主入口
- `BattleScene.js` 只保留场景、输入、动画、展示协调职责
- 战斗相关角色、装备、结算不再出现双重解释

要做什么：

1. 明确 `Battle.js`、`BattleActors.js`、`BattleEquipmentSystem.js` 的职责边界
2. 盘点 `BattleScene.js` 中重复承载的战斗模型与规则
3. 将重复规则逐步迁移到 runtime 层
4. 给 `BattleScene.js` 留下清晰的调用入口，不再新增玩法规则

本阶段优先改动链路：

- `Battle.js`
- `BattleActors.js`
- `BattleEquipmentSystem.js`
- `BattleSettlementService.js`
- `BattleScene.js`

完成标准：

- 新增或调整战斗规则时，默认改 runtime 层而不是 scene 层
- 战斗结算、角色快照、装备效果只有一套主实现
- `BattleScene.js` 不再新增业务规则分支

停止标准：

- 只先收高频规则与结算链路
- 不要求先统一所有动画、节点组织和表现细节

最小验证：

- 一场普通战斗 smoke test
- 一场带装备效果的战斗 smoke test
- 战斗结算与掉落回归

### Phase 5：统一模块边界，兼容层后移

定位：**在主链路收口后，再处理模块风格混用问题。**

目标：

- 形成清晰的模块规范：哪些文件是 runtime module，哪些文件是 compat adapter
- 兼容守卫不再散落于核心规则文件
- 新增服务默认遵循统一导出方式

要做什么：

1. 为 `assets/src/game` 约定统一模块边界
2. 优先处理高扇出服务文件的导出方式
3. 把运行时缺失兜底、加载顺序兼容等逻辑逐步后移到兼容层
4. 清理只因历史装载方式留下的重复守卫

优先治理对象：

- `Battle.js`
- `site.js`
- `TalentService.js`
- `ItemRuntimeService.js`
- 其余高扇出服务文件

完成标准：

- 核心规则文件的导出方式可预测
- 新增模块不再默认复制 `typeof xxx !== "undefined"` 守卫模板
- 兼容逻辑有明确归属，不继续污染业务层

停止标准：

- 先统一高扇出文件
- 不为了风格统一一次性触碰全部历史文件

最小验证：

- 核心高频链路加载 smoke test
- Node 侧可执行模块的最小 require 验证

### Phase 6：补齐最小回归验证

定位：**只补高频链路的最小验证，不建大而全测试体系。**

目标：

- 给启动、存档、导航、建筑动作、战斗建立最小回归面
- 让后续收口改动能尽早暴露边界破坏

执行顺序：

1. 启动 / 读档 / 新开局
2. 地图导航 / 旅行
3. 建筑动作
4. 战斗 runtime 与结算

完成标准：

- 每条高频链路至少有一个最小 smoke test 或可重复执行验证入口
- 架构治理后的主边界已有基础回归兜底

停止标准：

- 只覆盖高频主链路
- 不扩展成大规模 UI 自动化框架

---

## 6. 优先级判断

当前优先级固定为：

1. **Phase 1：统一运行时上下文入口**
2. **Phase 2：收口 `Player`**
3. **Phase 3：建筑动作链分层**
4. **Phase 4：战斗运行时单轨化**
5. **Phase 5：统一模块边界**
6. **Phase 6：补齐最小回归验证**

这样排序的原因：

- 不先收运行时边界，后面任何拆分都会继续依赖全局变量
- 不先收 `Player` 和建筑动作，新增内容仍会落到最大文件
- 不先处理战斗双轨，后续战斗修改会继续累积分叉成本
- 模块风格统一要放在主链路收口之后，否则很容易只做成“表面整理”

---

## 7. 本轮明确不做

- 不以“目录更现代”为目标重排整个 `assets/src/game`
- 不新造一层没有实际落点收益的 service wrapper
- 不在没有统一 runtime 主入口前大规模搬迁低频模块
- 不为了追求零全局访问而一次性重写所有旧逻辑
- 不优先处理纯 UI 组织问题
- 不把内容配置校验扩大成新的长期主线

---

## 8. 更新规则

- 后续执行以本文件为唯一顺序来源
- 若某阶段没有显著降低默认改动路径的不确定性，不得宣告完成
- 若出现新需求，优先把它放入已有阶段处理，不新增平行阶段
- 任何新增计划项都必须回答：它减少了哪类需求的改动文件数？
