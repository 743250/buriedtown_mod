# BuriedTown Mod

BuriedTown（死亡日记）旧版 Cocos2d-JS 游戏 Mod 工程。项目在保留原版运行、
资源和存档兼容的基础上持续扩展角色、物品、建筑、NPC 与生存机制，并逐步把
旧核心中的业务规则收口到配置和服务层。

## 当前状态

- 当前阶段：内容扩展与渐进式结构收口并行。
- 脚本装配入口：`assets/src/jsList.js`。
- 主要源码：`assets/src/`。
- 新增资源：`assets/res/`。
- 校验与 smoke：`tools/`。
- 当前工作树有未提交的活跃开发内容，禁止批量清理或还原。

## 开始前先读

- `AGENTS.md`：项目结构、协作规则、风险入口和验证命令。
- `SPEC.md`：长期定位、目标架构、非目标和质量门槛。
- `PLAN.md`：阶段性重构与实施路线。
- `log.md`：已经完成的工程工作和验证记录。
- `CLAUDE.md`：特定工具的使用约定。

## 常用验证

```bash
env -u NODE_OPTIONS node tools/validate-content.js all --lang zh
env -u NODE_OPTIONS node tools/run-smoke.js runtime-boundaries startup
```

当前仓库只有 `string_zh.js`，所以中文是现行内容门槛。英文资源恢复前不要把
`--lang en` 当必跑项；预推送检查也会明确跳过它。

按改动范围选择定向校验；高风险入口和 UI 改动需要额外完成最小人工回归。

## 重要边界

- 不随意调整 `assets/src/jsList.js` 的加载顺序。
- 不在 UI 层重复实现业务规则。
- 不把原版资源、破解手记或提取资产当作缓存清理。
- 不覆盖、还原或删除当前未提交改动。
