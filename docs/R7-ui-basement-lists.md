# R7 UI Basement 收口 — 三份清单

> 来源: 只读子代理 2026-07-07 输出。PLAN.md §8.1 要求的 R7 启动前产物。
> 状态: 清单已出,R7 可进入实现阶段。

## 清单 1: uiUtil.js 职责盘点

**文件**: `assets/src/ui/uiUtil.js` (2023 行)

### A. 主题与字号 (7 项)

| 名称 | 行号 |
|------|------|
| `fontFamily` | L3 |
| `fontSize` | L8 |
| `spacing` | L17 |
| `zOrder` | L26 |
| `_buildTextPreset` | L34 |
| `textPreset` | L43 |
| `resolveTextPreset` | L52 |

### B. UI 工厂 (约 30 项,纯 UI 创建,无业务依赖)

| 函数名 | 行号 | 说明 |
|--------|------|------|
| `applyLabelStyle` | L73 | 标签样式应用 |
| `createLabel` | L102 | 通过 preset 创建 LabelTTF |
| `getNodeLayoutSize` | L123 | 节点布局尺寸 |
| `getNodeLayoutHeight` | L137 | 节点布局高度 |
| `createVStack` | L141 | 垂直布局栈 |
| `createBtn2` | L379 | 简单 ControlButton |
| `createSpriteBtn` | L391 | 精灵按钮(核心) |
| `createCommonBtnBlack` | L454 | 通用黑按钮 |
| `createCommonBtnWhite` | L474 | 通用白按钮 |
| `createSmallCommonBtnWhite` | L494 | 小号白按钮 |
| `createTextActionButton` | L536 | 纯文字按钮 |
| `createColorRect` | L589 | 纯色矩形 |
| `createPaperPanel` | L598 | 纸张质感面板 |
| `createStatusPill` | L634 | 状态药丸控件 |
| `createTextTabButton` | L662 | 文字标签按钮 |
| `createBigBtnWhite` | L722 | 大白按钮 |
| `createToolBtn` | L732 | 工具按钮 |
| `createStatusBtn` | L739 | 状态按钮 |
| `createCommonToolIcon` | L751 | 通用工具图标 |
| `createCommonListItem` | L757 | 通用列表项(含滚动、进度条) |
| `createHeartNode` | L1515 | 好感度爱心节点 |
| `createSaleOffIcon` | L1715 | 折扣闪烁图标 |
| `createIconWarn` | L1634 | 警告图标(动画) |
| `removeIconWarn` | L1690 | 移除警告图标 |
| `createSupportPackPreviewIcon` | L1800 | 礼包预览图标 |
| `createItemListSliders` | L1910 | 物品列表滑杆视图 |
| `getSpriteByNameSafe` | L1783 | 安全加载 Sprite |
| `getSpriteByNameOptional` | L1793 | 可选加载 Sprite |
| `safeRunScene` | L699 | 安全运行场景 |
| `createLoadingView` | L1891 | 加载中视图 |
| `dismissLoadingView` | L1899 | 关闭加载视图 |

### C. 资源名解析 (约 16 项,无业务逻辑,纯命名)

| 函数名 | 行号 |
|--------|------|
| `_normalizeSpriteName` | L212 |
| `_buildSpriteName` | L223 |
| `getDefaultSpriteName` | L231 |
| `getRolePortraitFrameName` | L251 |
| `getNpcMapFrameName` | L271 |
| `getTalentIconFrameName` | L291 |
| `getPurchaseIconFrameName` | L295 |
| `getItemIconFrameName` | L299 |
| `getItemDetailFrameName` | L304 |
| `getSiteIconFrameName` | L309 |
| `getDisplayItemId` | L191* |
| `_resolveIconSprite` | L313 |
| `getCharacterPortraitSpriteByRoleType` | L321 |
| `getTalentIconSprite` | L329 |
| `getPurchaseIconSprite` | L337 |
| `getItemIconSprite` | L345 |

(* `getDisplayItemId` 读取 `ContentBlueprint`/`WeaponCraftService`/`itemConfig`,但仅为 ID 转换,属命名层而非业务编排层。)

### D. 业务编排 (11 项,读 player/storage/purchase 等)

