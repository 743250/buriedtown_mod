var BuriedTownPlatformBundle = (function () {
    // src-mod/shared/global.ts
    function getGlobalScope() {
        if (typeof globalThis !== "undefined") {
            return globalThis;
        }
        if (typeof window !== "undefined") {
            return window;
        }
        if (typeof self !== "undefined") {
            return self;
        }
        return Function("return this")();
    }
    // src-mod/platform/PlatformFacade.ts
    var PlatformFacade = /** @class */ (function () {
        function PlatformFacade() {
        }
        PlatformFacade.prototype.getPurchaseAndroid = function () {
            return getGlobalScope().PurchaseAndroid || null;
        };
        PlatformFacade.prototype.getPurchaseService = function () {
            return getGlobalScope().PurchaseService || null;
        };
        PlatformFacade.prototype.getAdHelper = function () {
            return getGlobalScope().adHelper || null;
        };
        PlatformFacade.prototype.getGameCenter = function () {
            return getGlobalScope().gameCenter || null;
        };
        PlatformFacade.prototype.getCommonUtil = function () {
            return getGlobalScope().CommonUtil || null;
        };
        PlatformFacade.prototype.getReflection = function () {
            var globalScope2 = getGlobalScope();
            return globalScope2.jsb && globalScope2.jsb.reflection ? globalScope2.jsb.reflection : null;
        };
        PlatformFacade.prototype.getUpdateBridge = function () {
            return getGlobalScope().up || null;
        };
        return PlatformFacade;
    }());
    // src-mod/runtime/platform-entry.ts
    var globalScope = getGlobalScope();
    globalScope.BuriedTownPlatform = new PlatformFacade();
})();
