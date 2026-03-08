/**
 * ConfigValidator validates role / talent / item content links against
 * ContentBlueprint and reports missing pieces once per content id.
 */
var ConfigValidator = {
    DEV_MODE: true,
    _warnedKeys: {},
    isEnabled: function () {
        if (typeof EnvironmentConfig !== "undefined"
            && EnvironmentConfig
            && typeof EnvironmentConfig.isContentValidationEnabled === "function") {
            return !!EnvironmentConfig.isContentValidationEnabled();
        }
        return !!this.DEV_MODE;
    },
    validate: function (type, id) {
        var blueprint = ContentBlueprint.getBlueprint(type);
        if (!blueprint) {
            return {error: "未知类型: " + type};
        }

        var result = {
            type: type,
            id: id,
            valid: true,
            errors: [],
            warnings: []
        };

        blueprint.fields.forEach(function (field) {
            var status = false;
            try {
                status = !!field.validator(id);
            } catch (e) {
                status = false;
            }

            if (!status && field.required) {
                result.valid = false;
                result.errors.push(field.name + " - " + field.file);
            } else if (!status && !field.required) {
                result.warnings.push(field.name + " - " + field.file);
            }
        });

        return result;
    },
    validateRole: function (id) {
        return this.validate("role", id);
    },
    validateTalent: function (id) {
        return this.validate("talent", id);
    },
    validateItem: function (id) {
        return this.validate("item", id);
    },
    validateSite: function (id) {
        return this.validate("site", id);
    },
    validateMany: function (type, ids) {
        var self = this;
        var normalizedIds = Array.isArray(ids) ? ids : [];
        var results = normalizedIds.map(function (id) {
            return self.validate(type, id);
        });

        return this.buildReport(type, results);
    },
    validateRoles: function (ids) {
        return this.validateMany("role", ids);
    },
    validateTalents: function (ids) {
        return this.validateMany("talent", ids);
    },
    validateItems: function (ids) {
        return this.validateMany("item", ids);
    },
    validateSites: function (ids) {
        return this.validateMany("site", ids);
    },
    buildReport: function (type, results) {
        var report = {
            type: type || "",
            total: 0,
            validCount: 0,
            invalidCount: 0,
            warningCount: 0,
            errorCount: 0,
            results: Array.isArray(results) ? results : []
        };

        report.total = report.results.length;
        report.results.forEach(function (result) {
            if (!result || result.error) {
                report.invalidCount += 1;
                report.errorCount += 1;
                return;
            }
            if (result.valid) {
                report.validCount += 1;
            } else {
                report.invalidCount += 1;
            }
            report.warningCount += (result.warnings || []).length;
            report.errorCount += (result.errors || []).length;
        });

        return report;
    },
    printReport: function (report) {
        if (!report) {
            cc.warn("[ConfigValidator] report is empty");
            return;
        }

        cc.log("[ConfigValidator] report type=" + report.type
            + " total=" + report.total
            + " valid=" + report.validCount
            + " invalid=" + report.invalidCount
            + " warnings=" + report.warningCount
            + " errors=" + report.errorCount);

        report.results.forEach(function (result) {
            if (!result) {
                return;
            }

            if (result.error) {
                cc.warn("[ConfigValidator] " + report.type + " " + result.id + " failed: " + result.error);
                return;
            }

            if (result.valid && (!result.warnings || result.warnings.length === 0)) {
                return;
            }

            var status = result.valid ? "WARN" : "INVALID";
            cc.warn("[ConfigValidator][" + status + "] " + report.type + " " + result.id);
            (result.errors || []).forEach(function (error) {
                cc.warn("  - " + error);
            });
            (result.warnings || []).forEach(function (warning) {
                cc.warn("  - warning: " + warning);
            });
        });
    },
    warnIfInvalid: function (type, id, context) {
        if (!this.isEnabled()) {
            return true;
        }

        var result = this.validate(type, id);
        if (result.error) {
            return !result.error;
        }
        if (result.valid && (!result.warnings || result.warnings.length === 0)) {
            return true;
        }

        var warnKey = [type, id].join(":");
        if (this._warnedKeys[warnKey]) {
            return false;
        }
        this._warnedKeys[warnKey] = true;

        var prefix = "[ConfigValidator]";
        if (context) {
            prefix += "[" + context + "]";
        }
        cc.w(prefix + " " + type + " " + id + (result.valid ? " 配置存在提醒" : " 配置不完整"));
        result.errors.forEach(function (error) {
            cc.w("  - " + error);
        });
        result.warnings.forEach(function (warning) {
            cc.w("  - 可选: " + warning);
        });
        return result.valid;
    },
    printResult: function (type, id) {
        if (!this.isEnabled()) {
            return;
        }

        var result = this.validate(type, id);
        if (result.error) {
            cc.error("[ConfigValidator] " + result.error);
            return;
        }

        var prefix = "[ConfigValidator] " + type + " " + id;
        if (result.valid) {
            cc.log(prefix + " ✓ 配置完整");
        } else {
            cc.warn(prefix + " ✗ 配置不完整");
            result.errors.forEach(function (error) {
                cc.warn("  - " + error);
            });
        }

        result.warnings.forEach(function (warning) {
            cc.warn("  - 可选: " + warning);
        });
    }
};
