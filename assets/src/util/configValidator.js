/**
 * ConfigValidator validates role / talent / item / site / build content links against
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
    validateBuild: function (id) {
        return this.validate("build", id);
    },
    validateBuildAction: function (id) {
        return this.validate("build-action", id);
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
    validateBuilds: function (ids) {
        return this.validateMany("build", ids);
    },
    validateBuildActions: function (ids) {
        return this.validateMany("build-action", ids);
    },
    getChecklist: function (type, id) {
        var blueprint = ContentBlueprint.getBlueprint(type);
        if (!blueprint) {
            return { error: "未知类型: " + type };
        }

        var checklist = {
            type: type,
            id: id,
            items: []
        };

        blueprint.fields.forEach(function (field) {
            var status = false;
            try {
                status = !!field.validator(id);
            } catch (e) {
                status = false;
            }

            checklist.items.push({
                name: field.name,
                file: field.file,
                location: field.location ? field.location.replace("{id}", id) : "",
                required: field.required,
                template: field.template ? field.template.replace(/{id}/g, id) : "",
                status: status
            });
        });

        return checklist;
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
    printChecklist: function (type, id) {
        if (!this.isEnabled()) {
            return;
        }

        var checklist = this.getChecklist(type, id);
        if (checklist.error) {
            cc.error("[ConfigValidator] " + checklist.error);
            return;
        }

        cc.log("=== " + type + " " + id + " 配置清单 ===\n");

        var allComplete = true;
        checklist.items.forEach(function (item) {
            var status = item.status ? "✓" : "✗";
            var required = item.required ? "[必需]" : "[可选]";

            cc.log(status + " " + required + " " + item.name);
            cc.log("   文件: " + item.file);
            if (item.location) {
                cc.log("   位置: " + item.location);
            }
            if (item.template) {
                cc.log("   示例: " + item.template);
            }
            cc.log("");

            if (!item.status && item.required) {
                allComplete = false;
            }
        });

        if (allComplete) {
            cc.log("✓ 所有必需配置已完成\n");
        } else {
            cc.warn("✗ 还有必需配置项未完成\n");
        }
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
