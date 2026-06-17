# UI Simulator

这是给 Codex 修改前端后自检用的本地模拟平台。它不拉起 Cocos runtime，而是读取真实配置、文案和资源，把高风险 UI 的数据投影到 HTML 里的固定尺寸界面盒子中，用来快速发现文案溢出、图片缺失、fallback 和状态展示问题。

## Usage

```bash
node tools/ui-preview/generate.js
```

默认生成：

```text
tools/ui-preview/dist/index.html
```

这个 HTML 不依赖 dev server，可以直接用浏览器打开。`--json` 会输出同一份模拟数据，方便后续接自动检查。

## Scenarios

当前平台内置这些场景：

- 开始选择：引用 `ChooseScene.js`、`RoleTalentUiHelper.getRoleInfoViewModel`、`RoleTalentUiHelper.getTalentRowViewModels`。
- 角色弹窗：引用 `RoleTalentUiHelper.showRoleInfoDialog` 和 `DialogBig` 的固定内容区。
- 天赋弹窗：引用 `RoleTalentUiHelper.showTalentInfoDialog`、`PurchaseUiHelper.getTalentDisplayInfo` 和 `DialogSmall`。
- 商店卡片：引用 `PurchaseUiHelper.createPayItemNode`、`PurchaseService` 的商店列表和 `PurchaseList`。
- 成就墙：引用 `MedalSceneView._createSeriesPanel`、`MedalConfig` 和 `string.m_*` 文案。
- 成就兑换：引用 `ExchangeAchievementConfig`、`PurchaseUiHelper` 和 `Medal.exchangeAchievement` 相关前端状态。
- 文案探针：把角色、天赋、购买、成就文案塞进常见固定尺寸文本框。
- 资源报告：检查 `assets/res/*.plist`、standalone 资源、fallback 和缺失图片。
- 场景索引：列出每个模拟场景对应的真实入口，方便继续扩展。

## Adding A Scenario

在 `tools/ui-preview/generate.js` 里新增验证点时，按这个方向接入：

1. 在 `buildPreviewData()` 读取真实配置、文案或资源，不手写重复业务数据。
2. 在 `simulator.modules` 里登记场景 `id/title/refs/purpose`。
3. 在 HTML 脚本里的 `renderers` 增加同名渲染函数。
4. 用固定尺寸盒子近似真实 Cocos UI，例如 DialogBig、DialogSmall、商店卡片标题、成就面板。
5. 给可能溢出的节点加 `data-overflow="1"`，让侧栏汇总能自动计数。

## Notes

这是前端改动后的快速模拟台，不是完整游戏运行时。它不会执行真实购买、领取成就或存档 mutation；它模拟的是前端数据投影、状态组合和固定尺寸布局。最终交付前仍需要在游戏内或设备上确认关键流程。
