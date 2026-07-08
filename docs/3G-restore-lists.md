# 3G Restore/Migration 分层 — 三份清单

> 来源: 只读子代理 2026-07-07 输出。PLAN.md §6.1 要求的 3G 启动前产物。
> 状态: 清单已出,3G 可进入实现阶段。

## 清单 1: Restore 调用图

共 21 条 restore 调用点,按触发链路组织。

### 主入口: `game.bootstrapRun`
1. `game.js:104` — `getGameRuntimePlayer().restore()` — 冷启动/继续游戏/新游戏,无参
2. `game.js:107` — `Record.restore('randomPack')` — 紧随 player.restore 之后,key 读档

### `player.restore` 触发链 (player.js:71 → PlayerPersistenceService.js:74)
3. `PlayerPersistenceService.js:77` — `runtimeRecord.restore("player")` — 从 Record 读 JSON
4. `PlayerPersistenceService.js:103` — `EARLY_RESTORE_COMPONENTS` 循环,每个调用 `component.restore(saveData[key])`:
   - `Storage.js:39` — `Storage.restore(saveObj)` — bag/storage/site 储物,逐 itemId 构建 StorageCell
   - `equipment.js:68` — `Equipment.restore(opt)` — 直接赋值 equipPos
   - `weather.js:51` — `WeatherSystem.restore(saveObj)` — 恢复 weatherId/lastDays,然后调用 `changeWeather(this.weatherId)` 发射 `weather_change` 事件
   - `buff.js:491` — `BuffManager.restore(saveObj)` — abortAllBuffs + 重建 buffList
   - `player.js:1013` — `Dog.restore(opt)` — 恢复 starve/autoFeedEnabled
5. `PlayerPersistenceService.js:109` — `navigationState.restore(saveData.navigationState)` — PlayerNavigationState.js:38,归一化 entityKey + 设置 needsMapSync
6. `PlayerPersistenceService.js:153` — `LATE_RESTORE_COMPONENTS` 循环:
   - `Build.js:438` — `Room.restore(saveObj)` — 逐 build 创建,Build.ctor 内调用 `this.restore(saveObj)` (Build.js:58)
   - `npc.js:712` — `NPCManager.restore(saveObj)` — 逐 npc 创建,npc.restore (npc.js:716)
   - `map.js:27` — `Map.restore(saveObj)` — 恢复 npcMap/siteMap,逐 site 调用 `site.restore(siteSaveObj[siteId])` (map.js:47)
7. `PlayerPersistenceService.js:158` — `ziplineNetwork.restore(saveData.ziplineNetwork, playerInstance.map)` — ZiplineNetworkService.js:27,带 map 依赖进行 sanitize

### `Map.restore` 触发的 site.restore 子链
8. `site.js:272` — `Site.restore(saveObj)` — 标准站点恢复
9. `site.js:410` — `AdSite.restore(saveObj)` — 广告站点
10. `site.js:458` — `WorkSite.restore(saveObj)` — 工坊站点,含 maintenance 迁移逻辑(saveObj.hasOwnProperty("maintenance"),site.js:465)
11. `site.js:627` — `BossSite.restore(saveObj)` — Boss 站点
   - 以上四种都在 restore 内调用 `this.storage.restore(saveObj.storage)` (site.js:277/414/462/631)

### `Room.restore` 触发的 Build.restore 子链
12. `Build.js:163` — `Build.restore(opt)` — 逐 action 调用 `action.restore(saveObj)` (Build.js:171)
   - `buildAction.js:37` — `BuildAction.restore(saveObj)` — 基类,空操作
   - `buildAction.js:303` — 通用 timed-state action restore,调用 `options.restore(this, saveObj, GameRuntime.getPlayer())`
   - `buildAction.js:402` — `FuelBuildAction.restore(saveObj)` — 恢复 fuel/pastTime/startTime,if fuel>0 调用 `this.addFuelTimer()` (行 409,注册定时器)
   - `buildAction.js:497` — `Formula.restore(saveObj)` — 恢复 step/pastTime,if step==1 调用 `this.place()` (行 502,注册 placed 定时器)
   - `buildAction.js:792` — `TrapAutoSetBuildAction.restore(saveObj)` — 恢复 autoSetEnabled,调用 `Formula.prototype.restore.call(this, saveObj)`

