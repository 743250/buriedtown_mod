# BuriedTown 渐进式重构计划

## 1. 当前项目状态

### 当前基线

- 当前启动链已经回退到 legacy 方案，主入口仍然依赖 `assets/src/jsList.js`、`assets/src/util/preloading.js`、`assets/src/util/AssetsManager.js`
- 近期保留的有效改动主要集中在：
  - 购买展示与图标修正
  - 社交天赋 trade 数量加成
  - zipline 相关稳定性修正
  - 若干 battle / cooldown / content 修正
- 当前仓库不存在第二套 runtime 架构；后续默认不再重新引入

### 当前真实问题

- 项目已经有不少“像 service 一样”的 helper / manager / holder，但边界还不够清楚
- 部分重构停在中间态：新 helper 已加，但同一条链上旧逻辑还散在多个 UI 文件里
- 仓库级自动检查主要覆盖内容配置，缺少真正的运行时自动回归
- 一些基础设施已经有重叠趋势，如果不先管理，会继续形成新的“工具堆”

### 当前目标

不是追求“架构彻底重做”，而是把项目一步步推进到更稳定、更少重复、更容易继续维护的状态。

关键要求：

- 不破坏当前可打包的 legacy 基线
- 不制造第二套平行实现
- 每一阶段结束后都比上一阶段更接近终态，而不是新的中间态

## 2. 工具层治理

这里的“工具”不只指 `tools/` 目录，也包括运行时里的 helper、fallback、validator、error handler、theme、dialog helper 这类基础设施。

### 2.1 仓库级工具

#### 主入口

- `tools/validate-content.js`

它是当前唯一应该继续扩展的仓库级验证入口，负责：

- `item-ui`
- `links`
- `weapon-links`
- `site-links`
- `checklist`
- `all`

#### 库文件

- `tools/lib/content-validator.js`
- `tools/lib/validate-item-ui.js`
- `tools/lib/game-data.js`

#### 兼容入口

- `tools/validate-item-ui.js`

这个文件现在只是兼容壳，后续不应继续往它上面叠新逻辑；如果 item-ui 检查要增强，应直接扩展 `validate-content.js` 和 `tools/lib/validate-item-ui.js`。

### 2.2 运行时基础工具

#### 容错与错误处理

- `assets/src/util/safetyHelper.js`
  - `SafetyHelper`
  - `ErrorHandler`
- `assets/src/util/errorProbe.js`

治理原则：

- `SafetyHelper` / `ErrorHandler` 负责局部容错和安全调用
- `ErrorProbe` 只负责诊断和留痕，不承载业务逻辑
- 不再新增新的通用错误容器，例如 `ErrorHolderV2`、`SafeHelper2` 这类平行层
- 如果确实需要补能力，优先在现有 `SafetyHelper` / `ErrorHandler` 内收口

#### 资源与显示兜底

- `assets/src/util/iconHelper.js`
- `assets/src/util/resourceFallback.js`
- `assets/src/util/uiTheme.js`
- `assets/src/util/stringUtil.js`

治理原则：

- `IconHelper` 负责名字映射
- `ResourceFallback` 负责资源兜底
- `UITheme` 负责视觉常量
- `stringUtil` 负责文案读取
- 不允许把“业务判断 + 图标映射 + fallback”重新散回 `uiUtil.js`

#### 配置与验证

- `assets/src/util/configValidator.js`
- `assets/src/util/validateConfig.js`
- `assets/src/util/validateSiteConfig.js`
- `assets/src/util/contentBlueprint.js`
- `assets/src/util/dependencyChecker.js`

治理原则：

- `ConfigValidator` 是运行时验证核心
- `validateConfig.js` / `validateSiteConfig.js` 只是 legacy 调试入口
- 仓库级检查优先走 `tools/validate-content.js`
- 后续新增验证项，优先扩展仓库 CLI，不继续堆新的运行时脚本

