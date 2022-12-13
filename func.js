/**
 * 秒のデータを文字列として置き換えます。
 * @param seconds - 秒数を入力します。
 * @returns - 時間、分、秒が組み合わさった文字列を出力します。
 */
export const timeString = async seconds => {
    let minutes = 0, hour = 0, timeset = "";
    for (minutes; seconds > 59; minutes++) seconds -= 60;
    for (hour; minutes > 59; hour++) minutes -= 60;
    if (hour != 0) timeset += hour + "時間";
    if (minutes != 0) timeset += minutes + "分";
    if (seconds != 0) timeset += seconds + "秒";
    return timeset;
};
/**
 * 初期化します。
 * ```js
 * init = i => { if (!i) = {}; };
 * ```
 */
export const init = i => { if (!i) i = {}; };
/**
 * jsonデータを入力をもとにコピーを作成する
 * @param {*} j jsonデータを入力
 * @returns んで出力
 */
export const jsonRebuild = j => { return JSON.parse(JSON.stringify(j)); };
/**
 * EmbedBuilderを関数化した
 * @param {string} content 
 * @param {{user: string, url: string, data: {}}} data 
 * @returns 
 */
export const videoembed = async (content, data) => {
    const outdata = {};
    outdata.content = content;
    if (data) {
        const { EmbedBuilder } = require("discord.js");
        const user = (await client.users.fetch(data.user));
        const embed = new EmbedBuilder()
            .setTitle("**" + data.data.title + "**")
            .setDescription("再生時間: " + (await timeString(data.data.lengthSeconds)))
            .setAuthor({ name: user.username, iconURL: user.avatarURL() })
            .setURL("https://youtu.be/" + data.url)
            .setThumbnail("https://i.ytimg.com/vi/" + data.url + "/hqdefault.jpg");
        outdata.embeds = [embed];
    };
    return outdata;
};
/**
 * data-serverからmusic_botのjsonデータを取得する
 */
export const jsonload = () => {
    return new Promise((resolve, reject) => {
        const req = require("http").request("http://localhost", {
            port: 3000,
            method: "post",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        req.on("response", res => {
            let data = "";
            res.on("data", chunk => { data += chunk; });
            res.on("end", () => { resolve(JSON.parse(data)); });
        });
        req.write(JSON.stringify(["music_bot"]));
        req.on("error", reject);
        req.end();
    });
};
/**
 * data-serverにmusic_botのjsonデータを格納する
 * @param {*} j 
 */
export const savejson = async j => {
    return new Promise((resolve, reject) => {
        const req = require("http").request("http://localhost", {
            port: 3000,
            method: "post",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        req.on("response", resolve);
        req.write(JSON.stringify(["music_bot", j]));
        req.on("error", reject);
        req.end();
    });
};