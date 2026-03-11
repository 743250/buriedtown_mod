# BuriedTown Mod Notes

本仓库只保留这一份维护文档。

它合并了此前分散的重构说明、检查清单、测试清单和调试说明，目标是减少噪音，只保留仍然有用的内容。

## 项目目标

- 在扩内容的同时持续做结构收口。
- 优先降低 UI bug、崩溃和资源映射错误。
- 新功能优先复用已有 service / manager / router / state。
- 不在旧核心里继续堆临时分支和一次性 helper。

## 主要目录

- `assets/src/game`: 核心业务逻辑
- `assets/src/ui`: 场景、节点、弹窗和交互
- `assets/src/util`: 通用工具、容错、配置与资源辅助
- `assets/src/data`: 配置和多语言文本
- `tools`: 仓库级静态校验脚本

## CLI 校验工具

统一入口：

```bash
node tools/validate-content.js
```

常用命令：

- `node tools/validate-content.js all --lang zh`
- `node tools/validate-content.js item-ui --strict-text`
- `node tools/validate-content.js links build --lang zh`
- `node tools/validate-content.js links build-action --lang zh`
- `node tools/validate-content.js weapon-links --lang zh`
- `node tools/validate-content.js site-links --lang zh`
- `node tools/validate-content.js checklist role 1 --lang zh`

仓库级检查统一走 `tools/validate-content.js`；如果只是想在游戏内临时看单个配置，可直接调用 `ConfigValidator.printResult(type, id)` 或 `ConfigValidator.printChecklist(type, id)`。

## 工作原则

1. 小步改动，一次只收口一条链路或一个小模块。
2. 改动前先识别 fallback、加载顺序和回归范围。
3. 能复用现有入口，就不要在 UI 页里重复写业务逻辑。
4. 先稳住行为，再推进结构优化。

## 当前重构重点

### Phase 1: 购买 / IAP 链路收口

目标：
- 支付结果解释、补发、取消购买、解锁记录统一在 `assets/src/game/PurchaseService.js`
- UI 只消费结构化结果，不再直接解释旧 `payResult`

优先关注：
- `assets/src/game/PurchaseService.js`
- `assets/src/util/utils.js`
- `assets/src/ui/shopScene.js`
- `assets/src/ui/shopNode.js`
- `assets/src/ui/deathNode.js`
- `assets/src/ui/home.js`
- `assets/src/ui/buildNode.js`
- `assets/src/ui/dialog.js`

### Phase 2: 玩家 / 站点边界拆分

目标：
- 把初始化、兼容恢复、掉落和运行时拼装逐步从旧核心文件移开

高风险枢纽：
- `assets/src/game/player.js`
- `assets/src/game/site.js`
- `assets/src/game/IAPPackage.js`
- `assets/src/game/buildAction.js`
- `assets/src/ui/dialog.js`
- `assets/src/ui/uiUtil.js`
- `assets/src/ui/battleAndWorkNode.js`

### Phase 3: UI 公共层瘦身

目标：
- 让 `uiUtil.js` 和 `dialog.js` 回到共享层职责，不继续吸业务逻辑

### Phase 4: 战斗主链收尾

目标：
- 明确战斗流程、结算、展示、日志生成的职责边界

## 新增内容检查

### 新增物品

- `assets/src/data/itemConfig.js`: weight / price / value / effect
- `assets/src/data/string/string_zh.js`: title / des
- `assets/src/data/string/string_en.js`: title / des
- `res/icon.plist`: 图标资源或复用映射
- `assets/src/ui/uiUtil.js`: 显示 ID / 图标映射
- `assets/src/ui/equipNode.js`: 装备页展示路径
- `assets/src/data/blackList.js`: storageLost / storageDisplay / randomLoop
- 如有特殊逻辑，再检查 `IAPPackage.js`、`Battle.js`、`player.js`

验证示例：

```javascript
var result = ConfigValidator.validateItem(ITEM_ID);
if (!result.valid) {
    cc.error("配置不完整: " + result.errors.join(", "));
}
```

### 新增角色

- `assets/src/game/role.js`: `RoleType`、purchase / exchange 映射、角色信息
- `assets/src/game/medal.js`: 兑换配置
- `assets/src/plugin/purchaseList.js`: 购买项映射
- `assets/src/data/npcConfig.js`: NPC 配置
- `assets/src/ui/ChooseScene.js`: 角色选择展示
- `assets/src/game/Build.js`: 角色特定规则
- `assets/src/game/player.js` / `assets/src/game/Battle.js`: 角色特性
- 中英文文本和头像 / 图标资源

### 新增天赋

- `assets/src/game/IAPPackage.js`: 天赋列表与效果函数
- `assets/src/game/medal.js`: 1 / 2 / 3 级兑换配置
- `assets/src/data/string/string_zh.js` / `string_en.js`: `p_xxx` 文案
- 实际生效调用点
- 三级奖励发放逻辑

## 风险检查

改动前至少确认这三件事：

1. 这段代码有没有 fallback 语义，例如 `||`、三元、短路判断。
2. 这次改动会不会影响脚本加载顺序，例如 `jsList.js`。
3. 我能不能马上做最小回归验证。

常见高风险区域：

- UI 层
- 战斗系统
- 装备显示与图标链路
- 存档 / 初始化

## 安全编码约定

### 类型检查

```javascript
if (typeof obj.fn === "function") {
    obj.fn();
}
```

### 防止重复执行

```javascript
if (this._isProcessing) return;
this._isProcessing = true;
try {
    // business logic
} finally {
    this._isProcessing = false;
}
```

### 影子函数法

适用于高风险重构：

1. 旧函数改名为 `xxx_old`
2. 新函数保留原签名
3. 写验证函数比对新旧输出
4. 验证通过后再删旧实现

## 最小测试清单

### 角色系统

- 角色选择和解锁正常
- 角色专属规则正常

### 天赋系统

- 已改动天赋效果正确
- 三级奖励发放正确

### 战斗系统

- 伤害、精准、爆头、防御正常
- 战后恢复正常

### UI 系统

- 背包、装备、交易、战斗界面不崩
- 商店弹窗和购买流程正常

### 特殊功能

- 关键道具 / 特殊武器逻辑正常
- 时间加速正常
- 开箱和随机事件不崩

测试记录模板：

- 测试日期：
- 改动范围：
- 基线结果：
- 回归结果：
- 新问题与处理：

## 远程调试

如果需要 JSB 远程调试：

- 在 `AppDelegate::applicationDidFinishLaunching()` 中启用 `sc->enableDebugger()`
- 仅在调试构建下启用
- 使用 Firefox Remote Debugging 连接

## 已合并的旧文档

以下文档内容已收进本文件，不再单独保留：

- `assets/PROJECT_DOC.md`
- `assets/REFACTOR_GUIDE.md`
- `assets/REFACTOR_PRIORITY_PLAN.md`
- `assets/REFACTOR_LOG.md`
- `assets/CHECKLIST.md`
- `assets/TEST_CHECKLIST.md`
- `assets/REFACTOR_SAFETY_GUIDE.md`
- `assets/SHADOW_FUNCTION_TEMPLATE.md`
- `assets/script/debugger/README.md`
