"use strict";

const {
    assert,
    loadIntoSandbox
} = require("../../lib/core");
const {
    createVmSandbox
} = require("../../lib/fixtures/runtime-boundaries");
const {
    ROLE_REST_DESIGN_TABLE
} = require("../../lib/fixtures/role-rest-design");

function installSofaBuildActionConfig(sandbox) {
    sandbox.buildActionConfig = {
        "10": [[
            {
                cost: [{ itemId: 1105011, num: 4 }],
                makeTime: 60,
                effect: { spirit: 60, spirit_chance: 1 }
            },
            {
                cost: [{ itemId: 1105022, num: 3 }],
                makeTime: 60,
                effect: { spirit: 60, spirit_chance: 1 }
            },
            {
                cost: [{ itemId: 1105051, num: 4 }],
                makeTime: 10,
                effect: { hp: 100, hp_chance: 1 }
            },
            {
                cost: [{ itemId: 1105061, num: 1 }],
                makeTime: 10,
                effect: { spirit: 12, spirit_chance: 1 }
            },
            {
                cost: [{ itemId: 1105072, num: 1 }],
                makeTime: 15,
                effect: { spirit: 40, spirit_chance: 1, vigour: 4, vigour_chance: 1 }
            }
        ]]
    };
}

function createRoleRestSandbox() {
    const sandbox = createVmSandbox();
    loadIntoSandbox(sandbox, "assets/src/game/GameKernel.js");
    loadIntoSandbox(sandbox, "assets/src/game/GameRuntime.js");
    loadIntoSandbox(sandbox, "assets/src/data/roleConfigTable.js");
    // RoleRuntimeService 通过 role.getRoleConfig 读表
    sandbox.role = {
        getRoleConfig: function (roleType) {
            const table = sandbox.RoleConfigTable || {};
            return table[roleType] || table[String(roleType)] || {};
        },
        getChoosenRoleType: function () {
            return 1;
        }
    };
    loadIntoSandbox(sandbox, "assets/src/game/RoleRuntimeService.js");
    installSofaBuildActionConfig(sandbox);
    sandbox.formulaConfig = {};
    sandbox.uiUtil = {
        checkVigour: function () { return true; },
        showItemDialog: function () {},
        showBuildActionDialog: function () {},
        showTinyInfoDialog: function () {},
        showCraftCountSliderDialog: function () {}
    };
    sandbox.player = {
        getItemNumInPlayer: function () { return 0; },
        storage: {
            getNumByItemId: function () { return 0; }
        }
    };
    sandbox.GameRuntime.bootstrap({
        player: sandbox.player,
        emitter: sandbox.utils && sandbox.utils.emitter,
        timer: {
            formatTime: function () { return { d: 0 }; }
        }
    });
    loadIntoSandbox(sandbox, "assets/src/game/BuildActionEffectService.js");
    loadIntoSandbox(sandbox, "assets/src/game/buildAction.js");
    return sandbox;
}

function hasSmokeAction(list) {
    return list.some(function (a) {
        return a && typeof a.resolveConfigIndex === "function";
    });
}

function actionClassName(action) {
    if (!action) {
        return "";
    }
    return String(action.className || (action.constructor && action.constructor.name) || "").toLowerCase();
}

function hasActionType(list, typeName) {
    if (typeName === "drink") {
        return list.some(function (a) {
            if (!a || typeof a.resolveConfigIndex === "function") {
                return false;
            }
            if (actionClassName(a).indexOf("drink") >= 0 && actionClassName(a).indexOf("tea") < 0) {
                return true;
            }
            return a.index === 1 && a.config && Array.isArray(a.config.cost)
                && a.config.cost.some(function (c) { return Number(c.itemId) === 1105022; });
        });
    }
    if (typeName === "drink_tea") {
        return list.some(function (a) {
            if (!a || typeof a.resolveConfigIndex === "function") {
                return false;
            }
            if (actionClassName(a).indexOf("tea") >= 0) {
                return true;
            }
            // DrinkTeaBuildAction 固定 index 2，cost 茶 1105051
            return a.index === 2 && a.config && Array.isArray(a.config.cost)
                && a.config.cost.some(function (c) { return Number(c.itemId) === 1105051; });
        });
    }
    return false;
}

