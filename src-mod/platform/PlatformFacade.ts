import { getGlobalScope } from "../shared/global";

export class PlatformFacade {
    getPurchaseAndroid(): any {
        return getGlobalScope().PurchaseAndroid || null;
    }

    getPurchaseService(): any {
        return getGlobalScope().PurchaseService || null;
    }

    getAdHelper(): any {
        return getGlobalScope().adHelper || null;
    }

    getGameCenter(): any {
        return getGlobalScope().gameCenter || null;
    }

    getCommonUtil(): any {
        return getGlobalScope().CommonUtil || null;
    }

    getReflection(): any {
        const globalScope = getGlobalScope();
        return globalScope.jsb && globalScope.jsb.reflection ? globalScope.jsb.reflection : null;
    }

    getUpdateBridge(): any {
        return getGlobalScope().up || null;
    }
}
