const {
    assert,
    readRepoFile: readFile
} = require("../../lib/core");

function runLoadChainSmoke() {
    const jsListSource = readFile("assets/src/jsList.js");
    const gameKernelSource = readFile("assets/src/game/GameKernel.js");
    const battleSource = readFile("assets/src/game/Battle.js");
    const battleActorsSource = readFile("assets/src/game/BattleActors.js");
    const buildSource = readFile("assets/src/game/Build.js");
    const buildActionSource = readFile("assets/src/game/buildAction.js");
    const buildActionEffectSource = readFile("assets/src/game/BuildActionEffectService.js");
    const siteSource = readFile("assets/src/game/site.js");
    const mapSource = readFile("assets/src/game/map.js");
    const travelServiceSource = readFile("assets/src/game/TravelService.js");
    const ziplineNetworkSource = readFile("assets/src/game/ZiplineNetworkService.js");
    const mapActorSource = readFile("assets/src/ui/MapActor.js");
    const mapInteractionSource = readFile("assets/src/ui/MapInteractionController.js");
    const purchaseUiHelperSource = readFile("assets/src/ui/PurchaseUiHelper.js");
    const chooseSceneSource = readFile("assets/src/ui/ChooseScene.js");
    const medalSceneViewSource = readFile("assets/src/ui/MedalSceneView.js");
    const shopSceneSource = readFile("assets/src/ui/shopScene.js");
    const topFrameSource = readFile("assets/src/ui/topFrame.js");
    const homeSource = readFile("assets/src/ui/home.js");
    const deathNodeSource = readFile("assets/src/ui/deathNode.js");
    const dialogSource = readFile("assets/src/ui/dialog.js");
    const uiUtilSource = readFile("assets/src/ui/uiUtil.js");
    const roleRuntimeSource = readFile("assets/src/game/RoleRuntimeService.js");
    const playerPersistenceSource = readFile("assets/src/game/PlayerPersistenceService.js");
    const utilsSource = readFile("assets/src/util/utils.js");
    const getIndex = function (relativePath) {
        return jsListSource.indexOf(relativePath);
    };

    assert(jsListSource.indexOf("src/game/GameRuntime.js") !== -1, "jsList is missing GameRuntime");
    assert(jsListSource.indexOf("src/game/GameKernel.js") !== -1, "jsList is missing GameKernel");
    assert(jsListSource.indexOf("BattleScene.js") === -1, "legacy BattleScene should not be in active jsList");
    [
        "src/game/RoleRuntimeService.js",
        "src/game/BuildActionEffectService.js",
        "src/game/PlayerPersistenceService.js",
        "src/game/TalentService.js",
        "src/game/PurchaseService.js",
        "src/game/player.js"
    ].forEach(function (relativePath) {
        assert(getIndex("src/game/GameKernel.js") < getIndex(relativePath),
            "GameKernel.js must load before " + relativePath);
    });
    [
        "src/game/BattleActors.js",
        "src/game/Battle.js",
        "src/game/Build.js",
        "src/game/buildAction.js",
        "src/game/site.js",
        "src/game/map.js",
        "src/game/ZiplineNetworkService.js",
        "src/ui/MapActor.js",
        "src/ui/MapInteractionController.js"
    ].forEach(function (relativePath) {
        assert(getIndex("src/game/GameRuntime.js") < getIndex(relativePath),
            "GameRuntime.js must load before " + relativePath);
    });
    assert(battleSource.indexOf("Battle.EVENTS") !== -1, "Battle runtime event contract is missing");
    assert(gameKernelSource.indexOf("register: function") !== -1
        && gameKernelSource.indexOf("require: function") !== -1,
        "GameKernel service registry contract is missing");
    assert(battleSource.indexOf("module.exports = {") !== -1, "Battle module export shape is missing");
    assert(siteSource.indexOf("module.exports = {") !== -1, "site module export shape is missing");
    assert(buildActionSource.indexOf("GameKernel.require(\"BuildActionEffectService\"") !== -1,
        "buildAction.js should resolve BuildActionEffectService through GameKernel");
    assert(buildSource.indexOf("player.costItems(") === -1
        && buildSource.indexOf("player.validateItems(") === -1
        && buildSource.indexOf("player.room.isBuildExist(") === -1
        && buildSource.indexOf("cc.timer.addTimerCallback(") === -1
        && buildSource.indexOf("cc.timer.accelerateWorkTime(") === -1
        && buildSource.indexOf("utils.emitter.emit(GameEvents.BUILD_NODE_UPDATE)") === -1
        && buildSource.indexOf("Record.saveAll()") === -1
        && buildSource.indexOf("getBuildRuntimePlayer") !== -1,
        "Build.js should delegate runtime player/timer/emitter/record access to GameRuntime");
    assert(roleRuntimeSource.indexOf("GameKernel.get(\"PurchaseService\"") !== -1,
        "RoleRuntimeService should resolve PurchaseService through GameKernel");
    assert(buildActionEffectSource.indexOf("GameKernel.register(\"BuildActionEffectService\"") !== -1,
        "BuildActionEffectService should register itself in GameKernel");
    assert(purchaseUiHelperSource.indexOf("GameKernel.require(\"PurchaseService\"") !== -1,
        "PurchaseUiHelper should resolve PurchaseService through GameKernel");
    assert(purchaseUiHelperSource.indexOf("Medal.getAchievementPoints") === -1
        && purchaseUiHelperSource.indexOf("Medal.getTalentLevel") === -1
        && purchaseUiHelperSource.indexOf("PurchaseService.isUnlocked(") === -1
        && purchaseUiHelperSource.indexOf("PurchaseService.getAchievementPriceByPurchaseId(") === -1
        && purchaseUiHelperSource.indexOf("shouldRequestRemotePayInfo") !== -1
        && purchaseUiHelperSource.indexOf("getPrimaryExchangeConfigByPurchaseId") !== -1,
        "PurchaseUiHelper should not rebuild purchase UI business state outside PurchaseService");
    assert(chooseSceneSource.indexOf("PurchaseService.isUnlocked(") === -1
        && chooseSceneSource.indexOf("PurchaseUiHelper.isPurchaseUnlocked(") !== -1,
        "ChooseScene should consume PurchaseUiHelper/PurchaseService shop state for talent unlock UI");
    assert(medalSceneViewSource.indexOf("Medal.getAchievementPoints(") === -1
        && medalSceneViewSource.indexOf("PurchaseUiHelper.getAchievementPoints(") !== -1,
        "MedalSceneView should consume PurchaseUiHelper for achievement point summary display");
    assert(topFrameSource.indexOf("Medal.getTalentLevel(") === -1
        && topFrameSource.indexOf("PurchaseUiHelper.getPurchaseUiSnapshot(") !== -1,
        "topFrame should consume PurchaseUiHelper shop state for chosen talent level display");
    assert(homeSource.indexOf("PurchaseService.isUnlocked(") === -1
        && homeSource.indexOf("PurchaseUiHelper.isPurchaseUnlocked(") !== -1,
        "home.js should consume PurchaseUiHelper for purchase-gated build unlock UI");
    assert(deathNodeSource.indexOf("PurchaseService.isUnlocked(") === -1
        && deathNodeSource.indexOf("PurchaseService.getPurchaseConfig(") === -1
        && deathNodeSource.indexOf("PurchaseUiHelper.isPurchaseUnlocked(") !== -1
        && deathNodeSource.indexOf("PurchaseUiHelper.applyPayDialogState(") !== -1,
        "deathNode.js should consume PurchaseUiHelper for revive purchase unlock and pay-dialog state");
    assert(uiUtilSource.indexOf("Medal.getTalentLevel(") === -1,
        "uiUtil talent purchase display should not read Medal talent level directly");
    assert(dialogSource.indexOf("PurchaseService.isExchangePurchase(") === -1
        && dialogSource.indexOf("PurchaseService.getPriceOff(") === -1
        && dialogSource.indexOf("PurchaseUiHelper.applyPayDialogState(") !== -1,
        "dialog.js should consume PurchaseUiHelper shop state for pay-dialog price and discount display");
    assert(shopSceneSource.indexOf("PurchaseService.isExchangePurchase(") === -1
        && shopSceneSource.indexOf("PurchaseUiHelper.shouldRequestRemotePayInfo(") !== -1,
        "shopScene should consume PurchaseUiHelper when deciding which purchases need remote price refresh");
    assert(uiUtilSource.indexOf("PurchaseService.getPriceOff(") === -1
        && uiUtilSource.indexOf("PurchaseService.isTalentPurchase(") === -1
        && uiUtilSource.indexOf("PurchaseService.getExchangeIdsByPurchaseId(") === -1
        && uiUtilSource.indexOf("PurchaseService.getExchangeIdByPurchaseId(") === -1
        && uiUtilSource.indexOf("PurchaseUiHelper.getPurchaseUiSnapshot(") !== -1
        && uiUtilSource.indexOf("PurchaseUiHelper.isExchangePurchase(") !== -1
        && uiUtilSource.indexOf("getPrimaryExchangeConfigByPurchaseId") !== -1,
        "uiUtil should consume PurchaseUiHelper for purchase display and lock-state metadata");
    assert(buildActionSource.indexOf(": player") === -1
        && buildActionSource.indexOf(": cc.timer") === -1
        && buildActionSource.indexOf(": utils.emitter") === -1
        && buildActionSource.indexOf(": Record") === -1,
        "buildAction.js should delegate runtime singleton fallback to GameRuntime");
    assert(siteSource.indexOf("typeof player !== \"undefined\"") === -1
        && siteSource.indexOf("utils.emitter.emit(\"onWorkSiteChange\"") === -1,
        "site.js should delegate runtime player/emitter access to GameRuntime");
    assert(mapSource.indexOf(": player") === -1
        && mapSource.indexOf(": utils.emitter") === -1,
        "map.js should delegate runtime player/emitter access to GameRuntime");
    assert(mapActorSource.indexOf(": player") === -1
        && mapActorSource.indexOf(": cc.timer") === -1,
        "MapActor.js should delegate runtime player/timer access to GameRuntime");
    assert(mapInteractionSource.indexOf(": player") === -1
        && mapInteractionSource.indexOf(": cc.timer") === -1
        && mapInteractionSource.indexOf(": Record") === -1,
        "MapInteractionController.js should delegate runtime access to GameRuntime");
    assert(battleSource.indexOf("return cc.timer;") === -1
        && battleSource.indexOf("return utils.emitter;") === -1,
        "Battle.js should delegate runtime timer/emitter access to GameRuntime");
    assert(buildActionEffectSource.indexOf("return player;") === -1
        && buildActionEffectSource.indexOf("return utils.emitter;") === -1,
        "BuildActionEffectService should delegate runtime player/emitter access to GameRuntime");
    assert(battleActorsSource.indexOf("player.weather.getValue") === -1
        && battleActorsSource.indexOf("player.changeAttr") === -1
        && battleActorsSource.indexOf("player.log.addMsg") === -1,
        "BattleActors.js should delegate runtime player access to GameRuntime");
    assert(travelServiceSource.indexOf("typeof GameRuntime") === -1,
        "TravelService should no longer keep a local GameRuntime fallback");
    assert(ziplineNetworkSource.indexOf("typeof player !== \"undefined\"") === -1,
        "ZiplineNetworkService should delegate runtime player access to GameRuntime");
    assert(roleRuntimeSource.indexOf("IAPPackage.isIAPUnlocked") === -1,
        "RoleRuntimeService should not read purchase lock state directly from IAPPackage");
    assert(playerPersistenceSource.indexOf("_applyLegacyRestoreMigrations") !== -1
        && playerPersistenceSource.indexOf("_applyRestoreReconciliations") !== -1,
        "PlayerPersistenceService should keep restore reconciliation and legacy migration stages explicit");
    assert(utilsSource.indexOf("IAPPackage.syncIAPPurchased") === -1
        && utilsSource.indexOf("IAPPackage.onIAPPaied") === -1,
        "utils purchase sync should delegate purchased unlock handling through PurchaseService");

    return {
        name: "load-chain",
        ok: true,
        detail: "validated jsList and module boundary markers, including purchase boundary delegation"
    };
}

module.exports = [
    runLoadChainSmoke
];
