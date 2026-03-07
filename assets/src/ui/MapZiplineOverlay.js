/**
 * Passive map overlay that only draws existing zipline links.
 */
var MapZiplineOverlay = cc.Node.extend({
    ctor: function (mapView) {
        this._super();
        this.mapView = mapView;
        this.setName("ziplineOverlay");
    },
    refresh: function (network, map, buildState) {
        this.removeAllChildren(true);

        if (!network || typeof network.listRenderableLinks !== "function") {
            return;
        }

        var drawNode = new cc.DrawNode();
        var links = network.listRenderableLinks(map);
        var lineColor = cc.color(216, 190, 72, 180);
        var dotColor = cc.color(244, 220, 126, 220);

        for (var i = 0; i < links.length; i++) {
            drawNode.drawSegment(links[i].startPos, links[i].endPos, 3, lineColor);
            drawNode.drawDot(links[i].startPos, 4, dotColor);
            drawNode.drawDot(links[i].endPos, 4, dotColor);
        }

        if (buildState && buildState.startEntityKey && map) {
            var startSite = map.getEntityByKey
                ? map.getEntityByKey(buildState.startEntityKey)
                : null;
            if (startSite && startSite.pos) {
                var selectedColor = buildState.mode === "remove"
                    ? cc.color(162, 32, 32, 220)
                    : cc.color(210, 78, 53, 220);
                drawNode.drawDot(startSite.pos, 7, selectedColor);
            }
        }

        this.addChild(drawNode);
    }
});
