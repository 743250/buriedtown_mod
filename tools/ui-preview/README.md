# UI Preview

## 目的

这个工具的目的不是替代真机，也不是做一张好看的静态示意图。它的目的只有一个：**让 AI 在没有人工实时盯图的情况下，尽量真实地理解当前前端 UI 是什么样、有哪些明显问题，并能持续迭代前端代码。**

它要回答的问题包括：

1. 当前场景是否能用真实游戏代码跑起来。
2. 节点、图片、文本、按钮、滚动区域是否真实存在。
3. 布局是否有明显越界、遮挡、跑偏、文字不可见、缺资源。
4. 在给定存档状态下，界面是否能反映真实游戏状态，例如成就点、已购、可领取、已领取。
5. AI 修改前端后，模拟图和报告能否暴露问题，让 AI 不依赖用户截图也能继续自测和修正。

最终目标是形成一个稳定闭环：**AI 改前端 -> AI 跑可视化工具 -> AI 读图片和报告 -> AI 继续修前端**。用户只在工具本身不可信、真机与模拟明显不一致时提供真机截图，帮助我们补全工具。

## 工具定位

**UI Preview 是 AI 的前端单元测试和视觉回归工具。**

它不是人工 QA 流程，也不是美术验收工具。它的首要价值是把“前端代码运行后的 UI 状态”转成 AI 能读的两类产物：

- 图片：让 AI 直接看到大体布局、文本、资源和按钮位置。
- 报告：让 AI 用结构化文本看到节点树、文本列表、资源缺失、越界、lint 问题。

因此，可视化工具必须尽量贴近真实游戏，但它的判断标准不是“像素级一模一样”，而是：

1. 能反映真实前端代码创建了哪些 UI。
2. 能反映真实游戏状态下应该出现哪些文本、按钮和状态。
3. 能反映会影响玩家体验的问题，例如按钮跑偏、文字消失、资源缺失、内容被裁掉。
4. 能稳定复现，方便 AI 多轮迭代。

如果模拟图与真机图不一致，默认先怀疑工具链，而不是立刻改前端。只有确认工具链已经可信，且差异确实来自前端代码，才改前端。

---

## 调用真实游戏代码

工具必须尽量调用真实游戏代码，而不是手写一个“看起来差不多”的 UI 模拟器。

当前链路是：

1. `runtime/generate-all.js` 在 Node VM 中加载 `assets/src/jsList.js` 里的真实脚本顺序。
2. `runtime/cc-stub.js` 提供 Cocos2d-JS 引擎对象，例如 `cc.Node`、`cc.Sprite`、`cc.LabelTTF`、`cc.ScrollView`、`cc.ControlButton`。
3. `generate-all.js` 调用真实 `game.bootstrapRun()`，让 `Record`、`Medal`、`PurchaseService`、`player` 等游戏模块走真实初始化路径。
4. 如存在 `tools/ui-preview/localStorage.json`，工具会在游戏初始化前把它注入 `cc.sys.localStorage`，让游戏代码从存档读取真实状态。
5. 工具实例化目标场景，例如 `ShopScene`、`medalScene`、`ChooseScene`。
6. `assets/src/util/uiExporter.js` 从真实场景节点树导出 `capture_*.json`。
7. `runtime/render.py` 把 capture 渲染成 `render_device_*.png`。
8. `runtime/inspect.js` 和 `lint-ui.js` 生成报告。

这条链路的关键是：**业务逻辑、UI 创建逻辑、配置表、文案、资源名、存档状态，都应该来自游戏代码本身。** 工具可以模拟 Cocos 引擎，但不能重写游戏 UI 逻辑。

## 一致性的含义

“和真机一致”不是指每一个像素都一样。这个项目当前需要的是功能级、诊断级一致：

1. 同一份前端代码创建出的节点结构要一致。
2. 同一份存档状态下，关键文本和状态要一致。
3. 资源是否存在、按钮在哪里、文本是否可见，要能反映真实问题。
4. 滚动、裁剪、锚点、尺寸、九宫格、按钮 preferred size 等 Cocos 语义要尽量一致。

允许存在的差异：

- 字体渲染细节。
- 轻微抗锯齿差异。
- 非关键色彩差异。
- 不是当前问题重点的装饰性差异。

不允许忽略的差异：

