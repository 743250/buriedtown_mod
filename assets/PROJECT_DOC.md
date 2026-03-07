# 项目维护总文档（PROJECT_DOC）

本文档用于替代以下历史维护文档：
- REFACTOR_SAFETY_GUIDE.md
- REFACTOR_GUIDE.md
- REFACTOR_LOG.md
- TEST_CHECKLIST.md
- CHECKLIST.md
- SHADOW_FUNCTION_TEMPLATE.md

适用范围：项目日常重构、功能新增、回归测试、风险控制。

---

## 1. 核心原则

1. 小步快跑：每次只改一处（一个函数/一个文件/一个子模块）。
2. 测试驱动：改前有基线，改后立刻验证。
3. 安全优先：先识别fallback与加载顺序风险，再动手。
4. 记录闭环：计划、实施、结果、问题都要记录。

重构前先问自己：
1. 这段逻辑是否有fallback（`||`、三元、短路）？
2. 这次改动是否影响脚本加载顺序？
3. 我能否马上验证关键功能？

---

## 2. 标准工作流（计划 -> 执行 -> 验证 -> 记录）

### 2.1 计划阶段
- 明确目标文件与影响范围。
- 列出要保持不变的行为（兼容清单）。
- 列出高风险点（UI、战斗、存档、初始化）。

### 2.2 执行阶段
- 一次只改一处。
- 保持函数签名与外部调用契约稳定。
- 必要时采用“影子函数法”（见第7章）。

### 2.3 验证阶段
- 先跑改动直相关验证，再跑核心回归。
- 失败立即定位并回退到最近稳定点。

### 2.4 记录阶段
记录以下内容：
- 改动文件
- 改动原因
- 测试结果
- 问题与处理

---

## 3. 重构风险分级与前置检查

### 3.1 风险分级
- 高风险：`ui/*.js`、`game/Battle.js`、`ui/equipNode.js`、存档、初始化代码。
- 中风险：`game/*.js`核心逻辑、配置读取/映射、交易与商店。
- 低风险：`util/*.js`、纯配置数据、新增且不影响旧逻辑的模块。

### 3.2 Fallback识别（必须）
常见模式：
- `a = fn() || fallback`
- `cond ? x : y`
- `obj && obj.fn && obj.fn()`
- `if (fn) fn()`

处理规则：
- 有fallback语义时，不要简单替换为会吞掉falsy语义的通用调用。
- 使用等价逻辑或具备fallback能力的封装。

### 3.3 加载顺序检查（必须）
涉及新文件或依赖变更时：
- 确认`jsList.js`加载顺序。
- 确认定义在前、使用在后。
- 能内联配置就尽量内联，降低外部顺序依赖。

### 3.4 UI排版基建（建议默认使用）
新增界面优先使用`uiUtil`里的语义化排版工具，减少手写坐标：
- `uiUtil.textPreset`：统一文字语义（`title` / `sectionTitle` / `body` / `meta` / `caption`）。
- `uiUtil.createLabel(text, preset, opt)`：按语义创建文本，宽度、颜色、描边通过`opt`覆盖。
- `uiUtil.spacing`：统一间距尺度，避免到处散落`6/7/9/13`这类魔法数字。
- `uiUtil.zOrder`：统一背景层、装饰层、内容层、浮层。
- `uiUtil.createVStack(opt)`：从上往下堆叠节点，用于卡片、弹窗、信息面板。

建议规则：
- 新卡片/弹窗尽量“先算宽度，再按内容堆叠”，不要先写死高度。
- 标题、正文、说明文字使用语义字号，不要直接散用裸数字。
- 背景装饰图标统一放`DECORATION`层，正文放`CONTENT`层，按钮/状态胶囊放`FLOAT`层。

示例：
```javascript
var stack = uiUtil.createVStack({
    parent: panel,
    x: 24,
    top: panel.height - 24,
    zOrder: uiUtil.zOrder.CONTENT
});

var title = uiUtil.createLabel("铁人勋章", "title", {
    width: 320,
    fontSize: 30,
    hAlignment: cc.TEXT_ALIGNMENT_LEFT,
    anchorX: 0,
    anchorY: 1
});
stack.add(title, {gapAfter: uiUtil.spacing.XS});

var body = uiUtil.createLabel("单局生存超过10天", "body", {
    width: 320,
    hAlignment: cc.TEXT_ALIGNMENT_LEFT,
    anchorX: 0,
    anchorY: 1
});
stack.add(body, {gapAfter: uiUtil.spacing.SM});
```

---

## 4. 新增功能配置清单

## 4.1 新增物品
至少检查：
- `data/itemConfig.js`：weight/price/value/effect
- `data/string/string_zh.js`：title/des
- `data/string/string_en.js`：title/des
- `res/icon.plist`：图标资源（或复用映射）
- `ui/uiUtil.js`：显示ID/图标映射逻辑
- `ui/equipNode.js`：装备页图标获取路径
- `data/blackList.js`：storageLost/storageDisplay/randomLoop
- 特殊逻辑文件（如战斗、玩家属性、IAP）

