/**
 * 图标管理器 - 统一管理所有图标获取逻辑
 * 解决图标管理混乱的问题
 */

var IconManager = {
    /**
     * 获取物品图标名称
     * @param {number} itemId - 物品ID
     * @param {string} prefix - 前缀（如 "icon_item_", "icon_tab_", "icon_tab_content_"）
     * @param {string} fallback - 默认图标
     * @returns {string} 图标名称
     */
    getItemIcon: function(itemId, prefix, fallback) {
        prefix = prefix || "icon_item_";
        fallback = fallback || "icon_item_1101051.png";

        var displayId = uiUtil.getDisplayItemId ? uiUtil.getDisplayItemId(itemId) : itemId;
        return "#" + prefix + displayId + ".png";
    },

    /**
     * 安全获取精灵（如果图标不存在，使用默认图标）
     * @param {number} itemId - 物品ID
     * @param {string} prefix - 前缀
     * @param {string} fallback - 默认图标
     * @returns {cc.Sprite} 精灵对象
     */
    getSafeItemSprite: function(itemId, prefix, fallback) {
        var iconName = this.getItemIcon(itemId, prefix, fallback);
        return uiUtil.getSpriteByNameSafe ?
            uiUtil.getSpriteByNameSafe(iconName, fallback) :
            autoSpriteFrameController.getSpriteFromSpriteName(iconName);
    },

    /**
     * 验证图标是否存在
     * @param {string} iconName - 图标名称
     * @returns {boolean}
     */
    iconExists: function(iconName) {
        try {
            var frame = autoSpriteFrameController.getSpriteFrameFromSpriteName(iconName);
            return !!frame;
        } catch (e) {
            return false;
        }
    }
};
