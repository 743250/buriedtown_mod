/**
 * Centralizes zipline build/remove side effects so UI controllers only handle
 * presentation and user feedback.
 */
var ZiplineActionService = {
    getBuildCost: function (roleType) {
        return RoleRuntimeService.getZiplineBuildCost
            ? RoleRuntimeService.getZiplineBuildCost(roleType)
            : [];
    },
    getRefundCost: function (roleType) {
        return RoleRuntimeService.getZiplineRefundCost
            ? RoleRuntimeService.getZiplineRefundCost(roleType)
            : [];
    },
    canFitItemsInBag: function (itemList) {
        var tempBag = player.bag.clone();
        for (var i = 0; i < itemList.length; i++) {
            var itemInfo = itemList[i];
            if (!tempBag.validateItemWeight(itemInfo.itemId, itemInfo.num)) {
                return false;
            }
            tempBag.increaseItem(itemInfo.itemId, itemInfo.num);
        }
        return true;
    },
    applyBuildCost: function (buildCost) {
        if (!buildCost.length) {
            return;
        }

        player.costItemsInBag(buildCost);
        if (typeof Achievement !== "undefined" && Achievement && typeof Achievement.checkCost === "function") {
            buildCost.forEach(function (itemInfo) {
                Achievement.checkCost(itemInfo.itemId, itemInfo.num);
            });
        }
    },
    grantRefundItems: function (refundTargetEntity, refundItems) {
        refundItems = utils.clone(refundItems || []);
        if (!refundItems.length) {
            return "none";
        }

        if (this.canFitItemsInBag(refundItems)) {
            player.gainItemsInBag(refundItems);
            return "bag";
        }

        if (refundTargetEntity && typeof refundTargetEntity.increaseItem === "function") {
            refundItems.forEach(function (itemInfo) {
                refundTargetEntity.increaseItem(itemInfo.itemId, itemInfo.num);
            });
            return "storage";
        }

        return "none";
    },
    createLink: function (startEntityRef, endEntityRef, map) {
        var buildCost = this.getBuildCost(player.roleType);
        if (buildCost.length > 0 && !player.validateItemsInBag(buildCost)) {
            return {
                ok: false,
                reason: "missing-cost",
                buildCost: buildCost
            };
        }

        var result = player.ziplineNetwork.createLink(startEntityRef, endEntityRef, map);
        if (!result.ok) {
            return result;
        }

        this.applyBuildCost(buildCost);
        return {
            ok: true,
            link: result.link,
            buildCost: buildCost
        };
    },
    createHomeLink: function (entityRef, map) {
        return this.createLink(HOME_SITE, entityRef, map);
    },
    removeLink: function (startEntityRef, endEntityRef, map, refundTargetEntity) {
        var result = player.ziplineNetwork.removeLinkBetween(startEntityRef, endEntityRef, map);
        if (!result.ok) {
            return result;
        }

        var refundItems = this.getRefundCost(player.roleType);
        return {
            ok: true,
            link: result.link,
            refundItems: refundItems,
            refundTarget: this.grantRefundItems(refundTargetEntity, refundItems)
        };
    },
    removeHomeLink: function (entityRef, map, refundTargetEntity) {
        return this.removeLink(HOME_SITE, entityRef, map, refundTargetEntity);
    }
};
