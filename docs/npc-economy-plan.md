# NPC 真实库存与动态贸易定价 设计

> 状态：设计稿，未动代码。
> 范围：贸易品（NPC 经济）。
> 约束：遵守 CLAUDE.md §5 高风险入口清单与 §11 安全编码约定，先收口到服务层再说扩展。

## 1. 现状（代码事实）

- `NPCManager.updateTradingItem()`（`assets/src/game/npc.js:716`）每个游戏日的"白天"flag 调用一次，逻辑：
  ```
  this.storage = new Storage();
  for tier in 0..reputation: unlockTrading(tier);
  ```
  即**日出清空 NPC 仓库 → 按声望档位把 `npcConfig[i].trading[tier]` 全量塞回去**。
  → 玩家与 NPC 的交易痕迹在第二天日出全部归零，NPC 没有"持续库存"。
- `NPC._getTradeFavoritePrice(favorite, itemId)`（`npc.js:493`）只查 `npcConfig[i].favorite[reputation]` 里的固定 `price` 倍率。库存与价格脱钩。
- `_getTradeSummary` 用同一倍率算 payValue 与 takeValue，没有区分"NPC 收"和"NPC 卖"的方向。
- `npc.tradingCount` 字段已存在，自增点在 `assets/src/ui/npcStorageNode.js:158`，**当前游戏内没有读取**。
- 物品集合天然固定：例如雅子 (`npcConfig["4"]`) 始终喜欢咖啡豆 1105011 与零件 1101021/1101041/1101051/电子元件 1302043；卖的也始终是这些零件。

## 2. 设计目标

让 NPC 在每条时间线上"真的活着"：

- NPC 拥有**持续累积**的真实仓库（不再每日清零）。
- NPC **每日消耗** favorite 物品，**每日生产** trading 物品。
- 库存↔价格反向联动：
  - favorite（NPC 想要的）：库存越多 → 估值越低；库存低于阈值 → 估值上浮表示需求迫切。
  - trading（NPC 卖的）：库存越多 → 卖价越便宜；库存稀缺 → 涨价。
- 物品**集合**仍然固定（每个 NPC 卖什么、要什么不变），变的只是**数量**与**估值倍率**。

## 3. 架构边界（终局）

| 层 | 职责 | 落点 |
|----|------|------|
| 数据 | 物品集合 + 目标库存 + 基础价 | `assets/src/data/npcConfig.js`（扩展字段） |
| 服务 | 估值曲线 + 日产/日消公式 + 跨天补算 | **新建** `assets/src/game/NpcEconomyService.js` |
| 状态 | NPC 真实库存 + 上次结算日 | `assets/src/game/npc.js`（既有 `npc.storage` + 新增 `dailyTickDay`） |
| 装配 | jsList 顺序 | `assets/src/jsList.js`（新增 1 行，**排在 npc.js 之前**） |
| UI | 显示实时倍率 | `assets/src/ui/npcStorageNode.js`（**不改**，自动跟随） |

## 4. 数据层：扩展 `npcConfig.js`（向后兼容）

保留旧字段语义，新增**可选**字段；缺省则降级回旧行为。

### `favorite[tier][i]` 新增字段

| 字段 | 类型 | 含义 | 缺省 |
|------|------|------|------|
| `dailyConsume` | number | NPC 每日消耗该 item 的基础量 | `0`（不参与每日消耗，纯估值需求） |
| `targetStock` | number | NPC 期望保有的库存量（估值锚点） | `dailyConsume * 7` |
| `price`（旧） | number | **保留**，作为基础倍率（库存=targetStock 时的倍率） | 现状值 |

### `trading[tier][i]` 新增字段