/**
 * 表驱动：RoleRuntimeService 计划 + createRestActions 组合与设计表一致。
 */
function runRoleRestDesignTableSmoke() {
    const sandbox = createRoleRestSandbox();
    const svc = sandbox.RoleRuntimeService;
    const names = [];

    Object.keys(ROLE_REST_DESIGN_TABLE).forEach(function (roleId) {
        const design = ROLE_REST_DESIGN_TABLE[roleId];
        names.push(design.name);
        const roleType = Number(roleId);

        assert(svc.canSmoke(roleType) === design.canSmoke,
            design.name + " canSmoke want " + design.canSmoke
                + " got " + svc.canSmoke(roleType));

        const types = svc.getRestActionTypes(roleType);
        assert(Array.isArray(types), design.name + " restActionTypes must be array");
        assert(types.length === design.restActionTypes.length
            && design.restActionTypes.every(function (t, i) { return types[i] === t; }),
            design.name + " restActionTypes want "
                + JSON.stringify(design.restActionTypes)
                + " got " + JSON.stringify(types));

        const plan = svc.getRestActionPlan(roleType);
        assert(plan.includeSmoke === design.canSmoke,
            design.name + " plan.includeSmoke mismatch");
        assert(Array.isArray(plan.extraActionTypes)
            && plan.extraActionTypes.join(",") === design.restActionTypes.join(","),
            design.name + " plan.extraActionTypes mismatch");

        const actions = sandbox.BuildActionFactory.createRestActions(10, 0, roleType);
        assert(actions.length >= 1, design.name + " must always include base rest");
        assert(hasSmokeAction(actions) === design.canSmoke,
            design.name + " smoke action presence want " + design.canSmoke
                + " got " + hasSmokeAction(actions));

        if (design.restActionTypes.indexOf("drink") >= 0) {
            assert(hasActionType(actions, "drink"),
                design.name + " must include drink alcohol action");
        } else {
            assert(!hasActionType(actions, "drink"),
                design.name + " must not include drink alcohol action");
        }

        // 额外类型数量：smoke? + extras + base rest
        const expectedLen = 1
            + (design.canSmoke ? 1 : 0)
            + design.restActionTypes.length;
        assert(actions.length === expectedLen,
            design.name + " rest action count want " + expectedLen
                + " got " + actions.length);
    });

    return {
        name: "role-rest-design-table",
        ok: true,
        detail: "validated rest/smoke plan for " + names.join("/")
    };
}

/**
 * 烟草优先：有烟草 → index 3；仅香烟 → index 4。
 */
function runSmokeTobaccoPreferenceSmoke() {
    const sandbox = createRoleRestSandbox();
    const actions = sandbox.BuildActionFactory.createRestActions(10, 0, 1);
    const smoke = actions.filter(function (a) {
        return a && typeof a.resolveConfigIndex === "function";
    })[0];
    assert(smoke, "male rest must include smoke action");

    sandbox.GameRuntime.getPlayer = function () {
        return {
            storage: {
                getNumByItemId: function (id) {
                    if (Number(id) === 1105061) return 2;
                    if (Number(id) === 1105072) return 5;
                    return 0;
                }
            }
        };
    };
    assert(smoke.resolveConfigIndex(0) === 3,
        "smoke should prefer tobacco index 3 when tobacco in stock");

    sandbox.GameRuntime.getPlayer = function () {
        return {
            storage: {
                getNumByItemId: function (id) {
                    if (Number(id) === 1105072) return 3;
                    return 0;
                }
            }
        };
    };
    assert(smoke.resolveConfigIndex(0) === 4,
        "smoke should use cigarette index 4 when only cigarettes in stock");

    return {
        name: "role-rest-smoke-tobacco-preference",
        ok: true,
        detail: "validated smoke config index prefers tobacco over cigarette"
    };
}

module.exports = [
    runRoleRestDesignTableSmoke,
    runSmokeTobaccoPreferenceSmoke
];
