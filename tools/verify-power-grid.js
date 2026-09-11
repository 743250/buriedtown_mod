#!/usr/bin/env node
"use strict";

/**
 * 雅子发电功率机制端到端验证
 * 加载真实配置(roleConfigTable/buildConfig/formulaConfig) + 真实逻辑(Build/RoleRuntimeService/site)
 * 验证：
 *  A. 雅子(role4) 有 powerGrid 配置，非 powered 角色无
 *  B. build6 三等级配置：L0 蒸馏水 / L1 恒温 / L2 电用(powerCost=6, 配方1201062/1205034)
 *  C. buildLevelCaps 控制：老罗(1)止步 L1，雅子(4)可升 L2
 *  D. 通电开关：雅子 L2 可开，功率累计/过载判定
 *  E. 配方可见性矩阵（开关/电厂/角色）
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");

function readRepoFile(p) {
    return fs.readFileSync(path.join(repoRoot, p), "utf8");
}

function load(sandbox, p) {
    sandbox.module = { exports: {} };
    sandbox.exports = sandbox.module.exports;
    vm.runInContext(readRepoFile(p), sandbox, { filename: p });
    return sandbox.module.exports;
}

function createSandbox() {
    const sandbox = {
        console: console,
        module: { exports: {} },
        exports: {},
        globalThis: null,
        WORK_SITE: 204,
        Record: {
            saveAll: function () {}, init: function () {},
            restore: function () { return null; },
            getCurrentRecordName: function () { return "slot1"; },
            getCurrentSlot: function () { return 1; },
            hasRecord: function () { return false; }
        },
        cc: {
            Class: (function () {
                function BaseClass() {
                    if (this.ctor) {
                        this.ctor.apply(this, arguments);
                    }
                }
                BaseClass.extend = function (definition) {
                    var Parent = this;
                    function SubClass() {
                        var previousSuper = this._super;
                        this._super = function () {
                            if (Parent.prototype && typeof Parent.prototype.ctor === "function") {
                                return Parent.prototype.ctor.apply(this, arguments);
                            }
                            if (typeof Parent === "function") {
                                return Parent.apply(this, arguments);
                            }
                        };
                        if (this.ctor) {
                            this.ctor.apply(this, arguments);
                        }
                        this._super = previousSuper;
                    }
                    SubClass.prototype = Object.create(Parent.prototype || {});
                    Object.keys(definition || {}).forEach(function (key) {
                        SubClass.prototype[key] = definition[key];
                    });
                    SubClass.prototype.constructor = SubClass;
                    SubClass.extend = Parent.extend;
                    return SubClass;
                };
                return BaseClass;
            })(),
            director: { getScheduler: function () { return { scheduleUpdateForTarget: function () {}, unscheduleUpdateForTarget: function () {} }; } },
            sys: { isNative: false, localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} } },
            assert: function () {}, d: function () {}, e: function () {}, i: function () {}, log: function () {},
            color: { WHITE: "white", RED: "red", GREEN: "green" }
        },
        stringUtil: {
            getString: function (id) {
                var table = {
                    1006: "need build %s",
                    1249: "打开",
                    1250: "关闭",
                    power_toggle_enabled_hint: "已通电",
                    power_toggle_disabled_hint: "已断电"
                };
                var tpl = table[id] !== undefined ? table[id] : ("str-" + id);
                return tpl.replace(/%s/g, function () {
                    args.shift();
                    return args.shift();
                });
            }
        },
        uiUtil: {
            showBuildActionDialog: function () {},
            checkVigour: function () { return true; }
        },
        GameEvents: { BUILD_NODE_UPDATE: "build_node_update" }
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    return sandbox;
}

let pass = 0, fail = 0;
function check(name, cond) {
    if (cond) { pass++; console.log("  ✓ " + name); }
    else { fail++; console.log("  ✗ FAIL: " + name); }
}

function main() {
    const s = createSandbox();
    // 数据层
    load(s, "assets/src/data/buildConfig.js");
    load(s, "assets/src/data/formulaConfig.js");
    load(s, "assets/src/data/roleConfigTable.js");
    load(s, "assets/src/util/emitter.js");
    load(s, "assets/src/util/utils.js");
    s.utils = s.module.exports;
    // 逻辑层
    load(s, "assets/src/game/GameRuntime.js");
    load(s, "assets/src/game/GameKernel.js");
    load(s, "assets/src/game/RoleRuntimeService.js");
    load(s, "assets/src/game/BuildActionEffectService.js");
    load(s, "assets/src/game/buildAction.js");
    load(s, "assets/src/game/Build.js");

    const RRS = s.RoleRuntimeService;
    const Build = s.Build;

    // ---------- A. powerGrid 配置 ----------
    console.log("A. powerGrid 配置");
    check("雅子(4)有 powerGrid.generation=4000", RRS.getPowerGridConfig(4).generation === 4000);
    check("雅子(4)过载参数", RRS.getPowerGridConfig(4).overloadDecayMultiplier === 3
        && RRS.getPowerGridConfig(4).overloadBrokenProbability === 0.15);
    check("老罗(1)无 powerGrid", Object.keys(RRS.getPowerGridConfig(1)).length === 0);

    // ---------- B. build6 三等级 ----------
    console.log("B. build6 配置");
    const b6 = s.buildConfig["6"];
    check("build6 有3等级", Array.isArray(b6) && b6.length === 3);
    check("L0 产蒸馏水1201061", b6[0].produceList.indexOf(1201061) !== -1);
    check("L1 产酒精1205033", b6[1].produceList.indexOf(1205033) !== -1);
    check("L2 产电蒸馏水1201062+电酒精1205034", b6[2].produceList.indexOf(1201062) !== -1
        && b6[2].produceList.indexOf(1205034) !== -1);
    check("L2 powerCost=1500", b6[2].powerCost === 1500);
    check("L2 升级材料无木头", !b6[2].cost.some(function (c) { return c.itemId === 1101011; }));

    // 配方
    const f = s.formulaConfig;
    check("1201062 电蒸馏水 cost 为空", Array.isArray(f["1201062"].cost) && f["1201062"].cost.length === 0);
    check("1201062 要求 powered+requirePowerEnabled", f["1201062"].runtimeRule.requirePowerEnabled === true
        && f["1201062"].runtimeRule.includeAnyTags.indexOf("powered") !== -1);
    check("1201061 木蒸馏水开关开时隐藏", f["1201061"].runtimeRule.hideWhenPowerEnabledForTags
        && f["1201061"].runtimeRule.hideWhenPowerEnabledForTags.indexOf("powered") !== -1);
    check("1205034 电酒精去木", !f["1205034"].cost.some(function (c) { return c.itemId === 1101011; }));
    check("1205033 木酒精开关开时隐藏", f["1205033"].runtimeRule.hideWhenPowerEnabledForTags
        && f["1205033"].runtimeRule.hideWhenPowerEnabledForTags.indexOf("powered") !== -1);

    // ---------- C. buildLevelCaps ----------
    console.log("C. buildLevelCaps");
    const maxL2 = b6.length - 1;
    check("老罗(1) 蒸馏器cap L1", RRS.getBuildMaxLevel(1, 6, maxL2) === 1);
    check("雅子(4) 无cap可升L2", RRS.getBuildMaxLevel(4, 6, maxL2) === 2);
    check("金医生(2) cap L1", RRS.getBuildMaxLevel(2, 6, maxL2) === 1);
    check("杰夫(3) cap L1", RRS.getBuildMaxLevel(3, 6, maxL2) === 1);
    check("比尔(5) cap L1", RRS.getBuildMaxLevel(5, 6, maxL2) === 1);
    check("陌生人(6) cap L1", RRS.getBuildMaxLevel(6, 6, maxL2) === 1);
    check("贝尔(8) cap L1", RRS.getBuildMaxLevel(8, 6, maxL2) === 1);

    // ---------- D. 通电开关 + 功率 ----------
    console.log("D. 通电开关与功率");
    // 模拟 room + player（autoPower 计功率需要 player.map.getSite）
    let workSiteActive = true;
    const room = { builds: {}, forEach: function (fn) { for (var k in this.builds) fn(this.builds[k]); }, getBuild: function (b) { return this.builds[b]; }, getBuildLevel: function (b) { var x = this.builds[b]; return x ? x.level : -1; } };
    const player = { roleType: 4, room: room, map: { getSite: function () { return { isActive: workSiteActive }; } } };
    s.GameRuntime.bootstrap({ player: player, timer: { pause: function () {}, resume: function () {} }, emitter: s.utils.emitter, record: s.Record });

    // 电炉 build18：功耗1500W，开关型（无 autoPower）
    const stove = new Build(18, 0, null);
    room.builds[18] = stove;
    check("电炉 powerCost=1500 无 autoPower", stove.currentConfig.powerCost === 1500 && stove.currentConfig.autoPower !== true);
    check("电炉默认断电", stove.isPowerEnabled() === false);
    check("电炉断电: 功率0", RRS.getCurrentPowerLoad(player) === 0);
    check("电炉通电成功", stove.setPowerEnabled(true) === true);
    check("电炉通电: 功率1500", RRS.getCurrentPowerLoad(player) === 1500);
    workSiteActive = false;
    check("发电厂停电: 电炉不耗", RRS.getCurrentPowerLoad(player) === 0);
    workSiteActive = true;

    // 厨房灶台 build4：功耗2000W，autoPower（发电厂有电即耗）
    const kitchen = new Build(4, 0, null);
    room.builds[4] = kitchen;
    check("灶台 powerCost=2000 autoPower=true", kitchen.currentConfig.powerCost === 2000 && kitchen.currentConfig.autoPower === true);
    stove.setPowerEnabled(false); // 关电炉，隔离测灶台
    check("发电厂有电: 灶台自动耗2000", RRS.getCurrentPowerLoad(player) === 2000);
    workSiteActive = false;
    check("发电厂停电: 灶台不耗", RRS.getCurrentPowerLoad(player) === 0);
    workSiteActive = true;
    stove.setPowerEnabled(true);

    // 蒸馏器 build6 L2：功耗1500W，开关型
    const buildL2 = new Build(6, 2, null);
    room.builds[6] = buildL2;
    check("蒸馏器 L2 初始不通电", buildL2.isPowerEnabled() === false);
    check("蒸馏器 L2 通电成功", buildL2.setPowerEnabled(true) === true);
    // 此时: 电炉1500 + 灶台2000 + 蒸馏1500 = 5000 → 过载(generation 4000)
    check("电炉1500+灶台2000+蒸馏1500=5000", RRS.getCurrentPowerLoad(player) === 5000);
    const state1 = RRS.getPowerGridOverloadState(player);
    check("总功率5000过载(generation4000)", state1.overloaded === true);
    check("过载衰减3倍", state1.decayPerHour === 3);

    // 关电炉后: 灶台2000 + 蒸馏1500 = 3500 → 不过载
    stove.setPowerEnabled(false);
    check("关电炉后功率3500", RRS.getCurrentPowerLoad(player) === 3500);
    const state2 = RRS.getPowerGridOverloadState(player);
    check("关电炉后不过载", state2.overloaded === false);

    // 停电时: 蒸馏器(开关开, requirePoweredWorksite)也不计 → 只有灶台
    workSiteActive = false;
    check("停电时蒸馏器不计(requirePoweredWorksite)", RRS.getCurrentPowerLoad(player) === 0);
    workSiteActive = true;

    // 存档往返
    stove.setPowerEnabled(true);
    const savedStove = stove.save();
    const restoredStove = new Build(18, 0, savedStove);
    check("电炉 save/restore 保持通电", restoredStove.isPowerEnabled() === true);
    const legacyStove = new Build(18, 0, { id: 18, level: 0, saveActions: {} });
    check("电炉旧档默认断电", legacyStove.isPowerEnabled() === false);

    // ---------- E. 配方可见性矩阵 ----------
    console.log("E. 配方可见性矩阵（雅子 role4）");
    const elec = f["1201062"], wood = f["1201061"];
    const r4 = 4, r1 = 1;
    check("电配方: 通电+有电 → 可见", RRS.isBuildActionVisible(elec, r4, { isWorkSitePowered: true, isPowerEnabled: true }) === true);
    check("电配方: 断电 → 隐藏", RRS.isBuildActionVisible(elec, r4, { isWorkSitePowered: true, isPowerEnabled: false }) === false);
    check("电配方: 停电 → 隐藏", RRS.isBuildActionVisible(elec, r4, { isWorkSitePowered: false, isPowerEnabled: true }) === false);
    check("电配方: 老罗 → 隐藏", RRS.isBuildActionVisible(elec, r1, { isWorkSitePowered: true, isPowerEnabled: true }) === false);
    check("木配方: 通电 → 隐藏", RRS.isBuildActionVisible(wood, r4, { isWorkSitePowered: true, isPowerEnabled: true }) === false);
    check("木配方: 断电 → 可见", RRS.isBuildActionVisible(wood, r4, { isWorkSitePowered: true, isPowerEnabled: false }) === true);
    check("木配方: 老罗不受开关影响", RRS.isBuildActionVisible(wood, r1, { isWorkSitePowered: true, isPowerEnabled: true }) === true);

    // ---------- F. 开关按钮等级隐藏 ----------
    console.log("F. 开关按钮等级隐藏");
    const buildL1 = new Build(6, 1, null);
    const hasToggleL1 = buildL1.getBuildActions().some(function (a) { return a.actionKey === "6:power_toggle"; });
    check("L1 蒸馏器无开关按钮", hasToggleL1 === false);
    const buildL2v = new Build(6, 2, null);
    const hasToggleL2 = buildL2v.getBuildActions().some(function (a) { return a.actionKey === "6:power_toggle"; });
    check("L2 电用蒸馏器有开关按钮", hasToggleL2 === true);
    const stoveV = new Build(18, 0, null);
    const hasStoveToggle = stoveV.getBuildActions().some(function (a) { return a.actionKey === "18:power_toggle"; });
    check("电炉 L0 有开关按钮", hasStoveToggle === true);
    const kitchenV = new Build(4, 0, null);
    const hasKitchenToggle = kitchenV.getBuildActions().some(function (a) { return a.actionKey === "4:power_toggle"; });
    check("灶台无开关按钮", hasKitchenToggle === false);

    // ---------- G. 取暖联动 ----------
    console.log("G. 取暖联动（电炉开关关 → 取暖停）");
    workSiteActive = true;
    const stoveG = new Build(18, 0, null);
    room.builds[18] = stoveG;
    stoveG.setPowerEnabled(false);
    check("电炉断电: 取暖不生效", RRS.isTemperatureBuildActive(player) === false);
    stoveG.setPowerEnabled(true);
    check("电炉通电: 取暖生效", RRS.isTemperatureBuildActive(player) === true);
    check("通电给温度加成", RRS.getTemperatureBonus(player, 7) === 7);
    stoveG.setPowerEnabled(false);
    check("断电温度加成为0", RRS.getTemperatureBonus(player, 7) === 0);

    console.log("");
    console.log(pass + " passed, " + fail + " failed");
    process.exit(fail > 0 ? 1 : 0);
}

main();