建议验证：
```javascript
var result = ConfigValidator.validateItem(ITEM_ID);
if (!result.valid) {
    cc.error("配置不完整: " + result.errors.join(", "));
}
```

### 4.2 新增角色
至少检查：
- `game/role.js`：RoleType、purchaseId/exchangeId映射、角色信息映射
- `game/medal.js`：ExchangeAchievementConfig
- `plugin/purchaseList.js`：购买项映射
- `data/npcConfig.js`：NPC数据完整性
- `ui/ChooseScene.js`：选择槽位/展示数据一致性
- `game/Build.js`：角色特定规则
- `game/player.js` / `game/Battle.js`：角色特性实现
- 文案资源（中英）与头像/图标资源

### 4.3 新增天赋
至少检查：
- `game/IAPPackage.js`：天赋列表与生效函数
- `game/medal.js`：1/2/3级兑换配置
- `data/string/string_zh.js` / `string_en.js`：`p_xxx`
- 生效调用点（战斗/产出/交易/属性）
- 三级奖励发放逻辑（如有）

---

## 5. 安全编码规范

### 5.1 类型检查
```javascript
// 推荐
if (typeof obj.fn === 'function') {
    obj.fn();
}
```

### 5.2 防重复执行
```javascript
if (this._isProcessing) return;
this._isProcessing = true;
try {
    // 业务逻辑
} finally {
    this._isProcessing = false;
}
```

### 5.3 UI创建与资源获取
- 高风险UI创建建议带容错。
- 资源获取优先使用带fallback方法，避免缺图导致弹窗/页面整体失败。

### 5.4 变更约束
- 不要在一次提交中混合“逻辑改造 + 资源系统改造 + UI大改”。
- 先保行为稳定，再优化结构。

---

## 6. 测试总清单

### 6.1 角色系统
- [ ] 陌生人功能正常
- [ ] 老罗功能正常
- [ ] 雅子功能正常
- [ ] 金医生功能正常
- [ ] 比尔功能正常
- [ ] 杰夫功能正常
- [ ] KING功能正常
- [ ] 新增角色（如有）解锁、展示、进入流程正常

### 6.2 天赋系统
- [ ] 101~104效果正确
- [ ] 120~124效果正确
- [ ] 三级解锁奖励发放正确

### 6.3 战斗系统
- [ ] 近战伤害
- [ ] 枪械伤害
- [ ] 精准/爆头
- [ ] 防御与受击
- [ ] 战后恢复

### 6.4 UI系统
- [ ] 装备界面
- [ ] 背包界面
- [ ] 交易界面
- [ ] 战斗界面
- [ ] 商店弹窗与购买流程

### 6.5 特殊功能
- [ ] 关键道具/特殊武器逻辑
- [ ] 时间加速
- [ ] 随机事件与开箱等易崩溃点

### 6.6 测试记录模板
- 测试日期：
- 改动范围：
- 基线结果：
- 回归结果：
- 新问题与处理：

---

## 7. 影子函数重构法（推荐）

目标：在不破坏旧逻辑的前提下平滑替换。

步骤：
1. 保留旧函数，改名`xxx_old`。
2. 新建同签名新函数`xxx`。
3. 写验证函数对比新旧输出。
4. 在调试环境执行验证。
5. 连续验证通过后删除`xxx_old`和验证脚本。

模板：
```javascript
oldFn_old: function (arg) {
    // 原始逻辑
},

oldFn: function (arg) {
    // 新逻辑
},

_verifyOldFn: function () {
    var cases = [/* test cases */];
    var passed = true;
    for (var i = 0; i < cases.length; i++) {
        var c = cases[i];
        if (this.oldFn_old(c) !== this.oldFn(c)) {
            passed = false;
            cc.error("verify failed", c);
        }
    }
    return passed;
}
```

---

## 8. 当前重构状态摘要（来自历史日志）

### 8.1 已完成
- 配置系统重构：角色/天赋配置表与配置管理能力已建立。
- 角色与天赋核心映射改造已落地。

### 8.2 进行中
- SafetyHelper增强及在战斗/装备路径中的应用验证。

### 8.3 历史失败经验
- 全量替换导致战斗UI崩溃：原因是fallback语义被破坏。
- 装备图标链路替换导致关键装备不可用：原因是原有容错逻辑被改变。

### 8.4 下一步建议
- 优先完成战斗核心函数的保守重构与回归。
- 再推进玩家系统与IAP剩余路径。
- 最后做统一错误处理与配置校验增强。

---

## 9. 第三方文档入口（保留独立）

本总文档不合并第三方调试说明，原文档保留：
- `assets/script/debugger/README.md`

---

## 10. 来源映射

- 核心原则、风险分级、安全规范：来自
  - `REFACTOR_SAFETY_GUIDE.md`
  - `REFACTOR_GUIDE.md`
- 新增功能配置清单：来自
  - `CHECKLIST.md`
- 测试章节：来自
  - `TEST_CHECKLIST.md`
- 影子函数重构法：来自
  - `SHADOW_FUNCTION_TEMPLATE.md`
- 状态摘要与阶段结论：来自
  - `REFACTOR_LOG.md`
