# 重构优先级清单（压缩上下文）

适用目的：
- 快速恢复项目重构状态。
- 约束后续功能落点，避免继续把新功能堆进旧核心。
- 给出接下来几轮工作的固定顺序。

---

## 1. 当前判断

项目处于“中期重构、兼容层最厚”的阶段。

不是纯旧代码，但也还没进入安全期。
外围已经出现新模块和新服务层，核心枢纽仍然主要由旧代码掌控。

结论：
- 可以继续重构。
- 不适合继续在旧核心上直接叠新功能。
- 现在最重要的不是“多拆几个文件”，而是先让一条链路彻底由新入口接管。

---

## 2. 已经成型的部分

- 地图移动链路：
  - `src/game/TravelService.js`
  - `src/game/TravelRuntime.js`
  - `src/game/PlayerNavigationState.js`
  - `src/ui/MapInteractionController.js`
- 购买入口收口已开始：
  - `src/game/PurchaseService.js`
- 成就页 UI 已形成“新视图 + 旧场景薄壳”：
  - `src/ui/MedalSceneView.js`
  - `src/ui/medalLayer.js`
- 战斗和天赋已开始拆子模块：
  - `src/game/BattleSummary.js`
  - `src/game/BattleSettlementService.js`
  - `src/game/BattleActors.js`
  - `src/game/TalentService.js`

这些地方说明方向没问题。

---

## 3. 当前高风险枢纽

以下文件暂时视为“风险中心”，不要直接往里堆新功能：

- `src/game/player.js`
- `src/game/site.js`
- `src/game/IAPPackage.js`
- `src/game/buildAction.js`
- `src/ui/dialog.js`
- `src/ui/uiUtil.js`
- `src/ui/battleAndWorkNode.js`

原因：
- 同时承担旧逻辑、新逻辑、fallback、兼容迁移。
- 依赖多，回归面大。
- 一处改动容易影响多个系统。

---

## 4. 重构顺序

### Phase 1：购买 / IAP 链路先彻底收口

目标：
- 所有支付结果解释、补发、取消购买、解锁记录，都只在一个入口层处理。
- UI 只接收统一结果，不再各自写 `payResult == 0/1` 和“手动补发”逻辑。

优先文件：
- `src/game/PurchaseService.js`
- `src/util/utils.js`
- `src/ui/shopScene.js`
- `src/ui/shopNode.js`
- `src/ui/deathNode.js`
- `src/ui/home.js`
- `src/ui/buildNode.js`
- `src/ui/dialog.js`

完成标准：
- UI 层不再直接解释旧支付返回码。
- `utils.pay()` 不再保留旧支付流程 fallback。
- 购买成功 / 失败 / 兑换 / 消耗品补发 / 取消购买结果统一结构化返回。

阶段禁区：
- 暂时不要大改 `IAPPackage.js` 内部实现。
- 先收口入口，再动底层。

---

### Phase 2：站点 / 房间 / 玩家边界拆开

目标：
- 去掉 `site.js` 内联的 fallback 版房间和掉落实现。
- 把玩家初始化、兼容恢复、导航状态、属性迁移从 `player.js` 继续外移。

优先文件：
- `src/game/site.js`
- `src/game/SiteRewardService.js`
- `src/game/SiteRoomGenerator.js`
- `src/game/player.js`
- `src/game/buildAction.js`

完成标准：
- `site.js` 只保留站点实体职责，不再内嵌一整套服务 fallback。
- `player.js` 不再同时承担“兼容恢复 + 地图导航 + 属性运行时 fallback + IAP迁移”。

建议拆分方向：
- `PlayerLoadService`
- `PlayerMigrationService`
- `PlayerAttrRuntime` 独立模块

---

### Phase 3：UI 公共层瘦身

目标：
- 把 `uiUtil.js` 和 `dialog.js` 这两个共享厨房拆成职责明确的小块。

优先文件：
- `src/ui/uiUtil.js`
- `src/ui/dialog.js`
- `src/ui/topFrame.js`
- `src/ui/MenuScene.js`

完成标准：
- `uiUtil.js` 只保留通用 UI 原语，不继续吸收业务逻辑。
- `dialog.js` 只保留对话框骨架，不继续堆支付、图标、安全 fallback、业务分支。

建议拆分方向：
- `src/ui/uiTypography.js`
- `src/ui/uiLayout.js`
- `src/ui/uiSpriteSafe.js`
- `src/ui/DialogContentFactory.js`

注意：
- 这一阶段只做搬运和收口，不顺手改视觉和交互。

---

### Phase 4：战斗主链收尾

目标：
- 战斗主流程、场景层、结算层职责彻底清楚。

优先文件：
- `src/game/Battle.js`
- `src/game/BattleScene.js`
- `src/ui/battleAndWorkNode.js`
- `src/game/BattleSettlementService.js`

完成标准：
- 战斗结算、掉落、展示、日志生成不再在多个文件交叉决定。
- UI 不再直接拼战斗业务数据。

---

## 5. 当前明确禁令

在 Phase 1 和 Phase 2 没完成前：

- 不要往 `player.js` 里直接加新功能。
- 不要往 `dialog.js` 里继续加支付或奖励逻辑。
- 不要在各个 UI 文件里继续复制 `PurchaseService` fallback 判断。
- 不要在 `site.js` 里新增新的兼容分支。
- 不要把新的 UI 基建继续堆回 `uiUtil.js` 业务段。

---

## 6. 每阶段工作规则

- 一次只收口一条调用链。
- 先统一入口，再删 fallback。
- 旧逻辑没完全移走前，不要同时重写底层实现。
- 每轮结束必须回答两个问题：
  - 现在谁是唯一入口？
  - 哪些 fallback 已经可以删？

---

## 7. 下一步就做什么

下一轮直接开始 Phase 1。

第一刀建议：
- 先统一购买结果对象。
- 然后把 `shopScene/shopNode/deathNode/home/buildNode/dialog` 的支付结果分支全部改为只消费 `PurchaseService` 的统一返回。

不要一上来改 `IAPPackage.js`。

这是当前最稳、收益最高、最能降低后续出错概率的一步。
