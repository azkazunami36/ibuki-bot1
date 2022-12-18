/**
 * 秒のデータを文字列として置き換えます。
 * @param seconds - 秒数を入力します。
 * @returns - 時間、分、秒が組み合わさった文字列を出力します。
 */
const timeString = async seconds => {
    let minutes = 0, hour = 0, timeset = "";
    for (minutes; seconds > 59; minutes++) seconds -= 60;
    for (hour; minutes > 59; hour++) minutes -= 60;
    if (hour != 0) timeset += hour + "時間";
    if (minutes != 0) timeset += minutes + "分";
    if (seconds != 0) timeset += seconds + "秒";
    return timeset;
};
/**
 * jsonデータを入力をもとにコピーを作成する
 * @param {*} j jsonデータを入力
 * @returns んで出力
 */
const jsonRebuild = j => { return JSON.parse(JSON.stringify(j)); };
/**
 * data-serverからmusic_botのjsonデータを取得する
 */
const jsonload = () => {
    return new Promise((resolve, reject) => {
        const req = require("http").request("http://localhost", {
            port: 3000,
            method: "post",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        req.on("response", res => {
            let data = "";
            res.on("data", chunk => { data += chunk; });
            res.on("end", () => { resolve(data); });
        });
        req.write(JSON.stringify(["music_botv2"]));
        req.on("error", reject);
        req.end();
    });
};
/**
 * data-serverにmusic_botのjsonデータを格納する
 * @param {*} j 
 */
const savejson = async j => {
    return new Promise((resolve, reject) => {
        const req = require("http").request("http://localhost", {
            port: 3000,
            method: "post",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        req.on("response", resolve);
        req.write(JSON.stringify(["music_botv2", j]));
        req.on("error", reject);
        req.end();
    });
};

module.exports = {
    timeString,
    jsonRebuild,
    jsonload,
    savejson
};