/**
 * Created by lancelot on 15/12/10.
 */

var paramManager = {
    _map: {
        moregame: false,
        adType: 3
    },
    init: function (cb) {
        cc.log('paramManager init ');
        var self = this;
        networkUtil.requestData("getConfig", {}, this, function (res) {
            if (res.statusCode == 200) {
                cc.log(JSON.stringify(res));
                var data = res.data;
                for (var key in self._map) {
                    var newValue = data[key];
                    if (newValue != undefined && newValue != null) {
                        self._map[key] = newValue;
                    }
                }
                self.save();
            }
            if (cb) {
                cb();
            }
        });
        this.restore();
    },
    save: function () {
        cc.sys.localStorage.setItem('param', JSON.stringify(this._map));
        cc.log('paramManager save ' + JSON.stringify(this._map));
    },
    restore: function () {
        var storageInfo = cc.sys.localStorage.getItem('param');
        if (storageInfo) {
            this._map = SafetyHelper.safeJSONParse(storageInfo, null, "paramManager.restore");
            if (!this._map) {
                this._map = {
                    moregame: false,
                    adType: 3
                };
            }
        }
        cc.log('paramManager restore ' + JSON.stringify(this._map));
    },
    isMoreGame: function () {
        return this._map.moregame;
    },
    getAdType: function () {
        return this._map.adType;
    }
};
