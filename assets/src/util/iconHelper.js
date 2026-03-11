/**
 * 图标获取辅助工具
 * 用途：
 * 1. 检测图标映射配置是否完整
 * 2. 自动降级到默认图标
 * 3. 开发模式下输出警告
 *
 * 使用方式：
 * var icon = IconHelper.getRoleIcon(roleType, "default.png");
 *
 * 创建时间：2026-03-06
 */

var IconHelper = {
    // 开发模式标志（生产环境设为false）
    DEV_MODE: true,

    // 内联配置表 - 角色图标映射
    _roleIconMap: {
        1: "npc_dig_1.png",  // 陌生人
        2: "npc_dig_2.png",  // 金医生
        3: "npc_dig_3.png",  // 杰夫
        4: "npc_dig_4.png",  // 雅子
        5: "npc_dig_5.png",  // 比尔
        6: "npc_dig_6.png",  // 老罗
        8: "npc_dig_8.png"   // 贝尔
    },

    // 内联配置表 - 角色头像fallback映射
    _roleAvatarMap: {
        1: "npc_dig_1.png",
        2: "npc_dig_2.png",
        3: "npc_dig_3.png",
        4: "npc_dig_4.png",
        5: "npc_dig_5.png",
        6: "npc_dig_6.png",
        8: "npc_dig_8.png"
    },

    _getRoleConfig: function(roleType) {
        roleType = parseInt(roleType);
        if (isNaN(roleType)) {
            return null;
        }
        if (typeof role !== "undefined" && role && typeof role.getRoleConfig === "function") {
            return role.getRoleConfig(roleType);
        }
        if (typeof RoleConfigTable !== "undefined" && RoleConfigTable) {
            return RoleConfigTable[roleType] || null;
        }
        return null;
    },

    normalizeRoleType: function(roleType) {
        roleType = parseInt(roleType);
        if (isNaN(roleType)) {
            return null;
        }
        if (typeof role !== "undefined" && role && typeof role.getMapRoleTypeByRoleType === "function") {
            return role.getMapRoleTypeByRoleType(roleType);
        }
        var config = this._getRoleConfig(roleType);
        if (config && isFinite(config.mapRoleType)) {
            return parseInt(config.mapRoleType);
        }
        if (roleType === 8) {
            return 7;
        }
        return roleType;
    },

    /**
     * 获取角色图标
     * @param {number} roleType - 角色类型
     * @param {string} defaultIcon - 默认图标名称
     * @returns {string} 图标名称
     */
    getRoleIcon: function(roleType, defaultIcon) {
        roleType = parseInt(roleType);
        var mapped = this._roleIconMap[roleType];
        if (!mapped) {
            this._warn("角色", roleType, defaultIcon);
            return defaultIcon;
        }
        return mapped;
    },

    /**
     * 获取角色头像fallback
     * @param {number} roleType - 角色类型
     * @param {string} defaultAvatar - 默认头像
     * @returns {string} 头像名称
     */
    getRoleAvatar: function(roleType, defaultAvatar) {
        roleType = parseInt(roleType);
        var config = this._getRoleConfig(roleType);
        var mapped = config && config.avatarFallback ? config.avatarFallback : this._roleAvatarMap[roleType];
        if (!mapped && this._roleAvatarMap[roleType]) {
            mapped = this._roleAvatarMap[roleType];
        }
        if (!mapped) {
            this._warn("角色头像", roleType, defaultAvatar);
            return defaultAvatar || "npc_dig_6.png";
        }
        return mapped;
    },

    getRolePortraitFrameName: function(roleType, withHash, defaultAvatar) {
        var mapped = this.getRoleAvatar(roleType, defaultAvatar || "npc_dig_0.png");
        if (!mapped) {
            return defaultAvatar || "npc_dig_0.png";
        }
        return withHash && mapped.charAt(0) !== "#" ? "#" + mapped : mapped;
    },

    getRoleMapFrameName: function(roleType, withHash, defaultIcon) {
        var normalizedRoleType = this.normalizeRoleType(roleType);
        var frameName = normalizedRoleType ? "npc_" + normalizedRoleType + ".png" : (defaultIcon || "npc_1.png");
        if (withHash && frameName.charAt(0) !== "#") {
            return "#" + frameName;
        }
        return frameName;
    },

    /**
     * 注册角色图标映射（用于扩展）
     * @param {number} roleType - 角色类型
     * @param {string} iconName - 图标名称
     */
    registerRoleIcon: function(roleType, iconName) {
        this._roleIconMap[roleType] = iconName;
    },

    /**
     * 注册角色头像映射（用于扩展）
     * @param {number} roleType - 角色类型
     * @param {string} avatarName - 头像名称
     */
    registerRoleAvatar: function(roleType, avatarName) {
        this._roleAvatarMap[roleType] = avatarName;
    },

    /**
     * 输出警告信息（仅开发模式）
     * @private
     */
    _warn: function(type, id, defaultValue) {
        if (this.DEV_MODE) {
            cc.warn("[IconHelper] " + type + " " + id + " 未配置图标映射，使用默认值: " + defaultValue);
            cc.warn("[IconHelper] 请在 iconHelper.js 中添加映射配置");
        }
    },

    /**
     * 批量导入映射配置（用于初始化）
     * @param {string} type - 类型（role/item/npc）
     * @param {object} mappings - 映射表
     */
    importMappings: function(type, mappings) {
        if (type === "role") {
            for (var key in mappings) {
                this._roleIconMap[key] = mappings[key];
            }
        } else if (type === "roleAvatar") {
            for (var key in mappings) {
                this._roleAvatarMap[key] = mappings[key];
            }
        }
    },

    /**
     * 检查配置完整性（用于调试）
     * @param {string} type - 类型
     * @param {array} ids - 需要检查的ID列表
     * @returns {array} 缺失的ID列表
     */
    checkMappings: function(type, ids) {
        var missing = [];
        var map = type === "role" ? this._roleIconMap : this._roleAvatarMap;

        ids.forEach(function(id) {
            if (!map[id]) {
                missing.push(id);
            }
        });

        if (missing.length > 0 && this.DEV_MODE) {
            cc.warn("[IconHelper] " + type + " 缺失映射配置: " + missing.join(", "));
        }

        return missing;
    }
};