### `npcManager.restore` 触发
13. `npc.js:69` — `NPC.restore(saveObj)` — 恢复 pos/reputation/maxRep/storage/gift/trading 等

### `Record.restore` 调用 (Record.js:372)
14. `TimeManager.js:59-60` — `runtimeRecord.restore("time")` — 从 Record 读时间
15. `bottomFrame.js:183-184` — `runtimeRecord.restore("navigation")` — UI 导航栈恢复

### 其他 restore (不属于读档热路径)
16. `ParamManager.js:29` — `this.restore()` — init 时从 localStorage 读 param
17. `adHelper.js:94` — `this.restore()` — init 时从 localStorage 读 ad 激活状态
18. `bottomFrame.js:150` — `this.restore()` — init 时从 Record 读 navigation
19. `TimeManager.js:37` — `this.restore()` — ctor 内从 Record 读 time
20. `ziplineManager.js:69` — `ZiplineManager.restore(saveObj)` — 旧滑索管理器(可能已废弃),恢复 map/nextId
21. `PropertyManager.js:44` — `PropertyManager.restore(val)` — 简单属性恢复

---

## 清单 2: Migration 规则

共 8 条 migration/兼容规则。

1. **PlayerMigrationService.js:37-47 — 全局 schema 支持检查**
   - 判断: `_getSaveSchemaVersion(saveData)` >= MIN_SUPPORTED(2) && <= SAVE_SCHEMA_VERSION(3) && navigationState 是 object
   - 动作: 不支持则 purgeUnsupportedSlot(删档/清兼容态/重置角色天赋缓存)、返回 null(走新游戏)
   - 保留: 是,旧 slot 可能仍有 schemaVersion=2 存档

2. **PlayerMigrationService.js:82-91 — 选择状态迁移**
   - 判断: `_isValidRoleType(saveData.roleType)` 不通过则 fallback;`!Array.isArray(saveData.chosenTalentIds)` 则设空数组
   - 动作: 补默认 roleType(6=STRANGER);补空 chosenTalentIds
   - 保留: 是,旧存档可能缺 roleType 或 chosenTalentIds 不是数组

3. **PlayerMigrationService.js:94-98 — navigationState 迁移(预留)**
   - 当前为空函数,注释说明 PlayerNavigationState.restore 已处理 entityKey 归一化和 needsMapSync
   - 保留: 是,为未来跨版本导航迁移预留

4. **PlayerNavigationState.js:50 — needsMapSync 标记**
   - 判断: `!saveObj.mapEntityKey && locationType === MAP`
   - 动作: 设置 `this.needsMapSync = true`,后续 reconcile 阶段调用 `syncMapEntityIdFromMap`
   - 保留: 是,旧存档使用旧导航字段时需此兼容

5. **ZiplineNetworkService.js:373-380 — 旧滑索字段重命名**
   - `_appendRawLink` 中: `rawLink.startEntityKey || rawLink.fromEntityKey || rawLink.startKey` 等
   - 动作: 兼容多种旧字段名(startSiteId/fromSiteId/from/start 等)统一映射到 startEntityKey/endEntityKey
   - 保留: 是,旧存档可能仍有旧命名滑索数据

6. **ZiplineNetworkService.js:53 — nextId 字段迁移**
   - 判断: `saveObj.nextLinkId || saveObj.nextId`
   - 动作: 兼容旧字段名 `nextId` -> `nextLinkId`
   - 保留: 是

7. **site.js:465-468 — WorkSite maintenance 字段补齐**
   - 判断: `saveObj.hasOwnProperty("maintenance")`
   - 动作: 有则 normalizeMaintenance;无则 `isActive ? getMaintenanceMax() : 0` 填默认值
   - 保留: 是,旧存档可能无 maintenance 字段(该字段为后期新增)

8. **Record.js:88-112 / 113-147 — 旧角色/天赋槽位迁移**
   - `_parseLegacyChosenTalentIds`: 兼容 JSON/逗号分隔/单值 多种天赋存储格式
   - `_buildLegacySlotMeta`: 从旧 localStorage key (`roleType_slot_N`/`chosenTalents_slot_N`/`chosenTalent_slot_N`) 读取并写入新的 slot meta 结构
   - `getSlotMeta` 优先读新结构,缺失时回退到 legacy meta 构建
   - 保留: 是,旧 localStorage 格式仍需兼容

