# 新增功能配置清单

## 新增物品检查清单

### 必须配置的文件（8个）

- [ ] **itemConfig.js** - 物品基础属性
  - weight（重量）
  - price（价格）
  - value（价值）
  - effect_weapon/effect_tool/effect_equip（效果）

- [ ] **string_zh.js** - 中文文案
  - title（名称）
  - des（描述）

- [ ] **string_en.js** - 英文文案
  - title（名称）
  - des（描述）

- [ ] **icon.plist** - 图标资源
  - 复制完整的dict配置块
  - 或复用已有图标

- [ ] **uiUtil.js** - 图标映射（如复用图标）
  - 在getDisplayItemId中添加映射

- [ ] **ui/equipNode.js** - 装备界面图标
  - createOneLineView使用uiUtil.getDisplayItemId()
  - updateTabView使用uiUtil.getDisplayItemId()

- [ ] **blackList.js** - 黑名单配置
  - storageLost（丢失黑名单）
  - storageDisplay（显示黑名单）
  - randomLoop（随机循环黑名单）

- [ ] **特殊逻辑** - 如有特殊效果
  - IAPPackage.js（天赋相关）
  - Battle.js（战斗相关）
  - player.js（属性相关）

### 验证步骤

```javascript
// 在游戏中运行验证
var result = ConfigValidator.validateItem(你的物品ID);
if (!result.valid) {
    cc.error("配置不完整: " + result.errors.join(", "));
}
```

## 新增角色检查清单

### 必须配置的文件（8个）

- [ ] **game/role.js**
  - RoleType中添加常量
  - getExchangeIdByRoleType添加映射
  - getPurchaseIdByRoleType添加映射
  - getRoleInfo添加映射

- [ ] **data/string/string_zh.js**
  - 角色名称、描述、效果文案（1311-1344区间）

- [ ] **game/medal.js**
  - ExchangeAchievementConfig添加解锁配置（1001-1006区间）

- [ ] **data/npcConfig.js**
  - 添加角色NPC配置

- [ ] **game/Build.js**
  - _isActionVisibleByRoleAndState添加专属配方判断

- [ ] **game/player.js**
  - 如有特殊属性修正，添加角色判断

- [ ] **game/Battle.js**
  - 如有战斗特性，添加角色判断

- [ ] **ui/ChooseScene.js**
  - 添加角色选择槽位

## 新增天赋检查清单

### 必须配置的文件（6个）

- [ ] **game/IAPPackage.js**
  - _talentPurchaseIdList添加天赋ID

- [ ] **game/medal.js**
  - ExchangeAchievementConfig添加1/2/3级解锁配置
  - 如有物品奖励，添加effect.items

- [ ] **data/string/string_zh.js**
  - 天赋名称、描述、效果文案（p_xxx格式）

- [ ] **game/IAPPackage.js**
  - 添加天赋效果函数
  - 使用_getActiveTalentLevel获取等级

- [ ] **调用点**
  - 在需要生效的地方调用效果函数

- [ ] **game/medal.js**
  - 如天赋3级有物品奖励，确保improveTalentItems能发放

## 安全编码规范

### 类型检查

```javascript
// ❌ 危险写法
if (IAPPackage.someFunction) { ... }

// ✅ 安全写法
if (typeof IAPPackage.someFunction === 'function') { ... }

// ✅ 或使用SafetyHelper
SafetyHelper.safeCall(IAPPackage.someFunction, defaultValue, arg1, arg2);
```

### 防止重复执行

```javascript
// ✅ 在关键函数开头添加
if (this._isProcessing) return;
this._isProcessing = true;
try {
    // 业务逻辑
} finally {
    this._isProcessing = false;
}

// ✅ 或使用SafetyHelper
this.myFunction = SafetyHelper.preventDuplicate(this, '_isProcessing', function() {
    // 业务逻辑
});
```

### UI创建

```javascript
// ✅ 所有UI创建都包裹try-catch
try {
    var label = new cc.LabelTTF(...);
    // ... 设置属性
    this.addChild(label);
} catch (e) {
    cc.error("UI creation failed: " + e);
}

// ✅ 或使用SafetyHelper
var label = SafetyHelper.safeCreateUI(function() {
    var l = new cc.LabelTTF(...);
    // ... 设置属性
    return l;
}, "Label creation failed");
if (label) {
    this.addChild(label);
}
```

### 图标获取

```javascript
// ✅ 使用IconManager统一管理
var iconName = IconManager.getItemIcon(itemId);
var sprite = IconManager.getSafeItemSprite(itemId, "icon_item_", "icon_item_1101051.png");
```