- 文本缺失或文本状态错误。
- 按钮位置明显不对。
- 资源缺失或资源错位。
- 存档状态没有反映到界面。
- 真实游戏有节点，预览没有；或预览有节点，真实游戏没有。
- 引擎语义缺失导致大量场景都画错。

## 前端迭代闭环

正常前端开发时，不应该每次都等用户给真机截图。AI 应该自己使用工具形成闭环：

1. 修改前端代码。
2. 执行 `bash tools/ui-preview/run-all.sh`。
3. 查看 `tools/ui-preview/dist/render_device_*.png`，确认主要视觉状态。
4. 查看 `tools/ui-preview/dist/runtime_report.md`，确认文本、资源、节点和越界。
5. 查看 `tools/ui-preview/dist/lint_report_*.md`，确认布局规范问题。
6. 如果模拟图或报告暴露前端问题，继续改前端并重复。
7. 如果模拟图明显不可信，停止改前端，先归因和修复工具链。

前端问题与工具问题必须分开：

- 工具可信，UI 真的有问题：改前端。
- 工具不可信，UI 可能被工具画错：改工具。
- 存档状态不一致：先注入真实存档，不改前端。
- 真机截图和模拟图差异来自引擎语义缺失：补通用 stub/export/render 能力，不写场景特例。

## 真机截图的作用

用户提供真机截图时，它不是让 AI “照着截图改图”，而是让 AI 反推可视化工具哪里不可信。

处理流程：

1. 对比真机截图和当前 `render_device_*.png`。
2. 列出关键差异，只关注会影响诊断的问题，例如文本缺失、状态不对、按钮跑偏、资源缺失。
3. 判断差异来源：
   - 存档不同：导入真机 localStorage。
   - Cocos stub 不一致：补 `cc-stub.js` 的真实引擎语义。
   - 导出缺字段：补 `uiExporter.js` 的通用节点属性导出。
   - 渲染器没画出已导出的属性：补 `render.py` 的通用渲染能力。
   - 前端代码真的错：再改前端。
4. 每次修复都必须是通用规则，不能为某一张截图、某一个场景写硬编码。
5. 修复后重新生成同一场景，确认差异是否减少。

真机截图的价值是校准工具，不是替代工具。工具越可信，之后越少需要用户截图。

## 真机一致性维护规则

可视化工具的目标是尽量反映真实 Cocos2d-JS 游戏，而不是生成一张“看起来像真机截图”的手工模拟图。真机截图只能用来发现工具链缺陷，不能作为逐场景硬编码、修图或改前端迎合预览图的依据。

真实引擎默认行为的来源按优先级固定为：

1. 本仓库随包的 Cocos2d-JS JSB 文件，版本是 `Cocos2d-JS v3.6`。
2. Cocos2d-JS / cocos2d-x 3.6 原生源码。
3. 真机运行探针导出的节点属性。
4. 真机截图，只用于发现差异。

详细证据链和当前覆盖范围见 `tools/ui-preview/ENGINE_SEMANTICS.md`。修改 stub 前应先查该文档列出的 JSB 文件；修改后应跑：

```bash
node tools/ui-preview/check-engine-semantics.js
```

发现真机图与预览图不一致时，必须先归因：

1. 如果是 `runtime/cc-stub.js` 没有模拟真实 Cocos 引擎语义，只修改 stub，让节点创建、继承关系、属性 setter/getter、默认值、尺寸、锚点、颜色、透明度、事件等行为与真实引擎一致。
2. 如果是 `uiExporter.js` 没有导出真实节点属性，只记录为导出层缺陷；不要通过改前端或按场景写特殊逻辑绕过。
3. 如果是 `render.py` 没有画出已导出的真实属性，只记录为渲染层缺陷；不要为了单张截图手动调色、调位置或写场景专用分支。
4. 如果是真机状态不同，例如存档、成就点、已购状态、语言、平台分支不同，应通过可重复的真实状态注入复现同状态；不要改 UI 代码来匹配某张截图。

允许的修复优先级：先补真实引擎语义的 stub；再补通用导出能力；最后补通用渲染能力。任何修复都必须对同类场景通用，不能只服务某一个场景或某一张图。

### 存档状态

预览默认使用空存档。如果需要复现真机状态，把从真机导出的 `cc.sys.localStorage` 键值保存为：

```text
tools/ui-preview/localStorage.json
```

`run-all.sh` 会在游戏代码加载和 `game.bootstrapRun()` 之前自动注入它，让 `Medal.init()`、`PurchaseService` 等真实初始化逻辑从存档读取数据。文件格式是普通 JSON 对象；值可以是字符串，也可以是对象，对象会自动序列化成 localStorage 字符串。

