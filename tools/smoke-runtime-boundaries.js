module.exports = require("./smoke/runtime-boundaries");

if (require.main === module) {
    module.exports.runCli();
}