| 字段 | 类型 | 含义 | 缺省 |
|------|------|------|------|
| `dailyProduce` | number | NPC 每日产出该 item 的基础量 | `num`（行为等价旧的"每日刷新量"） |
| `targetStock` | number | NPC 卖货时的期望库存 | `num * 3` |
| `basePriceMultiplier` | number | 库存=targetStock 时的卖价倍率 | `1.0` |
| `num`（旧） | number | **保留**，作为首次解锁该 tier 时的初始入库量（onboarding 用） | 现状值 |

第一阶段只对 **老罗 (1)** 与 **雅子 (4)** 补全新字段，其余 NPC 不动 → 走兼容降级，行为完全等价。

## 5. 服务层：`NpcEconomyService.js`

只读 + 纯函数，不持久化。所有"库存↔价格"换算与日结算公式集中在此文件。

### API

```text
NpcEconomyService.getFavoritePriceMultiplier(npc, itemId)
  → number；当前实时倍率（替代 _getTradeFavoritePrice 的固定 price）

NpcEconomyService.getTradingSellMultiplier(npc, itemId)
  → number；NPC 卖货倍率（库存丰富则 < 1，稀缺则 > 1）

NpcEconomyService.runDailyTick(npc, daysElapsed)
  → 结算日产/日消，更新 npc.storage；daysElapsed 用于读档跨天补算

// 内部辅助
NpcEconomyService.getFavoriteEntry(npc, itemId)
NpcEconomyService.getTradingEntry(npc, itemId)
NpcEconomyService._dumpForNpc(npcId)   // 开发期临时
```

### 估值曲线（建议初版）

```text
ratio = currentStock / targetStock            // 0 = 完全缺货, 1 = 刚好, >1 = 过剩

favoriteMultiplier = basePrice * clamp(2 - ratio, 0.5, 1.8)
  → 0 库存：     2.0 × basePrice（最贵收）
  → ratio = 1：  basePrice
  → ratio ≥ 1.5：~0.5 × basePrice（玩家屯太多，NPC 不感兴趣）

tradingMultiplier = baseMul * clamp(1.5 - 0.5*ratio, 0.7, 1.6)
  → 0 库存：     1.5 × baseMul（缺货涨价）
  → ratio = 1：  baseMul
  → ratio ≥ 1.6：0.7 × baseMul（库存堆积→打折）
```

clamp 边界与斜率作为可调常量放服务文件顶部，便于后续平衡。

## 6. NPC 行为层修改（最小化改动）

| 现状（npc.js） | 新行为 |
|-----|------|
| `_getTradeFavoritePrice(favorite, itemId)` 直接读 `itemInfo.price` | 委托 `NpcEconomyService.getFavoritePriceMultiplier(this, itemId)`；旧 `favorite` 形参保留作为兜底（无服务时仍取 `itemInfo.price`） |
| `_getTradeSummary(storage)` payValue/takeValue 都走 favorite 倍率 | payValue（玩家给 NPC）走 favorite；takeValue（玩家拿走 NPC 的）改走 `getTradingSellMultiplier`（库存稀缺涨价） |
| `unlockTrading(index, isUnlock)` 把 `trading[tier]` 全量加进 storage | 仅在**首次解锁该 tier**（isUnlock=true）时加入"初始库存"；常规日刷新不再走这里 |
| `updateTradingItem()` 清空 storage 后重塞所有 tier | 改为 `NpcEconomyService.runDailyTick(this, 1)`，按目标库存差量补给/消耗，**不再清零** |
| `getCurrentFavoriteTradeInfo()` 返回 `{itemId, price}` | 返回结构不变，但 `price` 改为实时倍率（service 算）→ UI 无需改 |
| `save()` / `restore()` | 增加 `dailyTickDay`（最近一次结算的游戏日，用 `Number(saveObj.dailyTickDay) ｜｜ 0` 兼容旧档） |

## 7. 时间钩子

