import { getGlobalScope } from "../shared/global";

const DEFAULT_SPRITES = {
    character: "npc_dig_0.png",
    talent: "icon_iap_0.png",
    purchase: "icon_iap_101.png",
    item: "icon_item_1101051.png",
    itemDetail: "dig_item_1101051.png",
    site: "site_1.png"
};

function getSafetyHelper(): any {
    return getGlobalScope().SafetyHelper || null;
}

export class AssetResolver {
    DEFAULT_SPRITES = DEFAULT_SPRITES;

    private loadWithFallback(primaryName: string, fallbackName: string | null, context: string): any {
        const globalScope = getGlobalScope();
        const safetyHelper = getSafetyHelper();
        let sprite = null;
        if (primaryName && safetyHelper && typeof safetyHelper.safeLoadSprite === "function") {
            sprite = safetyHelper.safeLoadSprite(primaryName, null);
        }
        if (sprite) {
            return sprite;
        }

        if (primaryName && fallbackName && globalScope.cc && typeof globalScope.cc.log === "function") {
            globalScope.cc.log("[AssetResolver] fallback " + context + " missing=" + primaryName + " fallback=" + fallbackName);
        }
        return safetyHelper && typeof safetyHelper.safeLoadSprite === "function"
            ? safetyHelper.safeLoadSprite(fallbackName, null)
            : null;
    }

    getCharacterIcon(roleType: number, fallbackName?: string): any {
        const globalScope = getGlobalScope();
        const iconHelper = globalScope.IconHelper;
        let iconName = "npc_dig_" + roleType + ".png";
        if (iconHelper && typeof iconHelper.getRolePortraitFrameName === "function") {
            iconName = iconHelper.getRolePortraitFrameName(roleType, false, fallbackName || DEFAULT_SPRITES.character);
        }
        return this.loadWithFallback(iconName, fallbackName || DEFAULT_SPRITES.character, "character:" + roleType);
    }

    getTalentIcon(purchaseId: number, fallbackName?: string): any {
        return this.loadWithFallback("icon_iap_" + purchaseId + ".png", fallbackName || DEFAULT_SPRITES.talent, "talent:" + purchaseId);
    }

    getPurchaseIcon(purchaseId: number, fallbackName?: string): any {
        return this.loadWithFallback("icon_iap_" + purchaseId + ".png", fallbackName || DEFAULT_SPRITES.purchase, "purchase:" + purchaseId);
    }

    getItemIcon(itemId: number, fallbackName?: string): any {
        return this.loadWithFallback("icon_item_" + itemId + ".png", fallbackName || DEFAULT_SPRITES.item, "item:" + itemId);
    }

    getSiteIcon(siteId: number, fallbackName?: string): any {
        return this.loadWithFallback("site_" + siteId + ".png", fallbackName || DEFAULT_SPRITES.site, "site:" + siteId);
    }

    createLegacyFacade(): any {
        const self = this;
        return {
            DEFAULT_SPRITES: DEFAULT_SPRITES,
            getCharacterIcon(roleType: number, fallbackName?: string) {
                return self.getCharacterIcon(roleType, fallbackName);
            },
            getTalentIcon(purchaseId: number, fallbackName?: string) {
                return self.getTalentIcon(purchaseId, fallbackName);
            },
            getPurchaseIcon(purchaseId: number, fallbackName?: string) {
                return self.getPurchaseIcon(purchaseId, fallbackName);
            },
            getItemIcon(itemId: number, fallbackName?: string) {
                return self.getItemIcon(itemId, fallbackName);
            },
            getSiteIcon(siteId: number, fallbackName?: string) {
                return self.getSiteIcon(siteId, fallbackName);
            }
        };
    }
}

