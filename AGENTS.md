# BuriedTown 项目协作定义

## 工作区
- 主要工作区：`/data/data/com.termux/files/home/AI code工作区`
- 项目目录：`/data/data/com.termux/files/home/AI code工作区/死亡日记游戏项目`
- 源码目录：`/data/data/com.termux/files/home/AI code工作区/死亡日记游戏项目/BuriedTown_1.4.3_unpacked/assets/src`
- 排查路径时优先使用真实路径，不依赖 `/root` 下的符号链接

---

## 项目目标

这个项目的目标不是只修 bug，也不是只做局部补丁，而是：

- 持续增加新内容：天赋、人物、物品、机制、流程、地图交互等
- 在增加内容的同时提升整体可维护性
- 逐步优化老旧架构，而不是把问题一层层用补丁和兜底掩盖掉
- 深入理解现有 UI 架构，系统性降低 UI bug 和崩溃
- 在没有新美术资源的前提下，稳定复用现有图片资源，减少映射和配置错误

一句话总结：**内容扩展和架构优化要同步推进，UI 稳定性是最高优先级风险。**

---

## 总体原则

1. **复用优先**
   先找现有机制、现有配置、现有组件、现有服务，不要为单个页面或单个功能反复造新轮子。

2. **理解优先**
   改动前先理解完整链路：配置 -> 逻辑 -> UI -> 资源 -> 存档/事件。

3. **系统性修复优先**
   如果一个问题明显会重复出现，优先修共享层、入口层、通用层，不要只在单页打补丁。

4. **可维护性优先**
   新功能落地时，优先让代码更清晰、更集中、更可验证，而不是只求“先能跑”。

5. **代码为准**
   本项目历史较长，文案、注释、旧经验可能与现状不一致，以当前代码行为为准。

6. **渐进式重构**
   不做无边界的大重写；每次改动都应能说明收益、边界、风险和回退点。

7. **UI 高风险意识**
   目前项目最多的 bug 和崩溃来自 UI。所有 UI 改动都默认高风险，必须先理解现有架构再下手。

---

## 开发方向

### 1. 内容扩展方向
- 新增人物：角色配置、图标映射、文案、相关天赋/事件/入口
- 新增天赋：购买配置、效果逻辑、显示逻辑、文案、图标
- 新增物品：配置、图标、用途、掉落/产出链路、UI 展示
- 新增机制：优先抽成可复用的 service / manager / router / state，而不是散落在多个 scene/node 中

### 2. 架构优化方向
- 把散落在 UI 层的业务逻辑逐步收回到 `game/*Service.js`、`*Manager.js`、`*Router.js`、`*State.js`
- 把重复的配置访问、资源 fallback、图标映射、内容校验收口到现有工具层
- 把“页面特判”逐步变成“共享规则 + 局部配置”
- 避免继续堆积一次性 helper、一次性常量、一次性 UI 拼接逻辑

---

## UI 作为最高风险模块

### 目标
- 降低 UI bug
- 降低 UI 崩溃
- 降低图片配置和映射错误
- 降低页面间重复实现导致的行为漂移

### UI 系统性方案
- 先理解现有 UI 分层，再改页面
- 尽量让 UI 负责展示和交互，不负责重复计算业务规则
- 尽量复用现有组件入口，不在业务页随手自造控件体系
- 如果一个 UI 问题在多个页面可能重复出现，优先修公共层
- 遇到资源缺失、图片错位、图标映射问题时，先排查映射和加载链路，不要先堆 fallback

### UI 改动前必须先看
- `ui/uiUtil.js`
- `ui/dialog.js`
- `ui/button.js`
- `ui/autoSpriteFrameController.js`
- `ui/richText.js`
- `util/uiTheme.js`
- `util/iconHelper.js`
- `util/resourceFallback.js`
- `util/safetyHelper.js`

### UI 选型顺序
1. 先看 `uiUtil.js` 是否已有现成入口
2. 再看 `dialog.js` / `button.js` 是否已有合适基础件
3. 再看是否应复用现有 scene/node 模式
4. 最后才考虑补共享能力

### UI 禁止事项
- 不要把业务逻辑散写在多个 node/scene 里
- 不要把大按钮素材硬压到窄区域
- 不要把 `DrawNode` 当正式按钮皮肤使用
- 不要绕过现有资源加载和 fallback 层直接裸取 sprite
- 不要为单个页面不断新增临时 UI helper

---

## 美术资源与图片复用约束

当前项目没有新美术资源，默认只能复用现有资源。因此必须格外重视：

- 图片配置是否存在
- sprite frame 名称是否正确
- plist 是否已加载
- 图标映射是否完整
- fallback 是否合理
- 同一资源在不同页面的尺寸、锚点、布局是否稳定

### 图片相关改动规则
1. 先确认是否已有可复用资源
2. 新增内容时同时补全图标映射和字符串配置
3. 所有可能缺图的链路优先走安全加载和 fallback 入口
4. 不因为“先显示出来”就把错误资源硬编码进业务页
5. 资源复用时优先保持旧资源的使用语义一致，不要一图多义到难以维护

---

## 现有工具与职责

### UI 工具层
- `ui/uiUtil.js`
  UI 总入口。负责字体字号、按钮工厂、通用列表项、警告角标、部分商城/物品/装备节点、`showXxxDialog` 快捷入口。