#### 业务辅助 helper

- `assets/src/ui/PurchaseUiHelper.js`
- `assets/src/ui/NpcDialogHelper.js`
- `assets/src/ui/MapTravelDialogHelper.js`
- `assets/src/util/timerHelper.js`
- `assets/src/util/attrHelper.js`

治理原则：

- 这类 helper 必须围绕一条明确业务链存在
- 如果 helper 已经成为这条链的统一入口，就继续收口
- 如果 helper 只被 1 处调用且没有形成稳定边界，就不要继续膨胀

### 2.3 当前建议保留 / 收口 / 警惕名单

#### 建议保留并继续收口

- `PurchaseUiHelper`
- `NpcDialogHelper`
- `MapTravelDialogHelper`
- `SafetyHelper`
- `ErrorHandler`
- `IconHelper`
- `ResourceFallback`
- `ConfigValidator`
- `UITheme`

#### 暂时保留，但不要继续放大职责

- `utils.js`
- `CommonUtil`
- `memoryUtil`
- `EnvironmentConfig`
- `errorProbe`

#### 重点警惕

- 在 `uiUtil.js` 里继续塞业务判断
- 为同一问题再新增一个 helper / manager / holder
- 把 debug / validation 逻辑混回核心业务流

## 3. 渐进式重构原则

### 3.1 什么叫“渐进式推进”

每一轮只处理一个窄边界，例如：

- 购买展示
- 购买动作
- 地图进入站点
- 死亡 / 复活
- 战斗结算展示

每一轮都必须满足：

1. 不改启动链。
2. 不新建平行架构层。
3. 改动文件尽量围绕同一条链。
4. 结束后这条链的主入口更清晰，旧重复逻辑更少。

### 3.2 什么叫“不是中间态”

一个阶段只有在下面这些条件成立时才算完成：

- 目标链路已有明确主入口
- 目标范围内的重复逻辑已经删掉，而不是只新增 helper
- 相关调用方都已切到统一入口
- 验证方式已经固定
- 后续继续扩展时，默认会走这条新入口，而不是回到旧散点逻辑

也就是说：

- 不是“加了 helper，但旧逻辑还留 5 份”
- 不是“新旧两套都能走，但没人知道该走哪套”
- 不是“为了以后可能用到，先造一层抽象”

## 4. 分阶段路线

### Phase 0: 基线与工具治理

目标：

- 固定当前 legacy 基线
- 固定工具主入口
- 明确哪些 helper 是正式边界，哪些只是临时辅助

完成定义：

- `PLAN.md` 对工具和边界有清晰说明
- 仓库级验证默认只推荐 `tools/validate-content.js`
- 新增检查不再随手新建平行脚本

### Phase 1: 购买展示链收口

目标：

- 让购买展示相关数据只从一处组装出来
- `uiUtil.js` 和 `dialog.js` 不再各自重复拼 `strConfig / title / icon / talentDisplayInfo / price text`

主入口：

- `assets/src/ui/PurchaseUiHelper.js`

当前状态：

- 已开始把购买展示上下文往 `PurchaseUiHelper` 收口
- `button.js`、`dialog.js`、`uiUtil.js` 已优先从 `PurchaseUiHelper.getPurchaseDisplayContext()` 读取标题、文案、价格和展示状态
- 购买卡片的名称、徽标、价格已经优先走 `PurchaseUiHelper.getPurchaseUiSnapshot()`，旧状态分支只保留为 fallback
- 运营商促销名已经统一回到 `PurchaseUiHelper.getPurchaseDisplayName()`，避免不同 UI 各写一份特殊名

范围文件：

- `assets/src/ui/PurchaseUiHelper.js`
- `assets/src/ui/uiUtil.js`
- `assets/src/ui/dialog.js`
- `assets/src/ui/button.js`
- `assets/src/ui/shopScene.js`
- `assets/src/ui/shopNode.js`

