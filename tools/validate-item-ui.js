const validator = require("./lib/validate-item-ui");

process.exit(validator.printResult(validator.validate(), console));
