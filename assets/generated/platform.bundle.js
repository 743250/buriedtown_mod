var BuriedTownPlatformBundle = (() => {
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
  var PlatformFacade = class {
    getPurchaseAndroid() {
      return getGlobalScope().PurchaseAndroid || null;
    }
    getPurchaseService() {
      return getGlobalScope().PurchaseService || null;
    }
    getAdHelper() {
      return getGlobalScope().adHelper || null;
    }
    getGameCenter() {
      return getGlobalScope().gameCenter || null;
    }
    getCommonUtil() {
      return getGlobalScope().CommonUtil || null;
    }
    getReflection() {
      const globalScope2 = getGlobalScope();
      return globalScope2.jsb && globalScope2.jsb.reflection ? globalScope2.jsb.reflection : null;
    }
    getUpdateBridge() {
      return getGlobalScope().up || null;
    }
  };

  // src-mod/runtime/platform-entry.ts
  var globalScope = getGlobalScope();
  globalScope.BuriedTownPlatform = new PlatformFacade();
})();