- `assets/src/game/player.js:810` `addTimerCallbackDayAndNight` 的 `flag === 'day'` 分支保留 `self.npcManager.visitPlayer()` 与 `updateTradingItem()`，**不改 player.js**——`updateTradingItem` 内部行为已切换。
- 读档补算：`NPC.restore` 末尾，若 `dailyTickDay < currentGameDay`，调用 `NpcEconomyService.runDailyTick(this, currentGameDay - dailyTickDay)` 把缺失的日子算回来。
- 当前游戏日来源：`GameRuntime.getTimer().formatTime().d`。

## 8. 持久化

`PlayerPersistenceService.js` **不需要改**：

- `npcManager` 已注册（`PlayerPersistenceService.js:30 / :44`）。
- `NPC.save/restore` 已经持久化 `storage` 与 `tradingCount`。
- `dailyTickDay` 仅扩展 NPC 自己的 save 对象，反序列化兼容旧档。

## 9. UI 影响

`assets/src/ui/npcStorageNode.js` 与 `NpcNegotiationPanelController.js` **零改动**：

- "谈判情报"那行用的就是 `npc.getCurrentFavoriteTradeInfo()` → `{itemId, price}` 列表。`price` 字段语义升级为"实时倍率"后，原 `x1.2` 形式直接展示当前估值。
- `ItemExchangeNode.getTradeDelta` 走 `npc.getTradeRate1/2(storage)` → `_getTradeSummary` → 已委托到服务，自动跟随。

## 10. 阶段化推进

| 阶段 | 范围 | 退出条件 |
|------|------|----------|
| **P1** | 服务空骨架（`runDailyTick` 用旧逻辑回退） + 老罗/雅子 npcConfig 补字段 | smoke 通过；行为与现版等价 |
| **P2** | 启用动态倍率（`getFavoritePriceMultiplier` / `getTradingSellMultiplier`）；UI 自动跟随 | 雅子咖啡豆"屯货→降价"现象可观察 |
| **P3** | 启用日产/日消（`runDailyTick` 真正改变 storage） | 跨日库存收敛行为可观察；读档补算正确 |
| **P4** | 把剩余 6 个 NPC 的 npcConfig 也补全字段 | 全 NPC 动态化 |

任何阶段出问题立即回退：仅删除 `NpcEconomyService.js` + 撤销 `npcConfig` 字段 + 撤销 `npc.js` 委托即可，零结构性修改。

## 11. 改动文件清单

| 文件 | 改动类型 | 阶段 |
|------|---------|------|
| `assets/src/data/npcConfig.js` | 扩展（仅老罗/雅子） | P1 |
| `assets/src/game/NpcEconomyService.js` | **新增** | P1 |
| `assets/src/game/npc.js` | 修改（委托 + save 字段） | P1~P3 |
| `assets/src/jsList.js` | 增 1 行（NpcEconomyService 排在 npc.js 之前） | P1 |
| `assets/src/util/contentBlueprint.js` | 可选（npc 蓝图新增字段说明） | P3 之后 |

明确**不改**：

- `assets/src/game/player.js`（高风险入口，启动顺序不动）
- `assets/src/game/PlayerPersistenceService.js`
- `assets/src/ui/npcStorageNode.js` / `NpcNegotiationPanelController.js` / `ItemChangeNode`
- 其他 6 个 NPC 的 npcConfig 条目（P4 再处理）

## 12. 复用的现有能力

- `Storage.increaseItem` / `decreaseItem` / `getNumByItemId` / `forEach` —— `assets/src/game/Storage.js`
- `Item.getPrice()` —— `assets/src/game/Item.js`
- `TimerManager.formatTime().d` 取当前游戏日 —— `assets/src/game/TimeManager.js:144`
- 现有声望→tier 解析 `memoryUtil.decode(this.reputation)` —— 不动
- `addTimerCallbackDayAndNight` 已经按"白天" flag 调 `updateTradingItem` —— 直接复用，只换内部实现
- `npc.tradingCount` 字段已存在但当前未读 —— 后续可作为"该玩家本会话与此 NPC 交易热度"用于估值（**本期不接入**，留作后续平衡杠杆）

