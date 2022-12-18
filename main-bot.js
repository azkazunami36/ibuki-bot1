const { Client, GatewayIntentBits, Partials, Events, EmbedBuilder } = require("discord.js");
const { entersState, createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, AudioPlayerStatus } = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const fs = require("fs");
require("dotenv").config();
const client = new Client({
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.GuildScheduledEvent,
    Partials.Message,
    Partials.Reaction,
    Partials.ThreadMember,
    Partials.User
  ],
  intents: [
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent
  ]
});
const botStatusSet = async () => {
  client.user.setPresence({
    activities: [{
      name: Object.keys(clientdata.ytdt).length + "曲キャッシュ済みっ"
    }],
    status: "online"
  });
};
/**
 * EmbedBuilderを関数化した
 * @param {string} content 
 * @param {{user: string, url: string}} data 
 * @returns 
 */
const videoembed = async (content, data) => {
  const outdata = {};
  outdata.content = content;
  if (data) {
    const { EmbedBuilder } = require("discord.js");
    const user = (await client.users.fetch(data.user));
    const embed = new EmbedBuilder()
      .setTitle("**" + clientdata.ytdt[data.url].title + "**")
      .setDescription("再生時間: " + (await timeString(clientdata.ytdt[data.url].lengthSeconds)))
      .setAuthor({ name: user.username, iconURL: user.avatarURL() })
      .setURL("https://youtu.be/" + data.url)
      .setThumbnail("https://i.ytimg.com/vi/" + data.url + "/hqdefault.jpg");
    outdata.embeds = [embed];
  };
  return outdata;
};
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
* @param {*} j 格納するjsonを入力
*/
const savejson = async (j, name) => {
  return new Promise((resolve, reject) => {
    const req = require("http").request("http://localhost", {
      port: 3000,
      method: "post",
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
    req.on("response", resolve);
    req.write(JSON.stringify([name, j]));
    req.on("error", reject);
    req.end();
  });
};
let clientdata;
jsonload().then(data => clientdata = JSON.parse(data));
const temp = {};
const prefix = "voice!";
client.on(Events.ClientReady, async () => {
  console.log("準備おっけい！");
  clientdata.cacheis = true;
});
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (message.content.startsWith(prefix)) {
    const content = message.content;
    const guildid = message.guild.id;
    const channelid = message.member.voice.channel.id;
    const userid = message.author.id;
    const voiceAdapterCreator = message.guild.voiceAdapterCreator;
    const command = content.split(" ")[0].split("!")[1];
    const subcontent = content.split(" ")[1];
    if (channelid == "null" || !channelid) return message.reply({
      content: "ボイスチャットに参加していないようです...\n" +
        "僕のbotはボイスチャットに参加しないと何もできない仕様なので、ご了承くださいm_ _m"
    });
    console.log({
      content: content,
      guildid: guildid,
      guildname: message.guild.name,
      channelid: channelid,
      channelname: message.channel.name,
      userid: userid,
      username: message.author.username,
      command: command,
      subcontent: subcontent
    });
    if (!temp[guildid]) temp[guildid] = {};
    const server = temp[guildid];
    if (!clientdata.glist) clientdata.glist = {};
    if (!clientdata.ytdt) clientdata.ytdt = {};
    if (!clientdata.glist[guildid]) clientdata.glist[guildid] = {};
    const guilddata = clientdata.glist[guildid];
    if (!guilddata.chlist) guilddata.chlist = {};
    if (!guilddata.chlist[channelid]) guilddata.chlist[channelid] = {};
    const channeldata = guilddata.chlist[channelid];
    if (!channeldata.plist) channeldata.plist = [];
    if (!channeldata.playing) channeldata.playing = 0;
    if (!channeldata.volume) channeldata.volume = 50;
    const plist = channeldata.plist;
    client.channels.fetch(channelid)
      .then(channel => channeldata.chname = channel.name);
    switch (command) {
      case "add": {
        if (!subcontent)
          return message.reply({
            content: "URLを指定しましょう...\n`" + config.prefix + "add [URL]`"
          });
        if (!ytdl.validateURL(subcontent) && !ytdl.validateID(subcontent))
          return message.reply({
            content: "送られたものがYouTube用のURLではないみたいです...\n" + "内容: " + subcontent
          });
        let tmp = subcontent;
        if (ytdl.validateURL(tmp)) tmp = ytdl.getURLVideoID(tmp);
        const videoid = tmp;
        if (!clientdata.ytdt[videoid])
          await ytdl.getInfo(videoid)
            .then(info => clientdata.ytdt[videoid] = info.videoDetails);
        const data = { url: videoid, user: userid };
        plist.push(data);
        console.log("プレイリストに" + clientdata.ytdt[data.url].title + "が追加されました。");
        botStatusSet();
        if (clientdata.cacheis) {
          if (!fs.existsSync("ytaudio")) fs.mkdirSync("ytaudio");
          if (!fs.existsSync("ytaudio/" + videoid + ".mp3"))
            await new Promise(resolve => {
              const download = ytdl(videoid, { filter: "audioonly", quality: "highest" });
              download.on("end", resolve);
              download.pipe(fs.createWriteStream("ytaudio/" + videoid + ".mp3"));
            });
        };
        message.reply(await videoembed("再生リストに追加しました！", data));
        break;
      }
      case "play": {
        if (server.playing == channelid)
          return message.reply({
            content: "既にそのボイスチャットで再生しています..."
          });
        if (server.playing)
          return message.reply({
            content: "既に他のボイスチャットで再生しています..."
          });
        if (!plist[0]) return message.reply({
          content: "再生リストが空です...`" + prefix + "add [URL]`を使用して追加してくださいっ"
        });
        server.connection = joinVoiceChannel({ //接続
          guildId: guildid,
          channelId: channelid,
          adapterCreator: voiceAdapterCreator,
          selfDeaf: true
        });
        ytplay(guildid, channelid);
        message.reply(
          await videoembed("再生を始めます！: " + (channeldata.playing + 1) + "曲目",
            channeldata.plist[channeldata.playing]
          ));
        break;
      }
      case "stop": {
        if (server.playing != channelid) return message.reply({ content: "現在音楽を再生していません..." });
        musicstop();
        message.reply(await videoembed("再生を停止しました！"));
        break;
      }
      case "skip": {
        if (server.playing != channelid) return message.reply({ content: "現在音楽を再生していません..." });
        if (!plist[0]) return message.reply({
          content: "再生リストが空です...`" + prefix + "add [URL]`を使用して追加してくださいっ"
        });
        ytplay(guildid, channelid);
        message.reply(
          await videoembed("次の曲の再生を始めます！: " + channeldata.playing + "曲目",
            channeldata.plist[channeldata.playing])
        );
        break;
      }
      case "volume": {
        let volume = Number(subcontent);
        if (volume == NaN) return message.reply(await videoembed("`" + volume + "`が理解できませんでした..."));
        if (volume < 0) {
          volume = 0;
        } else if (volume > 100) {
          volume = 100;
        };
        if (server.playing == channelid) server.resource.volume.volume = volume / 100;
        channeldata.volume = volume;
        console.log("音量が" + volume + "%になりました。")
        message.reply(await videoembed("音量を" + volume + "%にしました！"));
        break;
      }
      case "repeat": {
        const pattern = {
          "off": 0,
          "repeat": 1,
          "one-repeat": 2,
          "0": 0,
          "1": 1,
          "2": 2
        };
        channeldata.repeat = pattern[subcontent] || 0;
        let repeat = "";
        switch (channeldata.repeat) {
          case 0: repeat = "オフ"; break;
          case 1: repeat = "リピート"; break;
          case 2: repeat = "１曲リピート"; break;
        };
        message.reply(await videoembed("リピート状態を**" + repeat + "**に変更しました！"));
        break;
      }
      case "remove": {
        if (!plist[0]) return message.reply({ content: "再生リストが空です...`" + config.prefix + "add [URL]`を使用して追加してくださいっ" }); //再生リストがない場合
        const number = Number(subcontent);
        if (number > plist.length || number < 0) return message.reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
        if (number == 0) {
          plist.splice(0);
          message.reply(await videoembed("全ての曲を削除しました！"));
        } else if (number != 0) {
          let data = jsonRebuild(plist[number - 1]);
          plist.splice((number - 1), 1);
          message.reply(await videoembed("削除しました～", data));
        } else if (!number) {
          let data = jsonRebuild(plist[channeldata.playing]);
          plist.splice((channeldata.playing), 1);
          message.reply(await videoembed("削除しました～", data));
        };
        break;
      }
      case "list": {
        if (!plist[0]) return message.reply({ content: "再生リストが空です...`" + config.prefix + "add [URL]`を使用して追加してくださいっ" }); //再生リストがない場合
        const number = Number(subcontent);
        if (number > plist.length || number < 0) return message.reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
        const data = jsonRebuild(plist[number - 1]);
        message.reply(await videoembed("その番号にはこの曲が入っています！", data));
        break;
      }
    };
    savejson(clientdata, "music_botv2");
  };
});
const ytplay = async (guildid, voiceid) => {
  const server = temp[guildid];
  const guilddata = clientdata.glist[guildid];
  const channeldata = guilddata.chlist[voiceid];
  const plist = channeldata.plist;
  server.playing = voiceid;
  while (server.playing) {
    if (plist[0]) {
      if (channeldata.repeat == 1) console.log("1曲リピートのため、トラック番号は同じままになります。");
      if (plist.length == channeldata.playing) {
        channeldata.playing = 0;
        console.log("リピートにより数字が0に戻されました。");
        if (channeldata.repeat == 0) {
          musicstop();
          break;
        };
      };
    } else musicstop();
    savejson(clientdata, "music_botv2");
    if (clientdata.cacheis) {
      if (!fs.existsSync("ytaudio/" + plist[channeldata.playing].url + ".mp3")) continue;
      server.ytstream = "ytaudio/" + plist[channeldata.playing].url + ".mp3"; //ファイルパスを取得
    } else {
      try {
        server.ytstream = ytdl(channeldata.playing.url, {  //ytdlでリアルタイムダウンロード
          filter: format => format.audioCodec === "opus" && format.container === "webm", //取り出すデータ
          quality: "highest", //品質
          highWaterMark: 32 * 1024 * 1024, //メモリキャッシュする量 
        });
      } catch (e) {
        console.error(e);
        console.log("ytdlの処理中にエラーが発生しました。エラー内容をあんこかずなみ36#5008にお送りください。");
        console.log("ストリーム終了処理をします。この処理でまたエラーが発生する場合がありますが、そのエラー内容も同時に添付してください。");
        server.playing = null;
        server.ytstream.destroy();
        break;
      };
    };
    try {
      const player = createAudioPlayer();
      server.connection.subscribe(player);
      server.resource = createAudioResource(server.ytstream, { inputType: StreamType.WebmOpus, inlineVolume: true });
      server.resource.volume.setVolume(channeldata.volume / 100);
      player.play(server.resource);
      console.log("再生が開始しました。: " + clientdata.ytdt[plist[channeldata.playing].url].title + "\n" +
        "音量は" + (channeldata.volume) + "%です。");
      await entersState(player, AudioPlayerStatus.Playing);
      await entersState(player, AudioPlayerStatus.Idle);
      continue;
    } catch (e) {
      console.error(e);
      console.log("再生中にエラーが発生しました。エラー内容をあんこかずなみ36#5008にお送りください。");
      console.log("ボイスチャット切断処理をします。この処理でまたエラーが発生する場合がありますが、そのエラー内容も同時に添付してください。");
      server.playing = null;
      server.ytstream.destroy();
      server.connection.destroy();
      break;
    };
  };
};
const musicstop = () => {
  const server = temp[guildid];
  if (!clientdata.cacheis) server.ytstream.destroy();
  server.connection.destroy();
  server.playing = null;
  console.log("再生の停止");
};
client.login(process.env.token);