---

## 清单 3: 读档热路径副作用

共 12 条 restore 过程中的非纯数据操作。

1. **weather.js:56 — `changeWeather(this.weatherId)`**
   - 类型: 事件总线(`getWeatherRuntimeEmitter().emit("weather_change", weatherId)` at weather.js:78) + 全局状态写
   - 目的: 恢复天气后触发 UI 更新
   - 可延迟: 是,可移入 post-restore hook

2. **weather.js:43 — `this.changeWeather(this.weatherId)`** (ctor 路径)
   - 同上,ctor 内初始调用
   - 可延迟: 部分(ctor 内可保留同步,restore 内可延迟)

3. **PlayerPersistenceService.js:125-134 — `role.chooseRoleType` / `talentService.chooseTalents`**
   - 类型: 全局状态写(role singleton 和 TalentService singleton 状态变更)
   - 目的: 同步全局角色/天赋选择,让 map.restore 等后续步骤读到正确值
   - 可延迟: 否(有严格顺序依赖,map.restore 前必须完成)

4. **PlayerPersistenceService.js:139-149 — `TalentService.init(playerInstance)` + `Medal.improve(playerInstance)`**
   - 类型: 全局状态写 + Medal 服务初始化
   - 目的: 新游戏时初始化天赋服务和 Medal 加成
   - 可延迟: 否(Medal.improve 影响 player 属性)

5. **buildAction.js:409 — `this.addFuelTimer()` (FuelBuildAction.restore)**
   - 类型: 定时器注册(`runtimeTimer.addTimerCallback(new TimerCallback(...))`)
   - 目的: 恢复燃料类建筑动作的定时器(如篝火、灶台燃烧)
   - 可延迟: 是,可移入 post-restore hook(需要 player.start 之后定时器才开始 tick)

6. **buildAction.js:502 — `this.place()` (Formula.restore)**
   - 类型: 定时器注册(通过 `getBuildActionEffectService().startPlacedTimer(...)`)
   - 目的: 恢复已放置但未完成的配方(如陷阱、温棚种植)
   - 可延迟: 是,同 fuel 定时器

7. **PlayerPersistenceService.js:91-94 — `reconcile` + `runtimeRecord.saveAll()`**
   - 类型: 全局状态写(跨模块修正后全量存盘)
   - 目的: reconcile 修复后持久化
   - 可延迟: 否(reconcile 本身已在 restore 之后,但 saveAll 是必要的写回)

8. **PlayerPersistenceService.js:157-159 — `ziplineNetwork.restore(..., playerInstance.map)`**
   - 类型: 跨对象调用(restore zipline 时需要 map 引用进行 sanitize/eligibility 校验)
   - 目的: 滑索网络需要 map 来验证站点是否仍然存在/合法
   - 可延迟: 否(map 必须已 restore 才能校验,这是顺序依赖而非副作用)

9. **PlayerMigrationService.js:117 — `navigationState.syncMapEntityIdFromMap(playerInstance.map)`**
   - 类型: 跨对象调用 + 状态修正
   - 目的: 旧存档无 mapEntityKey 时从 map 找最近实体
   - 可延迟: 否(已在 reconcile 阶段执行,是 deferred 后的收尾)

10. **PlayerMigrationService.js:106-118 — reconcile 各子步骤**
    - `reconcileHpByTalent`: TalentService.reconcilePlayerHpByTalentSelection(playerInstance)
    - `reconcileUnlockRewards`: PurchaseService.reconcileUnlockRewardsForPlayer(playerInstance)
    - `ensureRoomBuildStates`: RoleRuntimeService.ensureRoomBuildStates(playerInstance.room, ...)
    - `ensureInitialUnlocks`: RoleRuntimeService.ensureInitialUnlocks(playerInstance.map, ...)
    - `ensureSpecialItems`: RoleRuntimeService.ensureSpecialItems(playerInstance)
    - 类型: 全局状态写(房间建筑修正、地图解锁修正、物品补齐)
    - 目的: 跨模块一致性修复(新增角色默认建筑、天赋解锁奖励等)
    - 可延迟: 否(已在 reconcile 阶段,本就是 post-restore hook)