完成定义：

- 购买卡片、支付弹窗、购买信息弹窗都从统一展示上下文取数据
- 购买标题、图标、天赋展示文本的重复拼装明显减少
- `uiUtil.js` 只负责展示，不再承载过多购买业务规则
- 允许保留最小 legacy fallback，但默认入口必须已经明确且优先使用统一 helper

### Phase 2: 购买动作链收口

目标：

- 把购买、取消购买、同步购买、失败原因解释继续收口到 `PurchaseService.js`

主入口：

- `assets/src/game/PurchaseService.js`

范围文件：

- `assets/src/game/PurchaseService.js`
- `assets/src/game/IAPPackage.js`
- `assets/src/ui/shopScene.js`
- `assets/src/ui/shopNode.js`
- `assets/src/ui/deathNode.js`
- `assets/src/ui/home.js`
- `assets/src/ui/buildNode.js`

完成定义：

- UI 不再直接解释旧 `payResult`
- UI 只消费结构化购买结果
- 购买失败提示和刷新行为尽量统一

### Phase 3: 地图 / 站点边界收口

目标：

- 把地图进入站点、站点返回、站点刷新这条链的重复导航和状态判断收口

范围文件：

- `assets/src/ui/MapNode.js`
- `assets/src/ui/siteNode.js`
- `assets/src/ui/battleAndWorkNode.js`
- `assets/src/game/site.js`
- `assets/src/game/game.js`

完成定义：

- 目标链不再在多个节点里各写一套进入/返回逻辑
- 参数和刷新顺序更统一

### Phase 4: 玩家生命周期外围收口

目标：

- 不拆 `player.js` 主体，只收初始化、恢复、死亡/复活、时间推进外围边界

范围文件：

- `assets/src/game/player.js`
- `assets/src/game/record.js`
- `assets/src/game/buildAction.js`
- `assets/src/ui/deathNode.js`
- `assets/src/ui/home.js`

完成定义：

- UI 不再散落调用多套恢复/复活流程
- 高风险 save / restore 路径更集中

### Phase 5: 战斗展示层瘦身

目标：

- 只收战斗展示、日志、结算文案，不碰核心公式和主循环

范围文件：

- `assets/src/ui/battleAndWorkNode.js`
- `assets/src/game/Battle.js`
- `assets/src/ui/dialog.js`
- `assets/src/ui/uiUtil.js`

完成定义：

- 战斗展示拼装重复减少
- 不再把过多展示文本拼装塞在按钮回调和临时分支里

## 5. 验证策略

### 仓库级验证

- `node tools/validate-content.js all --lang zh`
- `node tools/validate-content.js all --lang en`
- 针对改动文件做最小语法检查

### 运行时验证

- 如需运行时配置核验，可继续使用：
  - `assets/src/util/validateConfig.js`
  - `assets/src/util/validateSiteConfig.js`

但这两者默认只作为 legacy 调试入口，不作为新的主工作流。

### 人工回归

- 新游戏 -> 角色选择 -> 开场 -> 主场景
- 家中 -> 地图 -> 站点 -> 战斗/工作 -> 返回
- 死亡 -> 复活 -> 回主场景
- 商店打开 -> 支付弹窗 -> 角色购买卡显示
- 语言切换后关键文案正常

## 6. 当前下一步

下一轮继续完成 `Phase 1`，但只做“购买展示链终态”，不顺手扩散到购买动作链。

具体顺序：

1. 继续把购买展示上下文从 `PurchaseUiHelper` 作为唯一主入口推进完。
2. 把 `button.js`、`dialog.js`、`uiUtil.js` 里剩余的重复购买展示拼装继续收掉。
3. 明确 `PurchaseUiHelper` 的职责上限，只保留展示层逻辑，不把支付执行塞进去。
4. 做完后跑内容校验和最小商店人工回归，再进入 `Phase 2`。
