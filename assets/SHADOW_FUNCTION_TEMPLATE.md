# 影子函数重构模板

## 🎯 核心思想

**新旧函数并存，逐步切换，验证通过后删除旧函数**

---

## 📝 标准模板

### 步骤1：保留旧函数（改名）

```javascript
// 原函数改名为 _old 后缀
getExchangeIdByRoleType_old: function(roleType) {
    // 保持原始逻辑不变
    if (roleType == 1) {
        return 1001;
    } else if (roleType == 2) {
        return 1003;
    }
    // ... 其他逻辑
},
```

### 步骤2：创建新函数（使用配置表）

```javascript
// 新函数使用重构后的逻辑
getExchangeIdByRoleType: function(roleType) {
    var config = _roleConfigMap[roleType];
    return config ? config.exchangeId : null;
},
```

### 步骤3：添加验证函数

```javascript
// 验证新旧函数结果一致
_verifyGetExchangeId: function() {
    var testCases = [1, 2, 3, 4, 5, 6, 7];
    var allPassed = true;

    for (var i = 0; i < testCases.length; i++) {
        var roleType = testCases[i];
        var oldResult = this.getExchangeIdByRoleType_old(roleType);
        var newResult = this.getExchangeIdByRoleType(roleType);

        if (oldResult !== newResult) {
            cc.error("[验证失败] roleType=" + roleType +
                     " old=" + oldResult + " new=" + newResult);
            allPassed = false;
        }
    }

    if (allPassed) {
        cc.log("[验证通过] getExchangeIdByRoleType 重构成功");
    }
    return allPassed;
},
```

### 步骤4：在初始化时验证

```javascript
// 在游戏启动时自动验证
ctor: function() {
    // ... 原有初始化代码

    // 验证重构
    if (CC_DEBUG) {  // 只在调试模式验证
        this._verifyGetExchangeId();
    }
},
```

### 步骤5：验证通过后删除旧代码

```javascript
// 删除 _old 函数和验证函数
// 只保留新函数
getExchangeIdByRoleType: function(roleType) {
    var config = _roleConfigMap[roleType];
    return config ? config.exchangeId : null;
},
```

---

## 🔧 实战示例

### 示例1：role.js 的函数重构

```javascript
var role = {
    // 配置表
    _roleConfigMap: {
        1: { exchangeId: 1001, purchaseId: 108 },
        2: { exchangeId: 1003, purchaseId: 110 },
        // ...
    },

    // === 重构中的函数 ===

    // 旧函数（保留）
    getExchangeIdByRoleType_old: function (roleType) {
        if (roleType == 1) {
            return 1001;
        } else if (roleType == 2) {
            return 1003;
        } else if (roleType == 3) {
            return 1005;
        } else if (roleType == 4) {
            return 1002;
        } else if (roleType == 5) {
            return 1004;
        } else if (roleType == 7) {
            return 1006;
        }
        return null;
    },

    // 新函数（重构后）
    getExchangeIdByRoleType: function (roleType) {
        var config = this._roleConfigMap[roleType];
        return config ? config.exchangeId : null;
    },

    // 验证函数
    _verifyGetExchangeId: function() {
        var testCases = [1, 2, 3, 4, 5, 6, 7];
        var allPassed = true;

        for (var i = 0; i < testCases.length; i++) {
            var roleType = testCases[i];
            var oldResult = this.getExchangeIdByRoleType_old(roleType);
            var newResult = this.getExchangeIdByRoleType(roleType);

            if (oldResult !== newResult) {
                cc.error("[role.js验证失败] roleType=" + roleType);
                allPassed = false;
            }
        }

        if (allPassed) {
            cc.log("[role.js验证通过] getExchangeIdByRoleType");
        }
        return allPassed;
    }
};
```

### 示例2：IAPPackage.js 的天赋函数重构