11. **game.js:101-102 — `Record.bindRuntime(GameRuntime)`**
    - 类型: 全局状态写(Record 绑定 GameRuntime)
    - 目的: 让 Record.saveAll 能访问 player/timer
    - 可延迟: 否(必须在 player.restore 之前完成)

12. **PlayerPersistenceService.js:146-149 — `ShareFlag` 检查**
    - 类型: 全局状态写(`runtimeRecord.setShareFlag` + `storage.increaseItem`)
    - 目的: 分享奖励发放
    - 可延迟: 否(在新游戏路径,影响初始物品)

---

## 汇总

- **清单 1 (restore 调用)**: 21 条调用点,核心链路为 `game.bootstrapRun -> player.restore -> PlayerPersistenceService.restore -> (EARLY components + navigationState) -> (LATE components: room/npcManager/map/zipline)`
- **清单 2 (migration 规则)**: 8 条规则,已大部分集中在 `PlayerMigrationService`(schema 检查、选择状态迁移)和 `ZiplineNetworkService`(字段重命名)中,`WorkSite.maintenance` 和 `Record` 旧槽位格式是仍在原文件中的散落 migration
- **清单 3 (副作用)**: 12 条副作用,主要可延迟项是 `weather.changeWeather` 的事件发射和 `buildAction` restore 中的定时器注册(addFuelTimer/place),其余副作用有严格顺序依赖已在 reconcile 阶段

当前 `PlayerMigrationService` 已做初步分层(migrate/reconcile 与 restore 分离),但 `buildAction` restore 中的定时器注册、`weather.restore` 中的 changeWeather 事件发射、`ZiplineNetworkService.restore` 中的 migration 逻辑仍与 restore 混合在同一个函数体内。

## 3G 实现焦点(基于清单的初步判断)

可延迟副作用(清单 3 #1、#5、#6)是 3G 的主要拆分目标:
- `weather.restore` 内的 `changeWeather` 事件发射 → 移到 post-restore hook
- `FuelBuildAction.restore` / `Formula.restore` 内的定时器注册 → 移到 post-restore hook

仍散落的 migration(清单 2 #5、#6、#7、#8)是次要收口:
- `ZiplineNetworkService._appendRawLink` 字段重命名 → 收到 migration 函数
- `WorkSite.maintenance` 字段补齐 → 收到 migration 函数
- `Record._parseLegacyChosenTalentIds` / `_buildLegacySlotMeta` → 评估是否整合到 PlayerMigrationService

严格顺序依赖的副作用(清单 3 #3、#4、#7、#8、#9、#10、#11、#12)保留在 restore/reconcile 内,不动。

## 3G 实现决定(2026-07-07)

### 已完成
- **weather.restore 副作用拆分** ✅ — `weather.js` 拆出 `_applyWeatherState`(纯数据:设 weatherId + weatherConfig),`changeWeather` 改为调 `_applyWeatherState` + 清 lastDays + 发事件 + 发 log,`restore` 改为只调 `_applyWeatherState`(保留存档 lastDays,不发事件)。消除原 latent bug(restore 时订阅者未注册,事件丢失)。

### 评估后保留现状(不拆)
- **`FuelBuildAction.restore` 内 `addFuelTimer()`** — 设计上合理副作用(燃料建筑读档后应继续燃烧),拆分需改 `PlayerPersistenceService` 核心读档路径引入 post-restore hook 机制,风险高于收益。`this.view` 已有 `if (self.view && ...)` 保护,无崩溃风险。
- **`Formula.restore` 内 `place()`** — 同上,配方进行中读档后继续是合理语义。

### 次要收口(未启动,留待后续)
- `ZiplineNetworkService._appendRawLink` 字段重命名(清单 2 #5)→ 收到 migration 函数
- `WorkSite.maintenance` 字段补齐(清单 2 #7)→ 收到 migration 函数
- `Record._parseLegacyChosenTalentIds` / `_buildLegacySlotMeta`(清单 2 #8)→ 评估是否整合到 PlayerMigrationService

3G 主线拆分(weather)已完成,其余可延迟副作用评估后保留。3G 关闭判据:可延迟副作用中"会引发 latent bug 的"已修(weather 事件丢失),其余"设计上合理"的保留。