| 函数名 | 行号 | 依赖业务模块 | 迁出目标建议 |
|--------|------|-------------|-------------|
| `showItemDialog` | L1171 | `player.getSetting`, `player.storage.getNumByItemId`, `Item/ItemType`, `userGuide`, `utils.emitter` | 新建 `ItemDialogHelper` |
| `showBuildDialog` | L1240 | `player.room.getBuild`, `player.validateItems` | 新建 `BuildDialogHelper` |
| `showBuildActionDialog` | L1289 | `stringUtil` 配置读取(轻业务) | `BuildDialogHelper` |
| `showItemSliderDialog` | L1312 | `Item/ItemType`, `storage`, `itemConfig` | `ItemDialogHelper` |
| `showCraftCountSliderDialog` | L1373 | `itemConfig`, 制作数量逻辑 | `CraftService` 或 `ItemDialogHelper` |
| `showMoonlightingDialog` | L1434 | 战斗结算结果、`audioManager` | 新建 `MoonlightingHelper` |
| `showRandomBattleDialog` | L1473 | `RandomBattleDialog`(战斗引擎入口) | `BattleService` 或 `RandomBattleHelper` |
| `showItemListDialog` | L1627 | `player.validateItems` | `ItemDialogHelper` |
| `createEquipedItemIconList` | L1562 | `player.equip.getEquipedItemList`, `player.bag.getNumByItemId` | `EquipmentUiHelper` |
| `createBuildWarn` | L1654 | `player.room.getBuild`, `build.needWarn()` | `BuildDialogHelper` |
| `checkVigour` | L1497 | `player.isLowVigour()` | `RoleRuntimeService` |
| `checkStarve` | L1506 | `player.isAttrMax("starve")` | `RoleRuntimeService` |

### E. 委托桥接 (已外迁,占位函数,约 13 项)

| 函数名 | 行号 | 委托目标 |
|--------|------|---------|
| `showNpcNeedHelpDialog` | L1422 | `NpcDialogHelper` |
| `showNpcSendGiftDialog` | L1428 | `NpcDialogHelper` |
| `showPayDialog` | L1861 | `PurchaseUiHelper` |
| `showUnlockDialog` | L2002 | `PurchaseUiHelper` |
| `showRoleInfoDialog` | L2010 | `RoleTalentUiHelper` / `PurchaseUiHelper` |
| `createLockNode` | L1868 | `PurchaseUiHelper` |
| `createPayItemNode` | L1852 | `PurchaseUiHelper` |
| `getPurchaseStringConfig` | L1747 | `PurchaseUiHelper` |
| `getRoleTypeByPurchaseId` | L1760 | `PurchaseUiHelper` |
| `getTalentDisplayInfo` | L1843 | `PurchaseUiHelper` |
| `createPurchaseDisplayIcon` | L360 | `PurchaseUiHelper` |
| `getPurchaseDisplayIconMeta` | L353 | `PurchaseUiHelper` |
| `getPurchaseTitleIconConfig` | L371 | `PurchaseUiHelper` |

### F. 其余

| 函数名 | 行号 | 说明 |
|--------|------|------|
| `showTinyInfoDialog` | L1478 | 纯 UI 工厂: 创建 `DialogTiny` 并显示 |
| `showGuideDialog` | L1227 | 纯 UI 工厂: 创建 `DialogGuide` 并显示 |
| `showNewGameDialog` | L1699 | 纯 UI 工厂: 创建确认弹窗 |
| `showBackMenuDialog` | L1905 | 纯 UI 工厂: 创建返回菜单对话 |
| LabelTTF RTL patch | L1877 | 全局 `cc.LabelTTF` 重定义(RTL 适配) |

### 汇总

uiUtil.js 共约 80+ 个导出/属性。其中纯 UI 工厂约 30 项、主题字号 7 项、资源命名字约 16 项、**业务编排 11 项(应迁出)**、委托桥接 13 项(已外迁)、纯工厂型 showXxx 4 项。

---

## 清单 2: dialog.js 业务下沉清单

**文件**: `assets/src/ui/dialog.js` (1297 行)

