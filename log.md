# BuriedTown Mod 工程记录

按日期倒序记录已经完成的工程工作、验证结果和仍需处理的风险。规划内容放在
`SPEC.md` 或 `PLAN.md`，本文件不记录尚未发生的工作。

## 2026-08-14：校验命令与现有语言资源对齐

- 核对确认仓库只跟踪 `assets/src/data/string/string_zh.js`，预推送脚本也会在
  `string_en.js` 缺失时跳过英文校验。
- README、AGENTS 和 PLAN 不再把 `--lang en` 写成当前必跑门槛。
- `tools/validate-content.js --lang en` 现在给出明确缺失资源提示和退出码 2，
  不再抛出底层 `ENOENT` 堆栈。
- 没有伪造英文文案；英文资源恢复后再重新启用英文质量门槛。

## 2026-08-14：Git 对象断链恢复

### 根因

- 仓库中 1,926 个 loose/pack 对象软链仍指向已删除的旧 `installed-rootfs`
  容器临时目录。
- 最近提交和工作树仍可读，但更早历史缺少父提交对象；`refs/stash` 指向的 6 份
  历史 stash 对象也已不存在。

### 处理

- 修复前保存 `git status --porcelain -z` 快照。
- 整体隔离旧 objects，筛回 364 个真实 loose/pack 对象和两组健康 pack。
- 从远端按需补回提交历史，保留当前 `main`、远端分支和本地 agent 分支。
- 将失效 stash 指针、reflog 和修复前后状态快照保存到
  `~/.hxc_tmp/buriedtown-git-broken-20260814/` 留作追溯。
- 验证后删除旧断链 objects、重复的 76MB pack 和临时拉取仓库，恢复目录只剩
  约 3KB 的文字/状态记录，不保留第二套 Git 对象库。
- 未执行 commit、reset、clean、checkout 或工作树覆盖。

### 验证

- `main` 为 `c68b193`，主分支 96 个提交可遍历。
- 修复前后状态快照完全一致，现有 26 项开发改动全部保留。
- 两组原健康 pack 均通过 `git verify-pack`。
- `git fsck --no-reflogs` 返回成功；仅保留 4 个不影响仓库健康的 dangling commit。

## 2026-08-14：统一 Ubuntu 26 验证入口

- 将 `AGENTS.md` 中的 PRoot 验证命令从已删除的 `ubuntu` 修正为 `ubuntu26`。
- 只修改项目协作文档，没有修改源码、资源、启动顺序或当前未提交改动。
- 全工作区旧 `proot-distro login ubuntu` 可执行引用已清零。

## 2026-08-14：建立项目管理文档基线

### 完成

- 新增 `SPEC.md`，明确项目定位、目标形态、架构边界、非目标和质量门槛。
- 新增本工程记录，建立后续按日期记录实际改动的入口。
- 新增 `README.md`，提供简洁的项目入口、文档导航和常用验证命令。
- 保留现有 `AGENTS.md`、`CLAUDE.md` 和 `PLAN.md`，没有覆盖或重写历史内容。

### 当前工程基线

- Git 分支：`main`。
- 文档治理前已有 23 个未提交项，涉及配置、建筑、电力、角色运行时、时间、
  UI、smoke 和验证脚本。
- 这些未提交项属于活跃开发内容，本次没有修改、还原、暂存或提交。
- 当前结构主线已完成 runtime、购买链、shop state 和多项配置收口；下一项
  结构主题为 R7 UI 基础层职责收口。

### 验证

- 读取并核对 `AGENTS.md`、`CLAUDE.md`、`PLAN.md` 和真实目录结构。
- 核对 `git status --short`、`git diff --stat` 与近期提交记录。
- 本次只新增 Markdown 文档，没有运行或修改游戏源码。