## 13. 验证

### 内容校验

```bash
node tools/validate-content.js all --lang zh
node tools/validate-content.js all --lang en
```

### 运行时 smoke

```bash
node tools/run-smoke.js
node tools/run-smoke.js runtime-boundaries startup
```

### 人工最小回归

1. **冷启动**：`MenuScene → ChooseScene → MainScene` 通过；老存档进游戏后 `npc.storage` 行为正常。
2. **价格联动**：进入老罗或雅子贸易界面 → 卖大量咖啡豆给雅子 → "谈判情报"那一行的咖啡豆倍率应**逐次下降**；过夜（推进到第二天 6 点）后倍率应回升一些（雅子消耗了部分咖啡豆）。
3. **稀缺涨价**：让雅子的零件 1101021 库存被玩家买空 → 重新打开 NPC 仓库，零件单价（`getTradeRate2` 端）应明显上调。
4. **跨天补算**：游戏内推进 3 个游戏日（或读档跨天），NPC 库存应朝 `targetStock` 收敛而不是被清零。
5. **未升级 NPC 兼容性**：老罗、杰夫、金医生等其它 NPC 无 `dailyConsume` / `dailyProduce` 字段时，行为应和旧版完全一致（每日刷新即"全量重置"行为不变）。
6. **天赋兼容**：`hasChosenTalent(123)` 谈判大师天赋下，`getCurrentFavoriteTradeInfo` 仍能正常显示倍率列表，倍率随交易动态变化。

## 14. 风险

1. **平衡风险**：曲线斜率/clamp 边界初版必然不完美。降到代码层风险为零的做法：把所有曲线常量集中在服务文件顶部，调参不需要重启项目结构。
2. **跨天补算精度**：`runDailyTick(npc, n)` 当 n 很大时按 n 次循环算 vs 闭式解算。本期实现按 n 次循环（最多 30 天循环成本可控），保证语义清晰。
3. **声望档位升级**：玩家声望升档时，老逻辑通过 `unlockTrading(start, true)` 注入新 tier 全量库存。新模型保留这条路径作为"声望奖励=一次性入库"——是合理的"解锁奖励"，但要确认不会和"日产"重复加发。实现时 `unlockTrading` 仅在 `isUnlock=true` 时入库（已是当前行为）。
4. **存档兼容性**：`dailyTickDay` 缺省 0 时跨天补算可能一次性补很多日。**保护**：`runDailyTick` 内对 `daysElapsed` clamp 到 30，避免老存档读出后产生不合理库存膨胀。

## 15. 后续可拓展（不在本计划范围内）

- 把 `npc.tradingCount` 接入估值曲线（玩家高频交易某 NPC → 价格波动更敏感）
- NPC 之间互通有无：在 `runDailyTick` 时按 `RoleConfigTable.visitorNpcIds` 关系做物物补给（非常符合"另一时间线的玩家"叙事）
- favorite 物品由 NPC 自己消费转化为"心情奖励"或"声望额外回赠"
- 角色作为玩家时，玩家行动后该角色对应 NPC 在另一存档线的库存消耗与生产是否要双向影响（现阶段不考虑）

---

## 16. 各 NPC 生产 / 消耗 明细

> 真相源：`assets/src/data/npcConfig.js`（trading / favorite 列表）；本节是**默认初值表**，会作为第一阶段写入 `npcConfig` 的 `dailyProduce` / `dailyConsume` / `targetStock` 字段。
> 数值原则：
> - **生产**默认 = `trading[tier].num`（即旧字段语义保留），高声望档位多产。
> - **消耗**按 NPC 人设给一个**小常量**（默认 1/天），以防玩家不交易时 NPC 库存无穷膨胀。
> - **目标库存** = `产量 × 3`（trading 物品） / `消耗 × 7`（favorite 物品），作为价格曲线锚点。
> - NPC 7（测试人物）、NPC 8（贝尔，无 trading/favorite）**不参与经济**，不广播。