| Dialog 名称 | 行号 | 是否带业务回调 | 回调/依赖读取什么业务状态 | 是否可纯 UI | 可拆出 helper |
|-------------|------|---------------|------------------------|------------|--------------|
| `Dialog` | L25-146 | 否 | `dismiss()` 调用 `onDismissListener` 回调(注入) | 是 | -- |
| `DialogCommon` | L148-276 | 否 | `onClickBtn1/2/3` 调用 config 注入的 cb,本身无业务 | 是 | -- |
| `DialogGuide` | L279-369 | 是 | `onExit()` L357-367 读 `userGuide.isStep()`/`userGuide.step()`,操作 `this.target.updateBtn()` | 否 | 拆出 `GuideDialogHelper`,onExit 逻辑移到 helper 中 |
| `DialogBig` | L372-433 | 否 | 仅 UI 布局 | 是 | -- |
| `DialogSmall` | L435-475 | 否 | 仅 UI 布局 | 是 | -- |
| `DialogTiny` | L477-531 | 否 | 仅 UI 布局 | 是 | -- |
| `RandomBattleDialog` | L533-887 | 是 | L599 `player.equip.haveWeapon()`, L609 `player.isLowVigour()`, L644 `new Battle(...)`, L659 `player.log.addMsg()`, L803 `DataLog.getLifeValue()`, L827-L847 `randomReward` + `player.gainItemsInBagOrOverflowTarget`, L562 `cc.timer.pause()` | 否 | 拆出 `RandomBattleService` 或 `BattleResultDialogHelper` |
| `NpcDialog` | L889-911 | 否 | 仅创建爱心节点、设置 autoDismiss=false | 是 | -- |
| `ItemListDialog` | L913-968 | 否 | 纯物品列表渲染 | 是 | -- |
| `AboutDialog` | L970-1070 | 轻度 | L1046 `CommonUtil.sendEmail()`, L1055-L1061 `CommonUtil.gotoUrl()` + 语言判断 | 近乎 | 回调注入即可纯化 |
| `AboutUUIDDialog` | L1072-1090 | 轻度 | L1083 `Record.getUUID()` | 近乎 | UUID 可通过 config 注入 |
| `PayDialog` | L1092-1200 | 是 | L1100 `PurchaseUiHelper.getPurchaseDisplayContext`, L1171 `PurchaseUiHelper.shouldShowSaleIcon`, L1185 `PurchaseUiHelper.applyPayDialogState`, L1193 `cc.timer.pause()` | 部分 | PurchaseUiHelper 已外置,timer 管理可移到调用方 |
| `LoadingDialog` | L1202-1224 | 否 | 纯动画加载 | 是 | -- |
| `BackToMenuDialog` | L1226-1252 | 轻度 | L1244/L1249 `cc.timer.pause/resume`, 接收 cb 回调 | 近乎 | timer 管理可移到调用方 |
| `DialogMoreGame` | L1253-1296 | 是 | L1262-L1281 WebView 加载外部 URL、`CommonUtil.gotoUrl()`、JS 回调 scheme | 否 | 拆出 `MoreGameDialogHelper` |

### 汇总

dialog.js 共 16 个 Dialog 类,其中 7 个可直接纯 UI 复用(Dialog/DialogCommon/DialogBig/DialogSmall/DialogTiny/NpcDialog/ItemListDialog/LoadingDialog),4 个近乎纯 UI 需回调注入(AboutDialog/AboutUUIDDialog/PayDialog/BackToMenuDialog),**4 个含重业务需下沉**(DialogGuide/RandomBattleDialog/PayDialog/DialogMoreGame)。

---

## 清单 3: 混用扫描

扫描 `assets/src/ui/` 下所有场景/节点 JS 文件,找出**同时使用** `uiUtil.createXxx`/`uiUtil.getXxx` 与裸 `new cc.LabelTTF`/`new cc.Sprite` 的文件。

