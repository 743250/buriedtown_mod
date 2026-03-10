# BuriedTown 大改架构方案

## Progress Update (2026-03-10)
### 已完成
- Phase 1 基础设施主干已落地：
  - 已引入 `package.json`、`tsconfig.json`、`esbuild` 构建脚本。
  - 已建立 `src-mod/` 模块根目录，包含 `bootstrap/`、`app/`、`platform/`、`domain/`、`runtime/`。
  - 已生成 `assets/generated/manifest.json`、`runtime.bundle.js`、`platform.bundle.js`、`lang/*.bundle.js`。
  - `preloading.js` 与 `AssetsManager.js` 已切到 manifest/bundle 启动链，先加载新 runtime，再加载 legacy scripts。
- 运行时与 devtools 已开始分层：
  - `contentBlueprint`、`configValidator`、`EnvironmentConfig`、`resourceFallback` 等已移出运行时主加载链。
  - 运行时中对 `ConfigValidator` 的直接依赖已从 `uiUtil.js`、`Item.js`、`SiteConfigService.js`、`TalentService.js`、`role.js` 清掉。
- 新 runtime 组合根已生效：
  - `AppContext`、`DebugFlags`、`BootstrapPatches`、`PlatformFacade`、`AssetResolver` 已接入。
  - `SaveGameV2` 已接到 `Record`，当前存档以 `saveVersion = 2` envelope 为唯一有效格式。
- Application 层已接管一部分旧全局入口：
  - `CommerceAppService` 已承接购买文案、角色映射、天赋展示逻辑。
  - `SessionAppService` 已承接 `init/start/stop/newGame/relive` 生命周期。
  - `NavigationAppService` 已承接导航栈、节点创建、音乐策略、导航存档。
  - `game.js` 和 `Navigation` 已开始降级成 facade，优先转发到 `AppContext.services`。
  - `BaseScene` 已提供统一 `AppContext/service` helper，`BottomFrameNode`、`MainScene`、`MenuScene`、`MapNode`、`StoryScene`、`DeathNode`、`EndScene` 已开始复用。
- 已清掉一批高风险双轨代码：
  - `player.js` 中已经 `return PlayerPersistenceService / PlayerAttrService` 的影子旧实现已删除。
  - `uiUtil.js` 中购买字符串/角色推导/天赋展示已迁出，只保留转发。
  - [bottomFrame.js](/d:/cmd-git/buriedtown_mod/assets/src/ui/bottomFrame.js) 中被 facade 短路的 `gotoDeathNode/save/restore` 旧死代码已删除，`BottomFrameNode` 已改为优先走 `navigation/session` service。

### 当前状态
- 项目已从“纯 legacy 全局脚本”进入“新 runtime 壳 + legacy 业务核”的过渡态。
- 启动、构建、语言包、平台入口、存档包裹、购买展示、导航骨架、生命周期骨架已经进入新架构。
- 但核心玩法主体仍主要在 legacy 侧：
  - `player` 仍是超级聚合对象，尚未拆成 `PlayerState / InventoryState / WorldState / SessionState / CombatState`。
  - `battle / site / travel / purchase` 仍未完全迁到新的 domain + app 双层。
  - UI 边界完成了第一轮收口，但 `home/build/site/battleAndWork` 等 `BottomFrameNode` 派生节点仍大量直接依赖 `player` / `Navigation` / `game` 全局。

### 已验证
- `npm run check:playable`
- `npm run build:runtime`
- `node tools/validate-content.js all --lang zh`
- `node -c` 校验了本轮改动涉及的 JS 文件

### 下一步
- 继续 Phase 2 和 Phase 3，优先做这三件事：
  1. 继续拆 `player`，先把存档恢复、时间推进、死亡/复活、属性变更边界进一步迁到 app/domain service。
  2. 继续把 `BottomFrameNode` 派生节点的直接 `Navigation/game` 调用改成走 `AppContext.services`，优先处理 `home.js`、`buildNode.js`、`siteNode.js`、`battleAndWorkNode.js` 这几条高频链路。
  3. 顺着 `death -> relive -> main` 这条已收口链继续往内推进，把保存、恢复、地图/站点切换边界从 legacy 全局搬到 `SessionAppService` / `WorldAppService`。