### 16.1 NPC 1 — 老罗（武器/弹药）

| 方向 | 物品 | 含义 | 日量（默认） | 目标库存 |
|------|------|------|-------------|---------|
| 产 | 1305011 子弹 | 主产；tier0 每日 ×8，tier1+ ×3 | 8 / 3 | 24 / 9 |
| 产 | 1303022 自制炸药 | 中后期解锁 | 1 | 3 |
| 产 | 1102011 坏的手枪 | 中后期解锁 | 2 | 6 |
| 产 | 1303012 僵尸诱饵 | 中后期解锁 | 1 | 3 |
| 产 | 1102022 坏的猎枪 | 中后期解锁 | 2 | 6 |
| 产 | 1102033 坏的自动步枪 | 高声望解锁 | 3 | 9 |
| 消 | 1105022 酒 | 人设：嗜酒如命（`string_zh.js:929`） | 1 | 7 |
| 消 | 1105033 酒精 | 人设：枪械保养 | 1 | 7 |
| 消 | 1305011 子弹 | **不消耗**（自产自销，避免抵消生产）→ favorite 仅作为收购意向，不进入 `dailyConsume` | 0 | — |

说明：老罗 favorite 里包含 1305011 子弹（自己也生产），跨方向冲突，**仅保留为"愿意从玩家手里收购"语义**，不参与日消。

### 16.2 NPC 2 — 金医生（药品）

| 方向 | 物品 | 含义 | 日量 | 目标库存 |
|------|------|------|------|---------|
| 产 | 1104021 药剂 | tier0 ×1，tier1 ×1 | 1 | 3 |
| 产 | 1104011 绷带 | tier0~2 各 ×1 | 1 | 3 |
| 产 | 1104043 青霉素 | 高声望解锁 ×1 | 1 | 3 |
| 消 | 1103011 土豆 / 1103022 烤土豆 / 1103033 土豆泥 | 人设：经常挨饿（`string_zh.js:933`），从仓库**任选 1 件食物** ×1 | 1 | 7 |
| 消 | 1103041 肉 / 1103052 肉汤 / 1103063 烤肉 / 1103074 风味炖菜 / 1103083 罐头 | 同上，"任一食材"消耗，按库存优先级随机 | — | — |
| 消 | 1104011 / 1104021 / 1104043 药品 | **不消耗**（自产自销） | 0 | — |

说明：金医生 favorite 中既有食材又有自产药品，**只把食材计入消耗**；药品 favorite 仅保留收购意向。
"任一食材消耗" 实现：一个虚拟桶，按 `[1103011, 1103022, ..., 1103083]` 顺序取第一个有库存的扣 1。

### 16.3 NPC 3 — 杰夫（木材）

| 方向 | 物品 | 含义 | 日量 | 目标库存 |
|------|------|------|------|---------|
| 产 | 1101011 木质材料 | tier0 ×10，tier1+ ×2 | 10 / 2 | 30 / 6 |
| 产 | 1101031 柔性材料 | tier0 ×5，tier1+ ×1 | 5 / 1 | 15 / 3 |
| 消 | 1302011 撬棍 | 人设：工具损耗大（`string_zh.js:939`） | 1 | 7 |
| 消 | 1302021 斧头 | 同上 | 1 | 7 |
| 消 | 1302043 电锯 | 同上，但稀有，消耗减半 | 0.5（隔天 1）| 7 |
| 消 | 1101011 / 1101031 木材 | **不消耗**（自产自销） | 0 | — |

实现"0.5"：`dailyConsume=0.5` 由 service 累积小数，达到 1 才扣 1（避免每天扣电锯过快）。

### 16.4 NPC 4 — 雅子（零件/电子）

