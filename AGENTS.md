# BuriedTown Mod Agent Guide

本文件是仓库级协作说明，作为后续维护、重构和内容扩展的统一入口。

## 项目概览

- 这是一个以 `assets/src/jsList.js` 为装配入口的旧版 JS 游戏项目，当前工作重点是“边扩内容，边做结构收口”。
- 改动目标优先级：
  - 降低 UI bug、崩溃和资源映射错误
  - 新功能优先复用已有 service / manager / router / state
  - 不继续往旧核心里堆一次性 helper 和临时分支
- 终端在 Windows PowerShell 下读取中文文档时可能出现乱码；必要时按 UTF-8 重新读取。

## 主要目录

- `assets/src/data`: 配置表、多语言文本、内容定义
- `assets/src/game`: 核心业务逻辑、运行时服务、状态模型
- `assets/src/ui`: 场景、节点、弹窗、展示与交互层
- `assets/src/util`: 通用工具、容错、资源辅助、配置校验
- `assets/src/plugin`: 支付、广告、渠道和原生插件适配
- `assets/res`: 高频迭代的新资源目录
- `res`: 旧资源图集，仍保留 `*.plist + *.pvr.ccz` 方案
- `tools`: 仓库级校验、smoke、资源规范化工具

## 改动原则

1. 小步改动，一次只收口一条链路或一个小模块。
2. 改动前先确认 fallback 语义、脚本加载顺序、最小回归范围。
3. 能复用现有入口，就不要在 UI 层重复写业务逻辑。
4. 先稳住行为，再推进结构优化。
5. 新增内容优先改配置和局部服务，不优先回到旧“大文件”里补分支。
6. 优先做结构化收口，不把“补丁式修复”“额外兜底”“临时兼容分支”当默认方案；能通过梳理职责、收敛入口、抽出 service / rule / state 解决的问题，不要继续往旧逻辑上叠判断。
7. 非必要不要新增 fallback、短路兜底、影子状态和一次性 helper；如果确实必须加，要在提交说明或代码注释里写清触发原因、适用边界和后续清理条件。
8. 不要随意改 `assets/src/jsList.js` 的顺序；脚本加载顺序是高风险边界。

## 当前推荐边界

- 内容主配置源：
  - `assets/src/data/roleConfigTable.js`
  - `assets/src/data/talentConfigTable.js`
  - `assets/src/data/itemConfig.js`
  - `assets/src/data/buildConfig.js`
  - `assets/src/data/buildActionConfig.js`
  - `assets/src/data/formulaConfig.js`
- 服务 / 规则解释层：
  - `assets/src/game/RoleRuntimeService.js`
  - `assets/src/game/TalentService.js`
  - `assets/src/game/BuildActionEffectService.js`
  - `assets/src/game/PlayerAttrService.js`
  - `assets/src/game/SiteConfigService.js`
  - `assets/src/game/SiteRewardService.js`
- 高风险旧核心：
  - `assets/src/game/player.js`
  - `assets/src/game/site.js`
  - `assets/src/game/IAPPackage.js`
  - `assets/src/game/PurchaseService.js`
  - `assets/src/ui/dialog.js`
  - `assets/src/ui/uiUtil.js`
  - `assets/src/ui/battleAndWorkNode.js`

## 校验与回归

统一内容校验入口：

```bash
node tools/validate-content.js
```

常用命令：

```bash
node tools/validate-content.js all --lang zh
node tools/validate-content.js item-ui --strict-text
node tools/validate-content.js links build --lang zh
node tools/validate-content.js links build-action --lang zh
node tools/validate-content.js weapon-links --lang zh
node tools/validate-content.js site-links --lang zh
node tools/validate-content.js checklist role 1 --lang zh
```

高风险改动前后建议跑：

```bash
node tools/run-smoke.js
```

如果只是想临时查看单个配置，可直接调用：

- `ConfigValidator.printResult(type, id)`
- `ConfigValidator.printChecklist(type, id)`

## 资源工作流

