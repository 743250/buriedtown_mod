import { getGlobalScope } from "../../shared/global";

const TALENT_LEVEL_TEXT_MAP: Record<number, string> = {
    1: "\u4e00",
    2: "\u4e8c",
    3: "\u4e09"
};

export class CommerceAppService {
    private normalizePurchaseId(purchaseId: any): number | null {
        const normalized = parseInt(String(purchaseId), 10);
        return isNaN(normalized) ? null : normalized;
    }

    private clonePlainObject(value: any): Record<string, any> {
        if (!value || typeof value !== "object") {
            return {};
        }
        const clone: Record<string, any> = {};
        Object.keys(value).forEach((key) => {
            clone[key] = value[key];
        });
        return clone;
    }

    initPackage(): void {
        const globalScope = getGlobalScope();
        if (globalScope.PurchaseService && typeof globalScope.PurchaseService.initPackage === "function") {
            globalScope.PurchaseService.initPackage();
        }
    }

    isPaySdkBypassedForTest(): boolean {
        const globalScope = getGlobalScope();
        return !!(globalScope.PurchaseService
            && typeof globalScope.PurchaseService.isPaySdkBypassedForTest === "function"
            && globalScope.PurchaseService.isPaySdkBypassedForTest());
    }

    getRoleTypeByPurchaseId(purchaseId: any): number | null {
        const globalScope = getGlobalScope();
        const resolvedPurchaseId = this.normalizePurchaseId(purchaseId);
        if (resolvedPurchaseId === null
            || !globalScope.PurchaseService
            || typeof globalScope.PurchaseService.getExchangeIdsByPurchaseId !== "function"
            || !globalScope.ExchangeAchievementConfig) {
            return null;
        }

        const exchangeIds = globalScope.PurchaseService.getExchangeIdsByPurchaseId(resolvedPurchaseId) || [];
        if (!exchangeIds.length) {
            return null;
        }

        const exchangeConfig = globalScope.ExchangeAchievementConfig[exchangeIds[0]];
        if (!exchangeConfig || exchangeConfig.type !== "character") {
            return null;
        }

        return exchangeConfig.targetId;
    }

    getPurchaseStringConfig(purchaseId: any): Record<string, any> {
        const globalScope = getGlobalScope();
        const resolvedPurchaseId = this.normalizePurchaseId(purchaseId);
        const fallbackName = resolvedPurchaseId === null ? "ID unknown" : "ID " + resolvedPurchaseId;
        const stringKey = resolvedPurchaseId === null ? null : "p_" + resolvedPurchaseId;
        const rawConfig = stringKey
            && globalScope.stringUtil
            && typeof globalScope.stringUtil.getString === "function"
            ? globalScope.stringUtil.getString(stringKey)
            : null;
        const strConfig = this.clonePlainObject(rawConfig);

        if (typeof strConfig.name !== "string" || strConfig.name.length === 0) {
            strConfig.name = fallbackName;
        }
        if (typeof strConfig.des !== "string") {
            strConfig.des = "";
        }
        if (typeof strConfig.effect !== "string") {
            strConfig.effect = "";
        }

        if (!/^ID\s+\d+$/.test(strConfig.name)
            || resolvedPurchaseId === null
            || !globalScope.PurchaseService
            || typeof globalScope.PurchaseService.getExchangeIdsByPurchaseId !== "function"
            || !globalScope.ExchangeAchievementConfig) {
            return strConfig;
        }

        const exchangeIds = globalScope.PurchaseService.getExchangeIdsByPurchaseId(resolvedPurchaseId) || [];
        if (!exchangeIds.length) {
            return strConfig;
        }

        const exchangeConfig = globalScope.ExchangeAchievementConfig[exchangeIds[0]];
        if (!exchangeConfig || exchangeConfig.type !== "character") {
            return strConfig;
        }

        const roleInfo = globalScope.role
            && typeof globalScope.role.getRoleInfo === "function"
            ? globalScope.role.getRoleInfo(exchangeConfig.targetId)
            : null;
        if (roleInfo) {
            strConfig.name = roleInfo.name || strConfig.name;
            if (!strConfig.des) {
                strConfig.des = roleInfo.des || "";
            }
            if (!strConfig.effect) {
                strConfig.effect = roleInfo.effect || "";
            }
            return strConfig;
        }

        if (exchangeConfig.name) {
            strConfig.name = exchangeConfig.name;
        }
        return strConfig;
    }

