/**
 * Site config validation helper.
 * Run this from the in-game console after the regular scripts are loaded.
 */
var siteIds = [];
if (typeof SiteConfigService !== "undefined" && SiteConfigService && typeof SiteConfigService.getAllSiteIds === "function") {
    siteIds = SiteConfigService.getAllSiteIds();
} else {
    for (var siteId in siteConfig) {
        siteIds.push(parseInt(siteId));
    }
}

cc.log("=== 开始验证站点配置 ===");
cc.log("找到 " + siteIds.length + " 个站点需要验证");

var siteReport = ConfigValidator.validateSites(siteIds);
ConfigValidator.printReport(siteReport);

cc.log("\n=== 站点配置验证完成 ===");