- 旧资源继续保留在 `res/*.plist + *.pvr.ccz`。
- 新资源优先放提取目录，缺失时再回退到旧资源。
- Mod 新增内容缺图或临时复用旧图时，必须同步更新 `docs/mod-image-assets.md`；专属图落地后将对应条目标为“已替换”。
- 当前常用目录包括：
  - `assets/res/npc`
  - `assets/res/icon`
  - `assets/res/ui`
  - `assets/res/site`
  - `assets/res/build`
  - `assets/res/dig_build`
  - `assets/res/dig_item`
  - `assets/res/dig_monster`
  - `assets/res/dig_work`
  - `assets/res/gate`
  - `assets/res/home`
  - `assets/res/map`
  - `assets/res/menu`
  - `assets/res/rank`
  - `assets/res/end`
  - `assets/res/day`
  - `assets/res/day2`
  - `assets/res/weather`
- 命名尽量沿用现有约定，例如：
  - `npc_dig_9.png`
  - `npc_9.png`
  - `icon_item_1401011.png`
  - `icon_iap_125.png`
  - `site_900.png`

头像规范化工具：

```bash
python3 tools/normalize-portrait.py inspect assets/res/贝尔.png --json
python3 tools/normalize-portrait.py normalize --input assets/res/贝尔.png --output assets/res/npc/npc_dig_8.png --preset npc_dig --trim-alpha --cut 0,0,0,18
```

常用预设：

- `npc_dig`: 生成 `446x264` 的对话立绘
- `npc_map`: 生成 `56x56` 的地图头像

常调参数：

- `--crop x,y,w,h`
- `--cut l,t,r,b`
- `--scale n`
- `--offset x,y`
- `--preview path.png`

## 新增内容检查清单

### 新增物品

- `assets/src/data/itemConfig.js`: `weight / price / value / effect`
- `assets/src/data/string/string_zh.js`: `title / des`
- `assets/src/data/string/string_en.js`: `title / des`
- `res/icon.plist`: 图标资源或复用映射
- `assets/src/ui/uiUtil.js`: 显示 ID、图标映射
- `assets/src/ui/equipNode.js`: 装备页展示路径
- `assets/src/data/blackList.js`: `storageLost / storageDisplay / randomLoop`
- 如有特殊逻辑，再检查：
  - `assets/src/game/IAPPackage.js`
  - `assets/src/game/Battle.js`
  - `assets/src/game/player.js`

校验示例：

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
- `assets/src/game/player.js`
- `assets/src/game/Battle.js`
- 中英文文案和头像 / 图标资源

### 新增天赋

- `assets/src/game/IAPPackage.js`: 天赋列表与效果函数
- `assets/src/game/medal.js`: 1 / 2 / 3 级兑换配置
- `assets/src/data/string/string_zh.js`
- `assets/src/data/string/string_en.js`
- 实际生效调用点
- 三级奖励发放逻辑

## 风险检查

改动前至少确认这三件事：

1. 这段代码是否依赖 fallback 语义，例如 `||`、三元或短路判断。
2. 这次改动是否影响脚本加载顺序，例如 `assets/src/jsList.js`。
3. 是否能马上补一轮最小回归验证。

常见高风险区域：

- UI 层
- 战斗系统
- 装备显示与图标链路
- 存档 / 初始化
- 支付 / 解锁 / 兑换兼容链路

## 安全编码约定

结构优先：

- 优先通过明确输入、明确状态归属、明确模块边界解决问题，不要在业务函数内部直接混入过多“顺手兼容”逻辑。
- 遇到旧代码缺口时，先判断是否应该把规则收口到现有 service / manager / router / state，再决定是否局部修补。
- 如果一个修复需要连续加入多个 `if`、`||`、三元 fallback 或兼容分支，默认先停一下，重新检查是否选错了落点。

类型检查：

```javascript
if (typeof obj.fn === "function") {
    obj.fn();
}
```

防止重复执行：

```javascript
if (this._isProcessing) return;
this._isProcessing = true;
try {
    // business logic
} finally {
    this._isProcessing = false;
}
```

影子函数法适用于高风险重构：

1. 旧函数改名为 `xxx_old`
2. 新函数保留原签名
3. 写验证函数对比新旧输出
4. 验证通过后再删旧实现

## 最小测试清单

角色系统：

- 角色选择和解锁正常
- 角色专属规则正常

天赋系统：

- 已改动天赋效果正确
- 三级奖励发放正确

战斗系统：

- 伤害、精度、爆头、防御正常

资源与 UI：

- 新增图标和立绘路径正确
- UI 中无缺图、错图、空文本

启动链路：

- `MenuScene`
- `ChooseScene`
- `MainScene`

以上三个场景至少能完成最小启动验证。