```javascript
var IAPPackage = {
    // 配置表
    _talentEffects: {
        101: [1, 0.8, 0.6, 0.4],
        102: [0, 2, 4, 6],
        // ...
    },

    // === 重构中的函数 ===

    // 旧函数
    getWeaponDamageRate_old: function () {
        var level101 = this._getActiveTalentLevel(101);
        if (level101 == 0) {
            return 1;
        } else if (level101 == 1) {
            return 0.8;
        } else if (level101 == 2) {
            return 0.6;
        } else if (level101 == 3) {
            return 0.4;
        }
        return 1;
    },

    // 新函数
    getWeaponDamageRate: function () {
        var level101 = this._getActiveTalentLevel(101);
        return this._talentEffects[101][level101] || 1;
    },

    // 验证函数
    _verifyWeaponDamageRate: function() {
        // 模拟不同等级
        var testLevels = [0, 1, 2, 3];
        var allPassed = true;

        for (var i = 0; i < testLevels.length; i++) {
            // 临时设置等级（需要mock）
            var level = testLevels[i];
            // ... 设置测试环境

            var oldResult = this.getWeaponDamageRate_old();
            var newResult = this.getWeaponDamageRate();

            if (oldResult !== newResult) {
                cc.error("[IAPPackage验证失败] level=" + level);
                allPassed = false;
            }
        }

        if (allPassed) {
            cc.log("[IAPPackage验证通过] getWeaponDamageRate");
        }
        return allPassed;
    }
};
```

---

## 📋 重构工作流程

### 完整流程（每个函数）

**第1步：准备**
- [ ] 选择要重构的函数
- [ ] 理解函数的输入输出
- [ ] 准备测试用例

**第2步：保留旧函数**
- [ ] 将原函数改名为 `functionName_old`
- [ ] 确保旧函数逻辑完全不变

**第3步：创建新函数**
- [ ] 使用配置表或新逻辑实现
- [ ] 保持函数签名一致

**第4步：添加验证**
- [ ] 创建 `_verifyFunctionName` 函数
- [ ] 准备测试用例
- [ ] 对比新旧结果

**第5步：测试**
- [ ] 启动游戏
- [ ] 查看控制台验证结果
- [ ] 测试相关功能

**第6步：决策**
- ✅ 验证通过 → 删除旧函数和验证函数
- ❌ 验证失败 → 分析原因，修复或回退

---

## 🎯 优势总结

### 1. 安全性
- 旧函数始终可用
- 随时可以切回
- 不影响游戏运行

### 2. 可验证性
- 自动对比新旧结果
- 立即发现问题
- 不需要手动测试

### 3. 渐进性
- 每次只改一个函数
- 其他函数不受影响
- 可以随时暂停

### 4. 低成本
- 不需要额外工具
- 不需要测试框架
- 直接在代码中实现

---

## ⚠️ 注意事项

### 1. 验证函数的测试用例要全面

```javascript
// ❌ 不够全面
var testCases = [1, 2];

// ✅ 覆盖所有情况
var testCases = [1, 2, 3, 4, 5, 6, 7, null, undefined, 0, -1];
```

### 2. 注意函数的副作用

```javascript
// 如果函数有副作用（修改状态），验证时要小心
_verifyFunction: function() {
    // 保存当前状态
    var savedState = this.saveState();

    // 测试
    var oldResult = this.function_old();
    this.restoreState(savedState);  // 恢复状态

    var newResult = this.function();
    this.restoreState(savedState);  // 恢复状态

    // 对比
    return oldResult === newResult;
}
```

### 3. 验证通过后及时清理

```javascript
// 删除这些代码：
// - functionName_old
// - _verifyFunctionName
// - 初始化时的验证调用
```

---

## 📊 进度跟踪

### 重构进度表模板

| 文件 | 函数 | 状态 | 验证结果 |
|------|------|------|---------|
| role.js | getExchangeIdByRoleType | ✅ 完成 | 通过 |
| role.js | getPurchaseIdByRoleType | ✅ 完成 | 通过 |
| IAPPackage.js | getWeaponDamageRate | 🔄 进行中 | - |
| IAPPackage.js | getBattleDefenseBonus | ⏸️ 待开始 | - |

**图例：**
- ✅ 完成 - 验证通过，已删除旧代码
- 🔄 进行中 - 新旧函数并存，正在验证
- ⏸️ 待开始 - 尚未开始重构
- ❌ 失败 - 验证失败，已回退

---

**记住：影子函数模式的核心是"安全第一"，新旧并存让你随时可以回退，验证通过再删除旧代码。**