- `util/uiTheme.js`
  颜色与遮罩主题层。它只负责颜色，不负责布局系统。

- `ui/button.js`
  交互底座。`Button`、`ButtonWithPressed`、`SettingButton`、`StatusButton`、`AttrButton` 都从这里来。

- `ui/dialog.js`
  弹窗体系。`DialogBig/Small/Tiny`、`ItemListDialog`、`PayDialog`、`LoadingDialog` 等统一走这里。

- `ui/autoSpriteFrameController.js`
  sprite frame / plist 装载入口。

- `ui/richText.js`
  图标 + 文字类富文本排版入口。

- `ui/PurchaseUiHelper.js`
  商城、角色、礼包展示辅助。

### 资源与容错层
- `util/safetyHelper.js`
  防御性调用、安全创建 UI、安全加载 sprite。用于边界保护，不用于掩盖结构问题。

- `util/iconHelper.js`
  图标映射层，主要负责角色头像、地图图标等资源名映射。

- `util/resourceFallback.js`
  缺图 fallback 层，处理资源不存在时的默认资源降级。

### 内容与配置工具
- `util/contentBlueprint.js`
  内容蓝图。定义新增角色、天赋、物品时需要触达哪些配置点。

- `util/configValidator.js`
  配置校验器。用于校验角色、天赋、物品配置是否完整。

- `util/dependencyChecker.js`
  配置清单工具。用于在新增内容前列出缺失项和依赖项。

### 通用工具层
- `util/stringUtil.js`
  字符串获取和格式化统一入口。

- `util/utils.js`
  纯通用小工具，如 clone、callback、随机数、字符串/数组转换等。不要往里塞业务逻辑。

- `util/emitter.js`
  事件总线底层，项目内统一通过 `utils.emitter` 使用。

- `util/timerHelper.js` + `game/TimeManager.js`
  定时器与时间推进工具。不要在 UI 层重复造时间推进逻辑。

- `util/range.js`
  区间判断，常用于属性阈值和 warn 条件。

- `util/memoryUtil.js` + `util/attrHelper.js`
  属性编码/解码与属性批量操作入口。

- `util/audioManager.js`
  音效与音乐统一入口。

- `util/networkUtil.js` + `util/dataLog.js`
  网络请求与埋点/日志上传入口。业务节点不要直接写 XHR。

- `util/AssetsManager.js` + `util/preloading.js`
  资源热更新与启动预加载流程，属于启动层，不属于普通业务功能层。

- `util/EnvironmentConfig.js`
  运行环境、日志包装、音频兼容等底层运行时配置，谨慎改动。

### 业务服务层
- `game/PurchaseService.js`
  购买、取消购买、旧支付结果兼容入口。

- `game/TravelService.js`
  地图移动速度、耗时、加速统一计算入口。

- `game/ZiplineNetworkService.js`
  滑索连接的存储、恢复、校验、查询。

- `game/ZiplineTravelService.js`
  滑索路线倍率逻辑。

- `game/MapDestinationRouter.js`
  地图实体到场景节点的路由入口。

- `game/PlayerNavigationState.js`
  玩家当前位置、地图锚点、副本状态统一管理。

- `game/*Service.js` / `*Manager.js` / `*Router.js` / `*State.js`
  默认视为优先复用的业务层。如果已有同类入口，优先收口到这里，不要在 UI 层重复实现。

---

## 工具选型规范

### 新增内容时
1. 先用 `ContentBlueprint` 明确需要改哪些点
2. 再用 `DependencyChecker` 列清单
3. 完成后用 `ConfigValidator` 校验
4. 图标和资源映射同步补齐
5. UI 展示优先复用现有节点和 helper

### 改业务逻辑时
1. 优先看是否已有 `*Service.js`、`*Manager.js`、`*Router.js`、`*State.js`
2. 没有时，优先补共享业务层，而不是把逻辑塞进 UI
3. 能抽出规则就不要散落条件判断

### 改 UI 时
1. 先理解页面所在的 UI 分层
2. 先查 `uiUtil.js`、`dialog.js`、`button.js`
3. 再查资源加载和图标映射链路
4. 最后才做局部布局修改

### 改资源与图标时
1. 先查 plist / sprite frame / 映射表
2. 再查 fallback
3. 最后才查业务页是否写死了资源名

---

## 明确禁止

- 不要只做补丁和兜底，而不提升结构
- 不要为了赶功能把重复业务逻辑复制到多个 UI 页面
- 不要把 fallback 当主方案
- 不要不理解现有 UI 架构就直接改 UI
- 不要新增一堆一次性 helper 让项目更碎
- 不要把 `utils.js` 变成业务逻辑垃圾桶
- 不要在没有确认资源链路的前提下硬改图片名或直接替换映射

---

## 协作预期

后续协作中，默认目标是：

- 一边扩内容，一边优化结构
- 一边修 UI bug，一边降低同类 UI bug 的再发概率
- 一边复用旧资源，一边把图片配置、图标映射、fallback 链路理顺
- 尽量把“临时可用”推进成“长期可维护”

如果某次改动只能在“快速补丁”与“结构性修正”之间二选一，默认优先选择**边界清晰、可持续演进**的方案。
