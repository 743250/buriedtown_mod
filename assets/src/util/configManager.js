/**
 * 配置管理器 - 统一的配置访问接口
 * 减少硬编码，提供类型安全的配置访问
 */

var ConfigManager = {
    /**
     * 获取角色配置
     * @param {number} roleType - 角色类型
     * @returns {Object|null} 角色配置对象
     */
    getRoleConfig: function(roleType) {
        return RoleConfigTable[roleType] || null;
    },

    /**
     * 获取角色的exchangeId
     * @param {number} roleType - 角色类型
     * @returns {number} exchangeId
     */
    getRoleExchangeId: function(roleType) {
        var config = this.getRoleConfig(roleType);
        return config ? config.exchangeId : 0;
    },

    /**
     * 获取角色的purchaseId
     * @param {number} roleType - 角色类型
     * @returns {number} purchaseId
     */
    getRolePurchaseId: function(roleType) {
        var config = this.getRoleConfig(roleType);
        return config ? config.purchaseId : 0;
    },

    /**
     * 获取角色的解锁地点列表
     * @param {number} roleType - 角色类型
     * @returns {Array} 地点ID列表
     */
    getRoleUnlockSites: function(roleType) {
        var config = this.getRoleConfig(roleType);
        return config && config.unlockSites ? config.unlockSites : [];
    },

    /**
     * 获取天赋配置
     * @param {number} talentId - 天赋ID
     * @returns {Object|null} 天赋配置对象
     */
    getTalentConfig: function(talentId) {
        return TalentConfigTable[talentId] || null;
    },

    /**
     * 获取天赋在指定等级的效果值
     * @param {number} talentId - 天赋ID
     * @param {number} level - 天赋等级
     * @returns {*} 效果值
     */
    getTalentEffectValue: function(talentId, level) {
        var config = this.getTalentConfig(talentId);
        if (!config || !config.effectValues) {
            return 0;
        }
        level = Math.max(0, Math.min(level, config.maxLevel));
        return config.effectValues[level];
    }
};
