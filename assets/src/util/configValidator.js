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
    warnIfInvalid: function (type, id, context) {
        if (!this.isEnabled()) {
            return true;
        }

        var result = this.validate(type, id);
        if (result.error || result.valid) {
            return !result.error;
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
        cc.w(prefix + " " + type + " " + id + " 配置不完整");
        result.errors.forEach(function (error) {
            cc.w("  - " + error);
        });
        result.warnings.forEach(function (warning) {
            cc.w("  - 可选: " + warning);
        });
        return false;
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
