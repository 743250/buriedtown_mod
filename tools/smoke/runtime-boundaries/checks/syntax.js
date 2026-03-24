const {
    readRepoFile: readFile
} = require("../../lib/core");

function runSyntaxSmoke() {
    const files = [
        "assets/src/data/playerConfig.js",
        "assets/src/data/playerAttrEffect.js",
        "assets/src/data/itemConfig.js",
        "assets/src/data/weatherConfig.js",
        "assets/src/game/record.js",
        "assets/src/game/GameRuntime.js",
        "assets/src/game/GameKernel.js",
        "assets/src/game/game.js",
        "assets/src/game/player.js",
        "assets/src/game/TravelService.js",
        "assets/src/game/Build.js",
        "assets/src/game/Storage.js",
        "assets/src/game/PlayerPersistenceService.js",
        "assets/src/game/RoleRuntimeService.js",
        "assets/src/game/TalentService.js",
        "assets/src/game/medal.js",
        "assets/src/game/IAPPackage.js",
        "assets/src/game/PurchaseService.js",
        "assets/src/game/WeaponCraftService.js",
        "assets/src/game/BuildActionEffectService.js",
        "assets/src/game/buildAction.js",
        "assets/src/game/Battle.js",
        "assets/src/game/site.js",
        "assets/src/game/ZiplineNetworkService.js",
        "assets/src/plugin/purchaseList.js",
        "assets/src/util/contentBlueprint.js",
        "assets/src/ui/PurchaseUiHelper.js",
        "assets/src/ui/ChooseScene.js",
        "assets/src/ui/MedalSceneView.js",
        "assets/src/ui/topFrame.js",
        "assets/src/ui/home.js",
        "assets/src/ui/deathNode.js",
        "assets/src/ui/uiUtil.js",
        "assets/src/ui/MapActor.js",
        "assets/src/ui/MapInteractionController.js",
        "assets/src/ui/dialog.js",
        "assets/src/ui/battleAndWorkNode.js"
    ];

    files.forEach(function (relativePath) {
        new Function(readFile(relativePath));
    });

    return {
        name: "syntax",
        ok: true,
        detail: "compiled " + files.length + " files"
    };
}

module.exports = [
    runSyntaxSmoke
];
