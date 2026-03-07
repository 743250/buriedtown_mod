// role.js - 影子函数模式演示版本

var RoleType = {
    STRANGER: 6,
    LUO: 1,
    YAZI: 4,
    JIN: 2,
    BIER: 5,
    JIE: 3,
    KING: 7
};

// 角色配置表（内联）
var _roleConfigMap = {
    1: { exchangeId: 1001, purchaseId: 108 },
    2: { exchangeId: 1003, purchaseId: 110 },
    3: { exchangeId: 1005, purchaseId: 112 },
    4: { exchangeId: 1002, purchaseId: 109 },
    5: { exchangeId: 1004, purchaseId: 111 },
    6: { exchangeId: null, purchaseId: null },
    7: { exchangeId: 1006, purchaseId: 113 }
};

var role = {
    // ========== 旧函数（保留原始逻辑） ==========

    getExchangeIdByRoleType_old: function (roleType) {
        if (roleType == 1) {
            return 1001;
        } else if (roleType == 2) {
            return 1003;
        } else if (roleType == 3) {
            return 1005;
        } else if (roleType == 4) {
            return 1002;
        } else if (roleType == 5) {
            return 1004;
        } else if (roleType == 7) {
            return 1006;
        }
        return null;
    },

    getPurchaseIdByRoleType_old: function (roleType) {
        if (roleType == 1) {
            return 108;
        } else if (roleType == 2) {
            return 110;
        } else if (roleType == 3) {
            return 112;
        } else if (roleType == 4) {
            return 109;
        } else if (roleType == 5) {
            return 111;
        } else if (roleType == 7) {
            return 113;
        }
        return null;
    },

    // ========== 新函数（使用配置表） ==========

    getExchangeIdByRoleType: function (roleType) {
        var config = _roleConfigMap[roleType];
        return config ? config.exchangeId : null;
    },

    getPurchaseIdByRoleType: function (roleType) {
        var config = _roleConfigMap[roleType];
        return config ? config.purchaseId : null;
    },

    // ========== 验证函数 ==========

    _verifyRefactor: function() {
        var testCases = [1, 2, 3, 4, 5, 6, 7];
        var allPassed = true;

        cc.log("=== role.js 重构验证开始 ===");

        // 验证 getExchangeIdByRoleType
        for (var i = 0; i < testCases.length; i++) {
            var roleType = testCases[i];
            var oldResult = this.getExchangeIdByRoleType_old(roleType);
            var newResult = this.getExchangeIdByRoleType(roleType);

            if (oldResult !== newResult) {
                cc.error("[验证失败] getExchangeIdByRoleType: roleType=" + roleType +
                         " old=" + oldResult + " new=" + newResult);
                allPassed = false;
            }
        }

        // 验证 getPurchaseIdByRoleType
        for (var i = 0; i < testCases.length; i++) {
            var roleType = testCases[i];
            var oldResult = this.getPurchaseIdByRoleType_old(roleType);
            var newResult = this.getPurchaseIdByRoleType(roleType);

            if (oldResult !== newResult) {
                cc.error("[验证失败] getPurchaseIdByRoleType: roleType=" + roleType +
                         " old=" + oldResult + " new=" + newResult);
                allPassed = false;
            }
        }

        if (allPassed) {
            cc.log("[验证通过] role.js 所有函数重构成功 ✓");
        } else {
            cc.error("[验证失败] role.js 重构有问题，请检查 ✗");
        }

        cc.log("=== role.js 重构验证结束 ===");
        return allPassed;
    },

    // ========== 其他函数（不需要重构） ==========

    isRolePurchaseRequired: function (roleType) {
        if (roleType === RoleType.STRANGER) {
            return false;
        }
        return !!this.getPurchaseIdByRoleType(roleType);
    },

    chooseRoleType: function (roleType) {
        cc.sys.localStorage.setItem("roleType", roleType);
    },

    getChoosenRoleType: function () {
        var roleType = cc.sys.localStorage.getItem("roleType");
        if (roleType === undefined || roleType === null || roleType === "") {
            return RoleType.STRANGER;
        } else {
            return Number(roleType);
        }
    },

    isRoleUnlocked: function (roleType) {
        if (roleType === RoleType.STRANGER) {
            return true;
        }

        var exchangeId = this.getExchangeIdByRoleType(roleType);
        if (!exchangeId) {
            return false;
        }
        return Medal.isExchanged(exchangeId);
    },

    getRoleInfo: function (roleType) {
        var rt = roleType || 0;
        var infos = {
            0: { name: stringUtil.getString(1340), des: stringUtil.getString(1320) },
            1: { name: stringUtil.getString(1313), des: stringUtil.getString('p_108').des, effect: stringUtil.getString('p_108').effect },
            4: { name: stringUtil.getString(1321), des: stringUtil.getString('p_109').des, effect: stringUtil.getString('p_109').effect },
            2: { name: stringUtil.getString(1319), des: stringUtil.getString(1324), effect: stringUtil.getString(1325) },
            5: { name: stringUtil.getString(1327), des: stringUtil.getString(1329), effect: stringUtil.getString(1330) },
            3: { name: stringUtil.getString(1331), des: stringUtil.getString(1333), effect: stringUtil.getString(1334) },
            6: { name: stringUtil.getString(1311), des: stringUtil.getString(1317), effect: stringUtil.getString(1318) },
            7: { name: stringUtil.getString(1342), des: stringUtil.getString(1343), effect: stringUtil.getString(1344) }
        };
        return infos[rt];
    }
};

// 在游戏启动时自动验证（可以在 main.js 或初始化代码中调用）
// if (CC_DEBUG) {
//     role._verifyRefactor();
// }
