# 重构方法指南

## 🎯 核心原则

### 1. 小步快跑
- 每次只改一个文件或一个函数
- 改完立即测试
- 测试通过再继续
- 测试失败立即回退

### 2. 测试驱动
- 改动前：记录当前行为
- 改动后：验证行为一致
- 使用TEST_CHECKLIST.md

### 3. 文档先行
- 改动前：在REFACTOR_LOG.md记录计划
- 改动后：记录结果和问题

## 📝 标准重构流程

### 步骤1：选择目标
选择一个文件或功能模块，优先级：
1. 核心逻辑层（game/*.js）
2. 配置层（data/*.js）
3. UI层（ui/*.js）

### 步骤2：分析现状
- 读取文件，理解逻辑
- 识别重复模式
- 识别硬编码
- 识别容错逻辑

### 步骤3：制定计划
在REFACTOR_LOG.md中记录：
- 要改什么
- 为什么改
- 怎么改
- 预期影响范围

### 步骤4：执行重构
- 一次只改一处
- 保持原有逻辑不变
- 使用合适的工具

### 步骤5：测试验证
- 对照TEST_CHECKLIST.md测试
- 记录测试结果
- 发现问题立即回退

### 步骤6：记录结果
在REFACTOR_LOG.md中记录：
- 实际改动
- 测试结果
- 遇到的问题
- 解决方案

## 🛠️ 工具选择指南

### SafetyHelper.safeCall
**适用场景：**
- 函数可能不存在
- 需要异常保护
- 不需要fallback逻辑

**示例：**
```javascript
var result = SafetyHelper.safeCall(IAPPackage.someFunction, defaultValue, arg1, arg2);
```

### SafetyHelper.safeCallWithFallback
**适用场景：**
- 原代码有 `|| fallback` 模式
- 原代码有 `fn ? fn() : default` 模式
- 需要处理返回值为falsy的情况

**示例：**
```javascript
// 原代码：result = fn(arg) || defaultValue
var result = SafetyHelper.safeCallWithFallback(fn, defaultValue, arg);
```

### ConfigManager
**适用场景：**
- 查询角色配置
- 查询天赋配置
- 替代硬编码映射

**示例：**
```javascript
var exchangeId = ConfigManager.getRoleExchangeId(roleType);
var effectValue = ConfigManager.getTalentEffectValue(talentId, level);
```

### IconManager
**适用场景：**
- 新增物品的图标获取
- 需要验证图标存在性
- **不适用：** 已有UI代码（保持原样）

## ⚠️ 常见陷阱

### 陷阱1：过度重构
**问题：** 一次改太多，出问题难定位
**解决：** 小步快跑，每次只改一处

### 陷阱2：忽略容错逻辑
**问题：** 原代码的 `|| fallback` 被忽略
**解决：** 使用safeCallWithFallback

### 陷阱3：改变UI逻辑
**问题：** UI代码通常有特殊处理
**解决：** UI层保守重构，优先改逻辑层

### 陷阱4：缺少测试
**问题：** 改完不测试，积累问题
**解决：** 每次改动后立即测试

## 📊 重构优先级

### 高优先级（立即做）
- ✅ 配置系统（已完成）
- ⏳ Battle.js核心函数
- ⏳ player.js核心函数
- ⏳ IAPPackage.js剩余函数

### 中优先级（后续做）
- ⏳ 其他game/*.js文件
- ⏳ 配置验证系统
- ⏳ 错误处理统一

### 低优先级（可选）
- ⏳ UI层重构
- ⏳ 性能优化
- ⏳ 代码风格统一
