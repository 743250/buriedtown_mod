# Engine Semantics

这个文件记录 UI Preview 复刻真实 Cocos2d-JS 引擎行为时的证据来源和当前覆盖范围。以后修改 `runtime/cc-stub.js`、`uiExporter.js`、`render.py` 时，先查这里列出的来源，不能靠截图猜默认值。

## 证据优先级

1. 本仓库随包 JSB 文件。它们和 APK 使用的脚本层版本一致，是最高优先级来源。
   - `assets/script/jsb_cocos2d.js`
   - `assets/script/jsb_cocos2d_constants.js`
   - `assets/script/jsb_property_apis.js`
   - `assets/script/jsb_property_impls.js`
   - `assets/script/extension/jsb_cocos2d_extension.js`
   - `assets/script/extension/jsb_ext_create_apis.js`
   - `assets/script/extension/jsb_ext_property_apis.js`
2. Cocos2d-JS / cocos2d-x 3.6 原生源码。JSB 文件只包装 JS API，节点初始化、默认锚点、控件内部布局等如果 JSB 没写，要查对应 C++ 类。
3. 真机运行探针。对 JSB 和源码都无法直接确认的行为，在真机里导出节点属性或构造最小测试场景确认。
4. 真机截图。截图只用于发现差异和校准工具，不能作为逐场景硬编码依据。

## 已确认版本

`assets/script/jsb_cocos2d.js` 明确写着：

```javascript
cc.ENGINE_VERSION = "Cocos2d-JS v3.6";
```

因此 stub 的目标不是泛化的现代 Cocos，也不是浏览器 cocos2d-html5，而是这个项目包内的 Cocos2d-JS v3.6 JSB 行为。

## 当前语义表

| 类/能力 | 真实来源 | 预览要求 |
| --- | --- | --- |
| `cc.Node` 属性别名 | `assets/script/jsb_property_apis.js`、`assets/script/jsb_property_impls.js` | `x/y/width/height/anchorX/anchorY/scale/scaleX/scaleY/rotation/opacity/color/visible/children/parent` 必须走真实 getter/setter 语义 |
| `cc.Node.attr()` | `assets/script/jsb_property_apis.js` | 逐字段赋值，不能写成独立配置缓存 |
| 对齐常量 | `assets/script/jsb_cocos2d_constants.js` | `LEFT=0/CENTER=1/RIGHT=2`，`TOP=0/CENTER=1/BOTTOM=2` |
| `cc.EventListener` 常量 | `assets/script/jsb_cocos2d.js` | `UNKNOWN=0`、`TOUCH_ONE_BY_ONE=1`、`TOUCH_ALL_AT_ONCE=2`、`KEYBOARD=3`、`MOUSE=4`、`ACCELERATION=5`、`FOCUS=6`、`CUSTOM=8` |
| `cc.FontDefinition` | `assets/script/jsb_cocos2d.js` | 默认字体 `Arial`、字号 `12`、水平居中、垂直顶部、白色填充 |
| `cc.LabelTTF.setDimensions()` | `assets/script/jsb_cocos2d.js` | 支持 `(size)` 和 `(width, height)` 两种调用 |
| `cc.LabelTTF.create()` | `assets/script/jsb_create_apis.js` | 支持 FontDefinition 和普通参数形式 |
| `cc.ControlButton` 构造 | `assets/script/extension/jsb_ext_create_apis.js` | 根据参数走 `initWithTitleAndFontNameAndFontSize`、`initWithLabelAndBackgroundSprite`、`initWithBackgroundSprite`、`init` 对应语义 |
| `cc.ControlButton` 属性 | `assets/script/extension/jsb_ext_property_apis.js` | `color/opacity/adjustBackgroundImage/zoomOnTouchDown/preferredSize/labelAnchor` 要能通过属性或 setter 生效 |
| `cc.ControlButton` 事件 | `assets/script/extension/jsb_cocos2d_extension.js` | `CONTROL_EVENT_TOUCH_UP_INSIDE=32` 等事件常量必须正确；注册后导出为可点击节点 |
| `cc.ScrollView` 构造和方向 | `assets/script/extension/jsb_ext_create_apis.js`、`assets/script/extension/jsb_ext_property_apis.js` | `new cc.ScrollView(size, container)` 走 viewSize/container 语义；`direction` 是真实属性 |
| `cc.Scale9Sprite` | `assets/script/jsb.js`、C++ `Scale9Sprite` | 是 sprite-like 节点，支持 frame/file 初始化、content size、`getSprite()`；渲染层不能当普通空 Node |

## 工作规则

1. 先查本地 JSB，再查 C++，最后才用真机探针。
2. stub 只能补通用引擎语义，不能按场景、截图、文案写特殊逻辑。
3. 导出层只导出真实运行节点的属性，不推断业务状态。
4. 渲染层只画导出属性，不替游戏代码发明节点。
5. 每次修复都要跑 `bash tools/ui-preview/run-all.sh`，并检查 `runtime_report.md` 里的节点、文本、点击目标和 lint。

## 当前重点缺口

- 继续扩展自动审计，覆盖 JSB 中声明的属性别名和 stub 的实际实现。
- 对 `ControlButton`、`Button`、`TableViewButton` 的点击区域做报告校验，避免再次出现按钮存在但 `Click targets: 0`。
- 对 ScrollView/TableView 的裁剪和 content offset 做真机探针，确认报告里的越界是否真实问题。
