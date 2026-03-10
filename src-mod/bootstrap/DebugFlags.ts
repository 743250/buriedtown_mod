import { getGlobalScope } from "../shared/global";

const STORAGE_KEY = {
    PURCHASE_BYPASS_SDK: "debug_purchase_bypass_sdk",
    PURCHASE_AUTO_UNLOCK: "debug_purchase_auto_unlock",
    CONTENT_VALIDATION: "debug_content_validation"
};

function getLocalStorage(): any {
    const globalScope = getGlobalScope();
    const cc = globalScope.cc;
    return cc && cc.sys && cc.sys.localStorage ? cc.sys.localStorage : null;
}

function readBoolFlag(storageKey: string, fallbackValue: boolean): boolean {
    const storage = getLocalStorage();
    if (!storage || !storageKey) {
        return fallbackValue;
    }

    const rawValue = storage.getItem(storageKey);
    if (rawValue === null || rawValue === undefined || rawValue === "") {
        return fallbackValue;
    }

    const normalized = ("" + rawValue).toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
        return true;
    }
    if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
        return false;
    }
    return fallbackValue;
}

export const DebugFlags = {
    STORAGE_KEY: STORAGE_KEY,
    isContentValidationEnabled(): boolean {
        return readBoolFlag(STORAGE_KEY.CONTENT_VALIDATION, false);
    },
    getPurchaseDebugFlags(): { unlockAllRoleAndTalentForTest: boolean; bypassPaySdkForTest: boolean } {
        return {
            unlockAllRoleAndTalentForTest: readBoolFlag(STORAGE_KEY.PURCHASE_AUTO_UNLOCK, false),
            bypassPaySdkForTest: readBoolFlag(STORAGE_KEY.PURCHASE_BYPASS_SDK, false)
        };
    },
    createLegacyEnvironmentConfig(): any {
        return {
            STORAGE_KEY: STORAGE_KEY,
            isContentValidationEnabled: this.isContentValidationEnabled.bind(this),
            getPurchaseDebugFlags: this.getPurchaseDebugFlags.bind(this)
        };
    }
};

