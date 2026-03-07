/**
 * 配置校验器（基于 ContentBlueprint）
 * 用途：校验配置是否完整、正确
 *
 * 使用方式：
 * ConfigValidator.validate("role", 9);
 *
 * 创建时间：2026-03-06
 */

var ConfigValidator = {
    DEV_MODE: true,

    /**
     * 校验配置
     * @param {string} type - 类型 (role/talent/item)
     * @param {number} id - ID
     * @returns {object} 校验结果
     */
    validate: function(type, id) {
        var blueprint = ContentBlueprint.getBlueprint(type);
        if (!blueprint) {
            return { error: "未知类型: " + type };
        }

        var result = {
            type: type,
            id: id,
            valid: true,
            errors: [],
            warnings: []
        };

        blueprint.fields.forEach(function(field) {
            var status = field.validator(id);

            if (!status && field.required) {
                result.valid = false;
                result.errors.push(field.name + " - " + field.file);
            } else if (!status && !field.required) {
                result.warnings.push(field.name + " - " + field.file);
            }
        });

        return result;
    },

    /**
     * 打印校验结果
     * @param {string} type - 类型
     * @param {number} id - ID
     */
    printResult: function(type, id) {
        if (!this.DEV_MODE) return;

        var result = this.validate(type, id);
        if (result.error) {
            cc.error("[ConfigValidator] " + result.error);
            return;
        }

        var prefix = "[ConfigValidator] " + type + " " + id;

        if (result.valid) {
            cc.log(prefix + " ✓ 配置完整\n");
        } else {
            cc.warn(prefix + " ✗ 配置不完整");
            cc.warn("缺失项:");
            result.errors.forEach(function(error) {
                cc.warn("  - " + error);
            });
            cc.warn("");
        }

        if (result.warnings.length > 0) {
            cc.warn("警告（可选项）:");
            result.warnings.forEach(function(warning) {
                cc.warn("  - " + warning);
            });
            cc.warn("");
        }
    }
};
