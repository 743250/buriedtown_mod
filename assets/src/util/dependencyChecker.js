/**
 * 依赖检查工具（基于 ContentBlueprint）
 * 用途：生成配置清单，告诉用户需要配置什么
 *
 * 使用方式：
 * DependencyChecker.printChecklist("role", 9);
 *
 * 创建时间：2026-03-06
 */

var DependencyChecker = {
    DEV_MODE: true,

    /**
     * 生成配置清单
     * @param {string} type - 类型 (role/talent/item)
     * @param {number} id - ID
     * @returns {object} 配置清单
     */
    check: function(type, id) {
        var blueprint = ContentBlueprint.getBlueprint(type);
        if (!blueprint) {
            return { error: "未知类型: " + type };
        }

        var checklist = {
            type: type,
            id: id,
            items: []
        };

        blueprint.fields.forEach(function(field) {
            var status = field.validator(id);
            checklist.items.push({
                name: field.name,
                file: field.file,
                location: field.location.replace("{id}", id),
                required: field.required,
                template: field.template.replace(/{id}/g, id),
                status: status
            });
        });

        return checklist;
    },

    /**
     * 打印配置清单
     * @param {string} type - 类型
     * @param {number} id - ID
     */
    printChecklist: function(type, id) {
        if (!this.DEV_MODE) return;

        var checklist = this.check(type, id);
        if (checklist.error) {
            cc.error("[DependencyChecker] " + checklist.error);
            return;
        }

        cc.log("=== " + type + " " + id + " 配置清单 ===\n");

        var allComplete = true;
        checklist.items.forEach(function(item) {
            var status = item.status ? "✓" : "✗";
            var required = item.required ? "[必需]" : "[可选]";

            cc.log(status + " " + required + " " + item.name);
            cc.log("   文件: " + item.file);
            cc.log("   位置: " + item.location);
            cc.log("   示例: " + item.template);
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
    }
};