| 方向 | 物品 | 含义 | 日量 | 目标库存 |
|------|------|------|------|---------|
| 产 | 1101021 金属材料 | tier0 ×6，tier1+ ×1 | 6 / 1 | 18 / 3 |
| 产 | 1101041 零件 | tier0 ×6 | 6 | 18 |
| 产 | 1101051 电器元件 | tier0 ×3 | 3 | 9 |
| 产 | 1302043 电锯 | tier0 ×1 | 1 | 3 |
| 消 | 1105011 咖啡豆 | 人设强烈：要是有更多咖啡豆就好了（`string_zh.js:944`） | 2 | 14 |
| 消 | 1101021 / 1101041 / 1101051 / 1302043 | **不消耗**（自产自销） | 0 | — |

雅子是"咖啡豆消耗大户"——这是观察 §10 P2 验证用例最敏感的指标。

### 16.5 NPC 5 — 比尔（神秘商人）

| 方向 | 物品 | 含义 | 日量 | 目标库存 |
|------|------|------|------|---------|
| 产 | 1107012 原浆血清 | 高声望解锁 ×1 | 1 | 3 |
| 产 | 1107022 转移因子 | 高声望解锁 ×1 | 1 | 3 |
| 产 | 1107032 兴奋剂 | 高声望解锁 ×1 | 1 | 3 |
| 产 | 1107042 军用口粮 | 高声望解锁 ×1 | 1 | 3 |
| 产 | 1303044 强效手雷 | 中后期 ×1 | 1 | 3 |
| 消 | 1101073 数据模组 | 人设：商业机密（`string_zh.js:949`），用数据模组运算 | 1 | 7 |

比尔的特点：**只消耗一种稀缺物品**，但产出非常珍贵 → 数据模组库存对所有珍稀物品价格都有影响（玩家持续供数据模组才能让珍稀物品保持充足）。

### 16.6 NPC 6 — 陌生人（资源整合）

| 方向 | 物品 | 含义 | 日量 | 目标库存 |
|------|------|------|------|---------|
| 产 | 1105022 酒 | 全 tier ×1 | 1 | 3 |
| 产 | 1101071 化学材料 | 全 tier ×1 | 1 | 3 |
| 产 | 1103074 风味炖菜 | tier0~4 ×1 | 1 | 3 |
| 消 | 1305011 子弹 | 自卫消耗（人设：在荒野中生存） | 1 | 7 |
| 消 | 1103074 风味炖菜 | **不消耗**（自产自销） | 0 | — |
| 消 | 1105022 酒 | **不消耗**（自产自销） | 0 | — |

陌生人 favorite 与 trading 高度重合（风味炖菜/酒都是自产又自收），**只把不重合的子弹计入消耗**。

### 16.7 NPC 7 / 8

- NPC 7（测试人物）、NPC 8（贝尔·格里尔斯）：`favorite` / `trading` 为空 → `NpcEconomyService` 直接 `return`，不参与日结算、不广播。

### 16.8 通用规则（落进 service 顶部常量）

```
PRICE_SHIFT_BROADCAST_THRESHOLD = 0.15   // 倍率变化 ≥ 15% 才广播
DAILY_CONSUME_DEFAULT_BUCKET     = 1     // 食材桶/工具桶每日扣 1
TARGET_STOCK_PRODUCE_RATIO       = 3     // trading 目标库存 = num × 3
TARGET_STOCK_CONSUME_RATIO       = 7     // favorite 目标库存 = consume × 7
DAYS_ELAPSED_CLAMP               = 30    // 跨天补算上限
```

`自产自销` 物品的判定：`trading.itemId ∩ favorite.itemId` 取交集，**仅作收购意向，不计入 `dailyConsume`**。这条规则放 `NpcEconomyService.getEffectiveConsume(npc, itemId)` 一处统一处理，避免每个 NPC 配置里手工标记。

---

## 17. 电台联动（涨/降价广播）

### 17.1 触发链路

