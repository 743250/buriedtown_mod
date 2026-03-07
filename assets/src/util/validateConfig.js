/**
 * 配置验证脚本 - 用于验证现有物品配置完整性
 * 使用方法：在游戏中通过控制台运行此脚本
 */

// 验证所有武器类物品（1301xxx-1305xxx）
var weaponIds = [];
for (var id in itemConfig) {
    var itemType = Math.floor(id / 1000);
    if (itemType >= 1301 && itemType <= 1305) {
        weaponIds.push(parseInt(id));
    }
}

cc.log("=== 开始验证配置 ===");
cc.log("找到 " + weaponIds.length + " 个物品需要验证");

var report = ConfigValidator.validateItems(weaponIds);
ConfigValidator.printReport(report);

cc.log("\n=== 验证完成 ===");
