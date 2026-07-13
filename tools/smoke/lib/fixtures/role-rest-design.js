"use strict";

/**
 * 角色沙发休息契约（与 RoleConfigTable + RoleRuntimeService 对齐）。
 * - canSmoke：默认男性 true；雅子 female/false
 * - restActionTypes：额外 rest 动作（drink / drink_tea…）；空 = 只咖啡 rest
 * - 基础 rest 动作始终存在，不在本表
 */
const ROLE_REST_DESIGN_TABLE = {
    1: { name: "老罗", canSmoke: true, restActionTypes: ["drink"] },
    2: { name: "金医生", canSmoke: true, restActionTypes: ["drink_tea"] },
    3: { name: "杰夫", canSmoke: true, restActionTypes: [] },
    4: { name: "雅子", canSmoke: false, restActionTypes: [] },
    5: { name: "比尔", canSmoke: true, restActionTypes: [] },
    6: { name: "陌生人", canSmoke: true, restActionTypes: [] },
    7: { name: "测试", canSmoke: true, restActionTypes: [] },
    8: { name: "贝尔", canSmoke: true, restActionTypes: [] }
};

module.exports = {
    ROLE_REST_DESIGN_TABLE: ROLE_REST_DESIGN_TABLE
};