```
NpcEconomyService.runDailyTick(npc, daysElapsed)
   ├─ 算出每个 itemId 的旧倍率 oldMul / 新倍率 newMul
   ├─ 若 |newMul - oldMul| / oldMul ≥ PRICE_SHIFT_BROADCAST_THRESHOLD
   │     emit "npcEconomy:priceShift" {
   │         npcId, itemId, kind: "favorite"|"trading",
   │         oldMul, newMul, dir: "up"|"down", gameDay
   │     }
   └─ 更新 npc.lastBroadcastMul[itemId] = newMul
```

### 17.2 监听点：**新增** `RadioFeedService`（不是 RadioNode）

理由：电台节点 `RadioNode` 仅在玩家进入电台建筑时存在；如果只在 RadioNode 监听，离开建筑期间的播报会丢。所以监听放轻量服务：

```
RadioFeedService
  ├─ buffer: [{kind:"npc_economy", npcId, itemId, dir, oldMul, newMul, time, gameDay}]
  ├─ MAX_BUFFER = 30
  ├─ on("npcEconomy:priceShift") → push 到 buffer，超长 shift 头
  ├─ getFeed() → RadioNode 打开时一次性读取
  ├─ save()/restore() → 走 GameRuntime 持久化
  └─ jsList 装配点：排在 npc.js 之前、NpcEconomyService 之后
```

### 17.3 前端改造：`MessageView.createOneItem`（`assets/src/ui/LogView.js:76`）

按 `log.kind` 分支：

| log.kind | 现状/新增 | 渲染 |
|----------|---------|------|
| 网络聊天（默认/无 kind） | **不变** | 时间 + 文本 双行（现行行为） |
| `"npc_economy"` | **新增** | 左侧 NPC 头像 sprite + 右侧（NPC 名 + 物品名 + 涨/降文案 + 倍率），整行带颜色：涨=`UITheme.colors.TEXT_ERROR`（红，已存在 `util/uiTheme.js:16`） / 降=`UITheme.colors.TEXT_SUCCESS`（绿，已存在 `util/uiTheme.js:17`） |

头像取法：`IconHelper.getRoleMapFrameName(npcId, true)` → `#npc_<id>.png`，用 `autoSpriteFrameController` 装载。**不裸取 sprite**（CLAUDE.md §13）。
头像尺寸：地图头像 56×56，行高约 40~50，按比例缩到 36×36 即可。

### 17.4 RadioNode 注入（`assets/src/ui/radioNode.js`）

- `_init` 末尾：从 `RadioFeedService.getFeed()` 取本地缓冲，逐条 `addLocalSystemMsg`
- `addLocalSystemMsg(log)`：直接 `this.msgView.addLog(log)`，**不走** `networkUtil.requestData("sendMsg")` —— 严禁污染服务器
- 去重：本地系统消息无 `_id`，按 `kind + npcId + itemId + gameDay` 三元组判重（同一天同一 NPC 同一物品只显示一条最新的）
- 监听 `utils.emitter.on("npcEconomy:priceShift")`：玩家**正在电台建筑里**时，新事件实时 push；离开时不监听（由 RadioFeedService 缓冲）

### 17.5 文案

新增 string id（位置：`assets/src/data/string/string_zh.js`，分配区间待定）：

| string id | 模板 |
|-----------|------|
| TBD-A | `[来自 {0}] {1} 收购价上涨 {2}%` |（favorite 涨）
| TBD-B | `[来自 {0}] {1} 收购价下跌 {2}%` |（favorite 跌）
| TBD-C | `[来自 {0}] {1} 卖价上涨 {2}%（库存吃紧）` |（trading 涨）
| TBD-D | `[来自 {0}] {1} 卖价下跌 {2}%（库存堆积）` |（trading 跌）

`{0}` = `npc.getName()` ；`{1}` = `stringUtil.getString(itemId).title` ；`{2}` = `Math.round((newMul/oldMul - 1) * 100)` 取绝对值。

