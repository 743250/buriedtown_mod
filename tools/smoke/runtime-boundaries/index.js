const {
    runSmokeSuite,
    runSmokeSuiteCli
} = require("../lib/core");

const CHECKS = []
    .concat(require("./checks/syntax"))
    .concat(require("./checks/runtime-core"))
    .concat(require("./checks/role-rules"))
    .concat(require("./checks/time-site"))
    .concat(require("./checks/battle-build"))
    .concat(require("./checks/medal-aggregation"))
    .concat(require("./checks/purchase-persistence"))
    .concat(require("./checks/load-chain"));

function runChecks() {
    return runSmokeSuite(CHECKS);
}

function runCli() {
    return runSmokeSuiteCli({
        successTitle: "Smoke checks passed",
        failureTitle: "Smoke checks failed",
        checks: CHECKS
    });
}

module.exports = {
    runChecks: runChecks,
    runCli: runCli
};

if (require.main === module) {
    runCli();
}