| 文件名 | uiUtil 调用 | 裸 `new cc.LabelTTF`/`new cc.Sprite` | 覆盖率粗评 |
|--------|------------|--------------------------------------|-----------|
| `dialog.js` | 15 | 28 | 低 (35%) — 大量 LabelTTF 直接创建 |
| `battleAndWorkNode.js` | 13 | 17 | 低 (43%) — 战斗/工作最厚的业务节点 |
| `MenuScene.js` | 17 | 9 | 中 (65%) — 按钮走 uiUtil,文字仍裸写 |
| `MedalSceneView.js` | 20 | 6 | 中 (77%) — 大量用了 createColorRect/createLabel,但 stage badge 走裸写 |
| `endScene.js` | 6 | 8 | 低 (43%) — 结算文字全部裸写 |
| `PurchaseUiHelper.js` | 16 | 8 | 中 (67%) — 图标走 uiUtil,标题/价格/描述走裸写 |
| `equipNode.js` | 10 | 5 | 中 (67%) |
| `rankScene.js` | 5 | 4 | 中 (56%) |
| `deathNode.js` | 2 | 3 | 中 (40%) |
| `DayScene.js` | 1 | 6 | 低 (14%) — 几乎全部裸写 |
| `StoryScene.js` | 1 | 7 | 低 (13%) — 几乎全部裸写 |
| `ChooseScene.js` | 10 | 1 | 高 (91%) — 基本已收口到 createLabel |
| `RoleTalentUiHelper.js` | 20 | 1 | 高 (95%) |
| `buildNode.js` | 9 | 1 | 高 (90%) |
| `home.js` | 10 | 1 | 高 (91%) |
| `npcNode.js` | 6 | 3 | 中 (67%) |
| `siteNode.js` | 5 | 3 | 中 (63%) |
| `ZiplineEndpointPanelController.js` | 2 | 6 | 低 (25%) |
| `rankFamousScene.js` | 3 | 4 | 低 (43%) |
| `topFrame.js` | 1 | 3 | 低 (25%) |
| `MapTravelDialogHelper.js` | 4 | 2 | 中 (67%) |
| `ItemChangeNode.js` | 4 | 2 | 中 (67%) |
| `SectionTableView.js` | 4 | 2 | 中 (67%) |
| `adSiteNode.js` | 2 | 2 | 中 (50%) |
| `button.js` | 2 | 4 | 中 (33%) — 按钮底座本身 |
| `workSiteNode.js` | 4 | 2 | 中 (67%) |
| `npcStorageNode.js` | 2 | 2 | 中 (50%) |
| `richText.js` | 3 | 2 | 中 (60%) |
| `shopScene.js` | 3 | 1 | 高 (75%) |
| `MapZiplineController.js` | 1 | 3 | 低 (25%) |
| `NpcDialogHelper.js` | 1 | 2 | 低 (33%) |
| `workRoomStorageNode.js` | 2 | 1 | 中 (67%) |

### 汇总

共 32 个文件存在混用。其中 `dialog.js`、`battleAndWorkNode.js`、`endScene.js`、`DayScene.js`、`StoryScene.js` 覆盖率最低 (13%-43%),大量 LabelTTF 裸写;`ChooseScene.js`、`RoleTalentUiHelper.js`、`buildNode.js`、`home.js` 覆盖率最高 (90%+),基本已通过 `createLabel`/`createColorRect` 收口。

---

## R7 实现焦点(基于清单的初步判断)

### 优先级 1: uiUtil.js 业务编排 11 项迁出
- `showItemDialog` / `showItemSliderDialog` / `showItemListDialog` / `showCraftCountSliderDialog` → 新建 `ItemDialogHelper`
- `showBuildDialog` / `showBuildActionDialog` / `createBuildWarn` → 新建 `BuildDialogHelper`
- `showMoonlightingDialog` / `showRandomBattleDialog` → 新建 `MoonlightingHelper` / 评估是否归入 `BattleService`
- `createEquipedItemIconList` → `EquipmentUiHelper`(已存在则并入)
- `checkVigour` / `checkStarve` → `RoleRuntimeService`

### 优先级 2: dialog.js 4 个含重业务 Dialog 下沉
- `DialogGuide` onExit → `GuideDialogHelper`
- `RandomBattleDialog` → `RandomBattleService`(战斗引擎入口不该在 Dialog 里)
- `PayDialog` timer 管理 → 调用方注入
- `DialogMoreGame` WebView → `MoreGameDialogHelper`

### 优先级 3: 混用扫描补工厂覆盖
- 优先收 `dialog.js` 28 处裸 LabelTTF(本身是 UI 底座,不该裸写)
- 其次 `battleAndWorkNode.js` 17 处(业务大节点)
- `DayScene.js` / `StoryScene.js` 覆盖率最低,但属叙事场景,文字布局特殊,收口收益相对低

### R7 启动建议
- 先做优先级 1(uiUtil 业务编排迁出),因为这是"UI 不新增业务编排"约束的直接落地
- 优先级 2 风险较高(`RandomBattleDialog` 含战斗引擎入口,改动需战斗回归)
- 优先级 3 是渐进覆盖,可与日常 UI 改动合并推进,不单独开批次