en 版同步补一份；`tools/validate-content.js all --lang en` 必过。

### 17.6 不做 / 边界

- **不发送服务器**：RadioNode 现有 `sendMsg` 路径完全不动
- **不在 RadioNode 监听 emitter 作为唯一路径**：必须经 RadioFeedService 缓冲
- **不广播 NPC 7 / NPC 8**（参与不了经济）
- **不广播未解锁的 NPC**：在 `RadioFeedService` 写入 buffer 前判断 `npc.isUnlocked`；未解锁则丢弃（避免剧透）
- **不每笔交易广播**：交易当下只更新库存，倍率变化在**第二天 `runDailyTick`** 才计算和广播——和规格 2 对齐
- **不广播 0% 变化**：阈值过滤兜底

### 17.7 阶段对齐

| 阶段 | 经济侧 | 电台侧 |
|------|-------|-------|
| P1 | 服务空骨架 + npcConfig 字段 | 不动 |
| P2 | 启用动态倍率 | **此时电台开始有可广播事件**：补 RadioFeedService + MessageView 分支 |
| P3 | 启用日产/日消 | 文案稳定后扩文案 id；阈值微调 |
| P4 | 全 NPC 字段补齐 | 自动跟随，无需改电台 |

---

## 18. 改动文件清单（合并 §11 与新增项）

| 文件 | 改动类型 | 阶段 |
|------|---------|------|
| `assets/src/data/npcConfig.js` | 扩展（老罗/雅子优先 → P4 全 NPC） | P1 / P4 |
| `assets/src/game/NpcEconomyService.js` | **新增** | P1 |
| `assets/src/game/npc.js` | 修改（委托 + save 字段） | P1~P3 |
| `assets/src/game/RadioFeedService.js` | **新增** | P2 |
| `assets/src/jsList.js` | 增 2 行（NpcEconomyService、RadioFeedService 排在 npc.js 之前） | P1 / P2 |
| `assets/src/ui/LogView.js` | `MessageView.createOneItem` 新增 `kind="npc_economy"` 分支（不动现有路径） | P2 |
| `assets/src/ui/radioNode.js` | `_init` / `addMsg` 接入 RadioFeedService + 监听 emitter | P2 |
| `assets/src/data/string/string_zh.js` + `string_en.js` | 新增 4 条广播文案 string id | P2 |
| `assets/src/util/contentBlueprint.js` | 可选（npc 蓝图新增字段说明） | P3 之后 |

明确**不改**（与 §11 一致 + 补充）：

- `assets/src/game/player.js`
- `assets/src/game/PlayerPersistenceService.js`
- `assets/src/util/networkUtil.js`（绝对不增加广播相关请求）
- 联网聊天既有逻辑（getMsg / sendMsg / Record.getUUID 染色路径）

---

## 19. 人工最小回归（增补，与 §13 合并）

在 §13 已有 6 条之外补：

7. **电台头像渲染**：进入电台建筑，看到至少 1 条 `npc_economy` 消息，左侧头像应正确显示对应 NPC（雅子=`npc_4.png`、老罗=`npc_1.png`）。
8. **涨跌染色**：涨价消息文本染红（`UITheme.colors.TEXT_ERROR`），降价消息染绿。
9. **未解锁不剧透**：仅解锁老罗，给雅子的咖啡豆库存做出价格变化 → 电台**不应**出现雅子相关消息。
10. **跨天缓冲**：在非电台场景下推进 3 天，库存满足变价条件 → 进入电台后能一次性看到这 3 天的播报（最多 30 条，按 `MAX_BUFFER` 截断）。
11. **网络聊天不受影响**：电台依旧能拉/发其他玩家聊天；自己发的消息仍然染红（`LogView.js:88-90` 现行逻辑保留）。
12. **不污染服务器**：抓包/日志确认 `npc_economy` 消息**不触发** `networkUtil.requestData("sendMsg")`。
