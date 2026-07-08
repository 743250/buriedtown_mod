/**
 * Created by lancelot on 16/3/1.
 */

var RoleType = {
    //根据NPC ID
    STRANGER: 6,
    LUO: 1,
    YAZI: 4
};

var role = {
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
        } else if (roleType === RoleType.LUO) {
            return IAPPackage.isIAPUnlocked(108);
        } else if (roleType === RoleType.YAZI) {
            return IAPPackage.isIAPUnlocked(109);
        } else {
            return false;
        }
    },
    getRoleInfo: function (roleType) {
        var rt = roleType || 0;

        var infos = {
            0: {
                name: stringUtil.getString(1319),
                des: stringUtil.getString(1320)
            },
            1: {
                name: stringUtil.getString(1313),
                des: stringUtil.getString('p_108').des,
                effect: stringUtil.getString('p_108').effect
            },
            4: {
                name: stringUtil.getString(1321),
                des: stringUtil.getString('p_109').des,
                effect: stringUtil.getString('p_109').effect
            },
            6: {
                name: stringUtil.getString(1311),
                des: stringUtil.getString(1317),
                effect: stringUtil.getString(1318)
            }
        };

        return infos[rt];
    }
};
