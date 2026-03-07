/**
 * Created by lancelot on 15/3/12.
 */

var gameCenter = {
    isGameCenterAvailable: function () {
        return jsb.reflection.callStaticMethod("GameCenter", "isGameCenterAvailable");
    },

    authenticateLocalPlayer: function () {
        jsb.reflection.callStaticMethod("GameCenter", "authenticateLocalPlayer");
    },
    initAccountID:function(){
      // Keep local account id without forcing Google Play Games profile flow.
      var playerId = cc.sys.localStorage.getItem("AccountId");
      if (!playerId) {
          playerId = Record.getUUID();
          cc.sys.localStorage.setItem("AccountId", playerId);
      }
      cc.log("player id is " + playerId);
    },
    authenticateLocalPlayerCallback: function (result, playerId) {
        if (result == 1) {
            this.getAchievements();
            cc.sys.localStorage.setItem("AccountId", playerId);
        }
    },

    reportAchievement: function (id, percent) {
        if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod("GameCenter", "reportAchievementIdentifier:percentComplete:", id, percent);
        } else if (cc.sys.os == cc.sys.OS_ANDROID) {
            jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/GooglePlayPlugin", "reportAchievement", "(Ljava/lang/String;)V", id);
            this.achievements[id].completed = 1;
        }
    },
    reportAchievementCallback: function (result, id, percent) {
        if (result == 1) {
            this.achievements[id].completed = 1;
        }
    },

    showAchievements: function () {
        if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod("GameCenter", "showAchievements");
        } else if (cc.sys.os == cc.sys.OS_ANDROID) {
            jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/GooglePlayPlugin", "showAchievements", "()V");
        }
    },

    achievements: {
        bt_season_1: {name: "大约在冬季", des: "活过秋天", completed: 0, percent: 0},
        bt_season_2: {name: "我在春天等你们", des: "活过冬天", completed: 0, percent: 0},
        bt_season_3: {name: "夏日寒风", des: "活过春天", completed: 0, percent: 0},
        bt_season_4: {name: "秋意浓", des: "活过夏天", completed: 0, percent: 0},
        bt_produce_1: {name: "农夫", des: "生产50个土豆", completed: 0, percent: 0},
        bt_produce_2: {name: "猎人", des: "生产25块肉", completed: 0, percent: 0},
        bt_produce_3: {name: "鱼", des: "生产100个水", completed: 0, percent: 0},
        bt_produce_4: {name: "酒鬼", des: "生产15瓶酒", completed: 0, percent: 0},
        bt_make_1: {name: "这是战争！", des: "制作出AK47", completed: 0, percent: 0},
        bt_make_2: {name: "龟缩战术", des: "制作出防爆服", completed: 0, percent: 0},
        bt_make_3: {name: "军需官", des: "制作出军用背包", completed: 0, percent: 0},
        bt_make_4: {name: "忍者", des: "制作出武士刀", completed: 0, percent: 0},
        bt_npc_1: {name: "老罗，你好！", des: "解锁老罗", completed: 0, percent: 0},
        bt_npc_2: {name: "老罗，你真好！", des: "老罗亲密度100%", completed: 0, percent: 0},
        bt_npc_3: {name: "杰夫，你好！", des: "解锁杰夫", completed: 0, percent: 0},
        bt_npc_4: {name: "杰夫，你真好！", des: "杰夫亲密度100%", completed: 0, percent: 0},
        bt_npc_5: {name: "金，你好！", des: "解锁金医生", completed: 0, percent: 0},
        bt_npc_6: {name: "金，你真好！", des: "金医生亲密度100%", completed: 0, percent: 0},
        bt_npc_7: {name: "雅子，你好！", des: "解锁雅子", completed: 0, percent: 0},
        bt_npc_8: {name: "雅子，你真好！", des: "雅子亲密度100%", completed: 0, percent: 0},
        bt_item_1: {name: "呯！", des: "得到Magnum", completed: 0, percent: 0},
        bt_item_2: {name: "duang！", des: "得到M40", completed: 0, percent: 0},
        bt_item_3: {name: "哒哒哒！", des: "得到FAMAS", completed: 0, percent: 0},
        bt_item_4: {name: "恐怖片迷", des: "得到电锯", completed: 0, percent: 0},
        bt_item_5: {name: "奇思妙想", des: "得到僵尸诱饵", completed: 0, percent: 0},
        bt_item_6: {name: "危险分子", des: "得到自制炸弹", completed: 0, percent: 0},
        bt_cost_1: {name: "小激动", des: "消耗50咖啡", completed: 0, percent: 0},
        bt_cost_2: {name: "小兴奋", des: "消耗100咖啡", completed: 0, percent: 0},
        bt_cost_3: {name: "起来嗨！", des: "消耗150咖啡", completed: 0, percent: 0},
    },

    getAchievements: function () {
        if (cc.sys.os == cc.sys.OS_IOS) {
            jsb.reflection.callStaticMethod("GameCenter", "getAchievements");
        } else if (cc.sys.os == cc.sys.OS_ANDROID) {
            jsb.reflection.callStaticMethod("net/dice7/pay/googleplay/GooglePlayPlugin", "getAchievements", "()V");
        }
    },
    getAchievementsCallback: function (result) {
        var self = this;
        var array = result.split('|');
        array.forEach(function (r) {
            if (r.indexOf(',') != -1) {
                var rArray = r.split(',');
                var a = self.achievements[rArray[2]];
                a.completed = rArray[0];
                a.percent = rArray[1];
            }
        });
    },

    getAchievementsCallback_android: function (result) {
        cc.v(JSON.stringify(result));
        var self = this;
        if (result.statusCode == 200) {
            var array = result.data;
            array.forEach(function (r) {
                var a = self.achievements[r.gcId];
                a.completed = r.completed;
                a.percent = 99.9;
            });
        }
    },

    reportAllAchievement: function () {
        if (sys.platform == sys.IPAD || sys.platform == sys.IPHONE) {
            for (var id in this.achievements) {
                var a = this.achievements[id];
                if (a.completed != 1 && player.inventory[a.name] >= a.value) {
                    this.reportAchievement(id, 100);
                }
            }
        }
    }
}
