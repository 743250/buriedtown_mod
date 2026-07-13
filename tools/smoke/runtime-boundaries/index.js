const {
    runSmokeSuite,
    runSmokeSuiteCli
} = require("../lib/core");

const CHECKS = []
    .concat(require("./checks/syntax"))
    .concat(require("./checks/runtime-core"))
    .concat(require("./checks/role-rules"))
    .concat(require("./checks/time-site"))
    .concat(require("./checks/npc-economy-broadcast"))
    .concat(require("./checks/npc-economy-persist"))
    .concat(require("./checks/npc-economy-radio-ui"))
    .concat(require("./checks/npc-economy-core"))
    .concat(require("./checks/npc-economy-morning"))
    .concat(require("./checks/battle-build"))
    .concat(require("./checks/role-rest"))
    .concat(require("./checks/medal-aggregation"))
    .concat(require("./checks/purchase-core"))
    .concat(require("./checks/role-talent-ui"))
    .concat(require("./checks/player-persistence"))
    .concat(require("./checks/load-chain"));

function runChecks() {
    return runSmokeSuite(CHECKS);
}

function runCli(options) {
    options = options || {};
    return runSmokeSuiteCli({
        successTitle: "Smoke checks passed",
        failureTitle: "Smoke checks failed",
        checks: CHECKS,
        grep: options.grep,
        continueOnFail: options.continueOnFail
    });
}

module.exports = {
    runChecks: runChecks,
    runCli: runCli
};

if (require.main === module) {
    runCli();
}