### 备注
- 当前仍是可运行的过渡版本，不是最终态。
- 下一位接手时，应默认策略为：优先删除双轨死代码，其次移动边界，最后才考虑继续新增 helper。

## Summary
目标是把项目从“全局脚本单体 + 运行时混入开发工具 + 旧新逻辑并存”的中间态，重构为“模块化构建 + 明确分层 + 可测试 + 低风险扩展”的架构。

本方案按你已确认的取舍落地：
- 允许大改架构
- 允许放弃旧存档兼容，建立新存档格式
- 蓝图/校验/探针完全移出运行时
- 引入正式模块化构建
- 支付/广告/更新等平台能力统一收口到 platform adapter 层

默认技术选择：
- 新代码使用 TypeScript + ES modules
- 构建工具使用 `esbuild`
- 运行时产物输出到 `assets/generated/`
- 旧的 `assets/src/jsList.js` 退出主职责，最终由生成产物清单替代
- 新存档格式显式标记 `saveVersion = 2`

## Key Changes
### 1. 建立新的五层结构
- `bootstrap/`：Cocos 启动、资源预加载、模块 bundle 装载、日志/音频补丁、debug flag 初始化
- `platform/`：支付、广告、更新、排行榜、原生 bridge 的统一 adapter
- `domain/`：纯游戏状态与规则，不依赖场景、节点、原生 bridge、`cc.director`
- `app/`：应用服务层，负责编排用例和事务边界
- `ui/`：场景、节点、控制器、视图模型，只调用 app 层
- `devtools/`：`ContentBlueprint`、`ConfigValidator`、`DependencyChecker`、`atlas-inventory`、`errorProbe`，完全脱离运行时主 bundle

### 2. 运行时入口重做
- 保留当前 `assets/project.json -> src/util/preloading.js` 的启动点，但其职责改为加载 `assets/generated/manifest.json`
- `preloading.js` 与 `AssetsManager.js` 不再遍历 `jsList.js`，而是读取生成清单并加载：
  - `runtime.bundle.js`
  - `lang/<locale>.bundle.js`
  - `platform.bundle.js`
- `assets/src/jsList.js` 在过渡完成后删除；在过渡期只允许保留一个兼容 shim，不再承载真实依赖顺序

### 3. 全局对象降级为兼容 facade
- 新增 `AppContext` 作为唯一运行时组合根，持有：
  - `services`
  - `stores`
  - `platform`
  - `router`
  - `eventBus`
  - `assets`
- 旧全局对象 `player`、`game`、`Navigation` 不再是真实实现，只保留极薄兼容 facade，内部转发到 `AppContext`
- 禁止任何新代码直接依赖旧全局；旧代码迁移完后删除 facade

### 4. 核心状态重构
- 拆掉当前 `Player` 超级聚合对象，重建为明确状态模型：
  - `PlayerState`：属性、状态、设置
  - `InventoryState`：背包、仓库、装备
  - `WorldState`：地图、站点、NPC、天气、滑索
  - `SessionState`：时间、存档槽、当前导航位置
  - `CombatState`：战斗时临时状态
- `player.js` 改为过渡层或直接拆除；所有“先 `return Service.xxx()`、后面继续保留旧实现”的影子代码一律删除，不允许双轨实现长期共存
- 新存档以 `SaveGameV2` 为唯一格式，字段按状态模型分块存储，不再兼容旧结构

### 5. Application 层替代 UI 直连业务
- 新增应用服务，UI 不再直接碰 `player`、`Record`、`PurchaseAndroid`、`utils.emitter`
- 最少落地以下服务：
  - `SessionAppService`：开始新游戏、继续游戏、重开、存档
  - `WorldAppService`：进入地图、进入站点、推进房间、站点结算
  - `TravelAppService`：地图移动、耗时、加速、滑索路线
  - `CombatAppService`：开战、回合推进、结算
  - `NavigationAppService`：场景/节点导航与返回逻辑
  - `CommerceAppService`：商店、内购、解锁、补发
- `MapDestinationRouter`、`TravelService`、`ZiplineActionService`、`ZiplineNetworkService` 这类已抽出的 service 直接纳入新分层，不再挂在旧全局调用链上

### 6. UI 层收口
- `BaseScene` 仅负责生命周期和注入 `AppContext`
- `Navigation` 拆成三块：
  - `Router`：页面栈与目标解析
  - `ScreenFactory`：节点/场景实例化
  - `MusicPolicy`：不同页面的音乐切换规则
