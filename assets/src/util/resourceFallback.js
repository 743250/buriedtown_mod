/**
 * 资源映射默认配置工具
 * 用途：新增天赋/角色/物品时，如果缺少图标或UI配置，自动使用默认配置
 * 创建日期：2026-03-06
 */

var ResourceFallback = {
    DEFAULT_SPRITES: {
        character: "npc_dig_0.png",
        talent: "icon_iap_0.png",
        purchase: "icon_iap_101.png",
        item: "icon_item_1101051.png",
        itemDetail: "dig_item_1101051.png",
        site: "site_1.png"
    },

    _loadWithFallback: function (primaryName, fallbackName, context) {
        var sprite = null;
        if (!SafetyHelper.isEmpty(primaryName)) {
            sprite = SafetyHelper.safeLoadSprite(primaryName, null);
        }
        if (sprite) {
            return sprite;
        }
        if (!SafetyHelper.isEmpty(primaryName) && !SafetyHelper.isEmpty(fallbackName)) {
            cc.log("[ResourceFallback] 使用默认资源: " + context + ", missing=" + primaryName + ", fallback=" + fallbackName);
        }
        return SafetyHelper.safeLoadSprite(fallbackName, null);
    },

    getSpriteByName: function (spriteName, fallbackName, context) {
        return this._loadWithFallback(spriteName, fallbackName || null, context || ("sprite:" + spriteName));
    },

    getOptionalSprite: function (spriteName) {
        if (SafetyHelper.isEmpty(spriteName)) {
            return null;
        }
        return SafetyHelper.safeLoadSprite(spriteName, null);
    },

    /**
     * 获取角色头像（带默认fallback）
     */
    getCharacterIcon: function(roleType, fallbackName) {
        var iconName = null;
        if (typeof IconHelper !== "undefined" && IconHelper && typeof IconHelper.getRolePortraitFrameName === "function") {
            iconName = IconHelper.getRolePortraitFrameName(roleType, false, fallbackName || this.DEFAULT_SPRITES.character);
        } else {
            iconName = "npc_dig_" + roleType + ".png";
        }
        return this._loadWithFallback(iconName, fallbackName || this.DEFAULT_SPRITES.character, "character:" + roleType);
    },

    /**
     * 获取天赋图标（带默认fallback）
     */
    getTalentIcon: function(purchaseId, fallbackName) {
        var iconName = "icon_iap_" + purchaseId + ".png";
        return this._loadWithFallback(iconName, fallbackName || this.DEFAULT_SPRITES.talent, "talent:" + purchaseId);
    },

    /**
     * 获取物品图标（带默认fallback）
     */
    getItemIcon: function(itemId, fallbackName) {
        var iconName = "icon_item_" + itemId + ".png";
        return this._loadWithFallback(iconName, fallbackName || this.DEFAULT_SPRITES.item, "item:" + itemId);
    },

    /**
     * 获取站点图标（带默认fallback）
     */
    getSiteIcon: function(siteId, fallbackName) {
        var iconName = "site_" + siteId + ".png";
        return this._loadWithFallback(iconName, fallbackName || this.DEFAULT_SPRITES.site, "site:" + siteId);
    },

    getPurchaseIcon: function (purchaseId, fallbackName) {
        var iconName = "icon_iap_" + purchaseId + ".png";
        return this._loadWithFallback(iconName, fallbackName || this.DEFAULT_SPRITES.purchase, "purchase:" + purchaseId);
    }
};