    getTalentDisplayInfo(purchaseId: any, baseName?: string): Record<string, any> | null {
        const globalScope = getGlobalScope();
        const resolvedPurchaseId = this.normalizePurchaseId(purchaseId);
        if (resolvedPurchaseId === null
            || !globalScope.PurchaseService
            || typeof globalScope.PurchaseService.isTalentPurchase !== "function"
            || !globalScope.PurchaseService.isTalentPurchase(resolvedPurchaseId)) {
            return null;
        }

        const currentLevel = globalScope.Medal && typeof globalScope.Medal.getTalentLevel === "function"
            ? globalScope.Medal.getTalentLevel(resolvedPurchaseId)
            : 0;
        const maxLevel = globalScope.TalentService && typeof globalScope.TalentService.getTalentMaxLevel === "function"
            ? globalScope.TalentService.getTalentMaxLevel(resolvedPurchaseId)
            : 3;
        const nextLevel = currentLevel >= maxLevel ? maxLevel : (currentLevel + 1);
        const strConfig = this.getPurchaseStringConfig(resolvedPurchaseId);
        const talentName = baseName || strConfig.name || "";
        const baseDes = (strConfig.des || "").replace(/\\n/g, "\n");

        let effectList = globalScope.TalentService
            && typeof globalScope.TalentService.getTalentTierEffectTextList === "function"
            ? globalScope.TalentService.getTalentTierEffectTextList(resolvedPurchaseId)
            : [];
        if (!Array.isArray(effectList) || effectList.length === 0) {
            const fallbackEffect = (strConfig.effect || "").replace(/\\n/g, "\n") || "\u6548\u679c\u589e\u5f3a";
            effectList = [];
            for (let effectIndex = 0; effectIndex < maxLevel; effectIndex++) {
                effectList.push(fallbackEffect);
            }
        }

        const tierLines: string[] = [];
        for (let level = 1; level <= maxLevel; level++) {
            const tierEffectText = effectList[level - 1] || effectList[effectList.length - 1] || "\u6548\u679c\u589e\u5f3a";
            tierLines.push((TALENT_LEVEL_TEXT_MAP[level] || String(level)) + "\u7ea7 " + tierEffectText);
        }

        const currentEffectText = currentLevel >= 1
            ? (effectList[Math.max(0, Math.min(effectList.length - 1, currentLevel - 1))] || "")
            : "\u65e0";
        const nextEffectText = currentLevel >= maxLevel
            ? "\u65e0"
            : (effectList[Math.max(0, Math.min(effectList.length - 1, nextLevel - 1))] || "");

        const desParts: string[] = [];
        if (baseDes) {
            desParts.push(baseDes);
        }
        if (desParts.length === 0) {
            desParts.push("\u80fd\u529b\u63cf\u8ff0: \u6682\u65e0");
        }

        const effectParts = [
            "\u5f53\u524d\u80fd\u529b\u6548\u679c: " + currentEffectText,
            "\u4e0b\u4e00\u9636\u6bb5\u80fd\u529b\u6548\u679c: " + nextEffectText
        ];

        let cardName = talentName;
        if (currentLevel >= maxLevel) {
            cardName = talentName + "\uff08\u5df2\u6ee1\u7ea7\uff09";
        } else if (currentLevel >= 1) {
            cardName = talentName + "\uff08\u5347\u81f3" + (TALENT_LEVEL_TEXT_MAP[nextLevel] || String(nextLevel)) + "\u7ea7\uff09";
        } else {
            cardName = talentName + "\uff08\u89e3\u9501" + (TALENT_LEVEL_TEXT_MAP[nextLevel] || String(nextLevel)) + "\u7ea7\uff09";
        }

        return {
            currentLevel: currentLevel,
            nextLevel: nextLevel,
            isMaxLevel: currentLevel >= maxLevel,
            displayName: talentName,
            cardName: cardName,
            desText: desParts.join("\n\n"),
            effectText: effectParts.join("\n"),
            tierLines: tierLines
        };
    }
}