- `uiUtil` 只保留纯展示辅助；业务解释、购买字符串拼装、角色/天赋判定等迁回 app/domain
- `ResourceFallback` 升级为 `AssetResolver`，由 UI 通过统一接口取图标，不再把 fallback 策略散落在 `uiUtil`

### 7. 平台层隔离
- 把 `PurchaseAndroid`、`adHelper`、`gameCenter`、更新能力、`jsb.reflection` 访问统一包进 `platform/`
- app 层只依赖统一接口，不依赖具体 SDK 类型
- 第一轮不重写平台实现，只做 adapter 收口；旧实现包起来，新代码只走 adapter

### 8. 工具/辅助层处理原则
- `ContentBlueprint` / `ConfigValidator` / `DependencyChecker` 全部移到 `devtools/`
- 运行时不再加载这些工具；需要校验时走 Node CLI 或单独 debug bundle
- `SafetyHelper` 只保留四类能力：
  - JSON 解析保护
  - 可选函数调用 fallback
  - 资源加载 fallback
  - 明确边界的异常包装
- 删除未使用或泛化过度的方法，例如 `preventDuplicate`、`safeCreateUI`、`hasMethod`
- `EnvironmentConfig` 拆为：
  - `BootstrapPatches`
  - `DebugFlags`
- `errorProbe` 二选一：本方案选择移出运行时主链，只保留 debug 独立入口

## Implementation Sequence
### Phase 1: Foundation
- 引入 `package.json`、`tsconfig.json`、`esbuild` 构建脚本
- 建立 `src-mod/` 新模块根目录，不在旧 `assets/src/` 上继续扩展
- 生成 `assets/generated/manifest.json` 与 bundle 产物
- 改 `preloading.js` / `AssetsManager.js` 为基于 manifest 的 bundle 加载
- 建立 `AppContext`、`DebugFlags`、`PlatformFacade`
- 把 devtools 从运行时加载链移除

### Phase 2: State + Persistence
- 建立 `SaveGameV2`
- 拆 `Player` 状态与持久化边界
- 清理 `player.js` 中已被 service 接管但仍残留的旧实现
- 把时间推进、属性变更、恢复流程迁到独立 domain/app service

### Phase 3: Router + UI Boundary
- 拆 `Navigation`
- `MenuScene`、`MainScene`、`MapNode` 先切到 `AppContext` + app service
- `uiUtil` 只保留展示辅助；购买文案、内容校验调用、角色/天赋推导迁出

### Phase 4: Domain Consolidation
- 把 `battle`、`site`、`travel`、`zipline`、`purchase` 统一成 domain + app 双层
- 将现有已成形的 service 并入新结构
- 删除旧 facade 和兼容转发层
- 删除 `jsList.js` 旧依赖链与遗留 console validator

## Test Plan
- 构建测试：
  - `esbuild` 能产出 web/native 可加载 bundle
  - `manifest.json` 能被 `preloading.js` 和 `AssetsManager.js` 正确消费
- 启动测试：
  - Web 启动进入菜单
  - Native 启动经过资源更新流程后进入 splash/menu
- 存档测试：
  - 新游戏创建 `SaveGameV2`
  - 继续游戏、死亡、重开、切槽正常
  - 明确拒绝旧存档时给出稳定处理，不允许半恢复
- 业务回归：
  - 菜单 -> 开始/继续 -> 主场景
  - 家中 -> 地图 -> 站点 -> 房间推进 -> 结算
  - 战斗开始/结束/逃跑
  - 滑索建造/移除/路线时间修正
  - 商店/购买/解锁流程
- 分层测试：
  - domain service 单测：travel、zipline network、battle settlement、role runtime、save serialization
  - app service 集成测试：new game、continue、enter site、purchase unlock
- 工具边界测试：
  - 运行时主 bundle 不包含 blueprints/validators/probe
  - CLI 校验命令仍可运行

## Assumptions
- 这轮以“结构重建优先”为目标，不保留旧存档兼容
- 可以接受在重构过程中先保留极薄全局 facade，但它们必须是临时层
- 不引入新的运行时蓝图/校验工具，所有开发辅助能力都走 devtools
- 平台层先做 adapter 收口，不在第一阶段重写每个 SDK 的内部实现
