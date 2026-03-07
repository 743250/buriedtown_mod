/**
 * Created by lancelot on 15/7/10.
 */
var Weather = {
    CLOUDY: 0,
    SUNSHINY: 1,
    RAIN: 2,
    SNOW: 3,
    FOG: 4
};
var WeatherSystem = cc.Class.extend({
    ctor: function () {
        this.weatherId = Weather.CLOUDY;
        this.lastDays = 0;

        this.changeWeather(this.weatherId);
    },
    save: function () {
        var saveObj = {};
        saveObj.weatherId = this.weatherId;
        saveObj.lastDays = this.lastDays;
        return saveObj;
    },
    restore: function (saveObj) {
        if (saveObj) {
            this.weatherId = saveObj.weatherId;
            this.lastDays = saveObj.lastDays;

            this.changeWeather(this.weatherId);
        }
    },
    checkWeather: function () {
        if (this.weatherId == Weather.CLOUDY) {
            var season = cc.timer.getSeason();
            var randomWeather = weatherSystemConfig[season];
            var weatherInfo = utils.getRoundRandom(randomWeather);
            cc.d("check weather " + weatherInfo.weatherId);
            this.changeWeather(weatherInfo.weatherId, true);
        } else {
            this.lastDays++;
            if (this.lastDays >= this.weatherConfig.lastDays) {
                this.changeWeather(Weather.CLOUDY, true);
            }
        }
    },
    changeWeather: function (weatherId, sendLog) {
        this.weatherId = weatherId;
        this.weatherConfig = weatherConfig[this.weatherId];
        this.lastDays = 0;
        cc.d("change weather " + this.weatherId);
        utils.emitter.emit("weather_change", weatherId);

        if (sendLog) {
            player.log.addMsg(stringUtil.getString(3015)[this.weatherId]);
        }
    },
    getValue: function (key) {
        if (this.weatherConfig[key]) {
            return this.weatherConfig[key];
        } else {
            return 0;
        }
    },
    getWeatherName: function () {
        return stringUtil.getString(3014)[this.weatherId];
    }

});
