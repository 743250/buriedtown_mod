module.exports = require("./smoke/startup");

if (require.main === module) {
    module.exports.runCli();
}