示例：

```json
{
  "achievementPoints": "1274",
  "exchangeAchievements": {
    "1001": {"unlocked": true, "time": 1},
    "1002": {"unlocked": true, "time": 1}
  }
}
```

不要从截图手填状态当作真机存档。截图只能帮助判断差异，真实状态应来自导出的 localStorage。

## AI 自测流程（默认走这条）

一键全链路：

```bash
bash tools/ui-preview/run-all.sh
```

脚本做四件事：`generate-all.js` 产 `capture_*.json` → `render.py` 渲 `render_*.png` → `inspect.js` 产 `runtime_report.md` → `lint-ui.js` 产 `lint_report_*.md`（**只在有问题时才写文件**，0 issues 不生成，避免 dist 堆积空报告）。产物全在 `dist/`。

AI 闭环：

1. 改前端代码
2. 跑 `run-all.sh`
3. 读 `dist/runtime_report.md` + `dist/render_*.png` + `dist/lint_report_*.md`
4. 根据报告和图再改代码，回到第 1 步

手动分步（需要只跑某一阶段时用）：

```bash
# 单场景生成 capture
node tools/ui-preview/runtime/generate-all.js \
    --target src/ui/MenuScene.js --instantiate MenuScene --name MenuScene

# 单场景渲染 PNG
python3 tools/ui-preview/runtime/render.py \
    --in dist/capture_MenuScene.json --out dist/render_MenuScene.png

# 扫描所有 capture_*.json 生成 AI 报告
node tools/ui-preview/runtime/inspect.js --out dist/runtime_report.md

# 单场景规范检查
node tools/ui-preview/lint-ui.js --in dist/capture_MenuScene.json --out dist/lint_report.md

# 回归对比（可选，需要 golden 快照）
node tools/ui-preview/check-regression.js \
    --golden golden/capture_MenuScene.json \
    --current dist/capture_MenuScene.json
```

## 目录

```
tools/ui-preview/
├── README.md                  # 本文档
├── package.json
├── run-all.sh                 # AI 自测一键全链路（默认入口）
├── lint-ui.js                 # 规范检查（按钮/字号/越界/溢出）
├── check-regression.js        # UI 回归对比（golden vs current）
├── runtime/
│   ├── generate-all.js        # 装载场景 → 产 capture_*.json
│   ├── render.py              # capture JSON → render PNG
│   ├── inspect.js             # capture JSON → AI 报告
│   ├── cc-stub.js             # Cocos2d 模拟桩
│   └── cc-stub-extras.js
├── .work/                     # 中间产物（capture_*.json、log、render txt）—— AI 不用看
└── dist/                      # 最终交付：render_*.png（模拟图）+ 报告
```

`dist/` 只放两类东西：**模拟图**（`render_*.png`）和**报告**（`runtime_report.md` + `lint_report_*.md`，后者只在有问题时出现）。其余一律落到 `.work/`。

## 数据源（游戏源码侧）

- `assets/src/util/uiExporter.js` — `window.exportCurrentScene(name)`，dump 当前场景节点树 JSON

节点 schema：`kind / name / x / y / anchorX / anchorY / width / height / scaleX / scaleY / rotation / visible / opacity / zOrder` + Sprite 的 `spriteFrameName` + Label 的 `text / fontSize / fontFamily / dimensions` + `children[]`。

## 产物分布

| 文件 | 位置 | 说明 |
|------|------|------|
| `capture_<scene>.json` | `.work/` | `generate-all.js` dump 的节点树（中间产物） |
| `render_<scene>.png` | `dist/` | `render.py` 渲染的模拟图（**交付**） |
| `runtime_report.md` | `dist/` | `inspect.js` 汇总报告（**交付**） |
| `lint_report_<scene>.md` | `dist/` | `lint-ui.js` 单场景规范检查（**交付**，仅在有问题时生成） |
| `log_*.txt` / `render_*.txt` / `lint_*.txt` | `.work/` | 各阶段日志（排障用） |

## 验证

```bash
# 语法
node -c tools/ui-preview/runtime/inspect.js
python3 -c "import ast; ast.parse(open('tools/ui-preview/runtime/render.py').read())"
node -c tools/ui-preview/lint-ui.js
node -c tools/ui-preview/check-regression.js
```
