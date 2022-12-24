const { Client, GatewayIntentBits, Partials, Events, EmbedBuilder } = require("discord.js");
const { entersState, createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, AudioPlayerStatus } = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl")
const fs = require("fs");
const readline = require("readline");
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
      name: prefix + "help で始めます"
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
const videoembed = async (content, data, list) => {
  const outdata = {};
  outdata.content = content;
  if (data) {
    const yt = clientdata.ytdt[data.url]
    const thumbnails = yt.thumbnails;
    const authorth = yt.author.thumbnails;
    const embed = new EmbedBuilder()
      .setTitle("**" + yt.title + "**")
      .setDescription("**下にキューの一覧を表示します。**")
      .setAuthor({ name: yt.author.name, iconURL: authorth[authorth.length - 1].url })
      .setURL("https://youtu.be/" + data.url)
      .setThumbnail(thumbnails[thumbnails.length - 1].url);
    if (list) {
      const guilddata = clientdata.glist[list.guildid];
      const channeldata = guilddata.chlist[list.channelid];
      const plist = channeldata.plist;
      let data = [[]];
      let page = list.page;
      for (let i = 0; i != plist.length; i++) {
        if (data[data.length - 1].length > 4) data.push([]);
        let bold = "";
        if (i == channeldata.playing) {
          bold = "**";
          page = data.length - 1;
        };
        data[data.length - 1].push({
          name: bold + (i + 1) + ": " + clientdata.ytdt[plist[i].url].title + bold,
          value: "再生時間: " + await timeString(clientdata.ytdt[plist[i].url].lengthSeconds)
        });
      };
      if (page === true) list.page = data.length - 1;
      if (data[0][0].name) embed.addFields(data[page]);
    };
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
 * ユーザーからの文字入力を受けつける。
 * @param {string} text 
 * @returns 入力された文字列を返答する。
 */
const questions = text => {
  const interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => interface.question(text, answer => { resolve(answer); interface.close(); }));
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
jsonload().then(async data => {
  clientdata = JSON.parse(data);
  if (!clientdata.userid) {
    console.info("初回起動のため、あなたのDiscordのユーザーIDを入力する必要があります。");
    clientdata.userid = await questions("ユーザーIDを入力してください。> ");
    savejson(clientdata, "music_botv2");
    console.info("設定が完了しました！音楽botをお楽しみください！\n" +
      "もしも打ち間違えた場合、userid欄を削除することで再度入力することができます。");
  };
  client.login(process.env.token);
});
const temp = {};
const prefix = "voice!";
client.on(Events.ClientReady, async () => {
  if (clientdata.cacheis == undefined) clientdata.cacheis = true;
  if (!clientdata.glist) clientdata.glist = {};
  if (!clientdata.ytdt) clientdata.ytdt = {};
  if (!clientdata.pubplist) clientdata.pubplist = {};
  if (!clientdata.userdata) clientdata.userdata = {};
  console.log("botの準備が完了しました！");
  savejson(clientdata, "music_botv2");
});
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (message.content.startsWith(prefix)) {
    try {
      if (!message.member.voice.channel.id) return message.reply({
        content: "ボイスチャットに参加していないようです...\n" +
          "僕のbotはボイスチャットに参加しないと何もできない仕様なので、ご了承くださいm_ _m"
      });
    } catch (e) {
      console.log(e)
      return message.reply("VCに参加していないようです。\n" +
        "VCに入ってからもう一度お試しください。");
    };
    const content = message.content;
    const guildid = message.guild.id;
    const channelid = message.member.voice.channel.id;
    const userid = message.author.id;
    const voiceAdapterCreator = message.guild.voiceAdapterCreator;
    const command = content.split(" ")[0].split("!")[1];
    const subcontent = content.split(" ")[1];
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
    if (!clientdata.userdata[userid]) clientdata.userdata[userid] = {};
    if (!clientdata.userdata[userid].myplist) clientdata.userdata[userid].myplist = {};
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
            content: "URLを指定しましょう...\n`" + prefix + "add [URL]`"
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
        message.reply(await videoembed("再生リストに追加しました！", data, { guildid, guildid, channelid: channelid, page: true }));
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
        server.connection.on("error", e => {
          console.log("予想外の通信エラーが発生しました。", e,
            "\nこのエラーが何か具体的に記されている場合、エラーをGiuHubのIssuesにお送りください。");
          musicstop(guildid);
        });
        ytplay(guildid, channelid);
        message.reply(
          await videoembed("再生を始めます！: " + (channeldata.playing + 1) + "曲目",
            plist[channeldata.playing],
            { guildid, guildid, channelid: channelid, page: 0 }
          ));
        break;
      }
      case "stop": {
        if (server.playing != channelid) return message.reply({ content: "現在音楽を再生していません..." });
        musicstop(guildid);
        message.reply(await videoembed("再生を停止しました！"));
        break;
      }
      case "skip": {
        if (server.playing != channelid) return message.reply({ content: "現在音楽を再生していません..." });
        if (!plist[0]) return message.reply({
          content: "再生リストが空です...`" + prefix + "add [URL]`を使用して追加してくださいっ"
        });
        channeldata.playing++;
        ytplay(guildid, channelid);
        message.reply(
          await videoembed("次の曲の再生を始めます！: " + (channeldata.playing + 1) + "曲目",
            plist[channeldata.playing],
            { guildid: guildid, channelid: channelid, page: 0 })
        );
        break;
      }
      case "volume": {
        let volume = Number(subcontent);
        if (volume == NaN) return message.reply(await videoembed("`" + volume + "`が理解できませんでした..."));
        if (volume < 0) {
          volume = 0;
        } else if (volume > 1.0e+9999) {
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
        if (!plist[0]) return message.reply({ content: "再生リストが空です...`" + prefix + "add [URL]`を使用して追加してくださいっ" });
        const number = Number(subcontent);
        if (number > plist.length || number < 0) return message.reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
        if (number == 0) {
          plist.splice(0);
          message.reply(await videoembed("全ての曲を削除しました！"));
        } else if (!number) {
          let data = jsonRebuild(plist[channeldata.playing]);
          plist.splice((channeldata.playing), 1);
          message.reply(await videoembed("削除しました～", data, { guildid, guildid, channelid: channelid, page: 0 }));
        } else if (number != 0) {
          let data = jsonRebuild(plist[number - 1]);
          plist.splice((number - 1), 1);
          message.reply(await videoembed("削除しました～", data, { guildid, guildid, channelid: channelid, page: 0 }));
        };
        break;
      }
      case "list": {
        if (!plist[0]) return message.reply({ content: "再生リストが空です...`" + prefix + "add [URL]`を使用して追加してくださいっ" });
        const page = Number(subcontent) || 1;
        const data = { page: 1, in: 0 };
        for (let i = 0; i != plist.length; i++) { if (data.in - 1 > 4) { data.page++; data.in = 0 }; data.in++; };
        if (page > data.page || page < 1) return message.reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
        message.reply(await videoembed("再生中またはフォーカス中の曲とキューを表示します！",
          plist[channeldata.playing],
          { guildid, guildid, channelid: channelid, page: (page - 1) }
        ));
        break;
      }
      case "splist": {
        if (!plist[0]) return message.reply({ content: "再生リストが空です...`" + prefix + "add [URL]`を使用して追加してくださいっ" });
        if (!subcontent) return message.reply({ content: "`" + prefix + "splist [name]`で名前を指定してくださいっ" });
        if (subcontent.length > 16) return message.reply({ content: "名前は16文字までです。もう一度名前を決めましょう！" });
        clientdata.userdata[userid].myplist[subcontent] = jsonRebuild(plist);
        message.reply({
          content: "再生リストを保存しました！\n`" +
            prefix + "lplist " + subcontent + "`で再生リストの読み込みができます！"
        });
        break;
      }
      case "lplist": {
        if (!subcontent) return message.reply({ content: "`" + prefix + "lplist [name]`で名前を指定してくださいっ" });
        if (!clientdata.userdata[userid].myplist[subcontent]) return message.reply({
          content: "そのような再生リストは確認できませんでした...再度試して見てくださいっ"
        });
        channeldata.plist = jsonRebuild(clientdata.userdata[userid].myplist[subcontent]);
        message.reply({
          content: "再生リストを復元しました！\n" +
            channeldata.plist.length + "曲の再生リストです！お楽しみください！"
        });
        break;
      }
      case "plist": {
        const myplist = clientdata.userdata[userid].myplist;
        const mpl = Object.keys(myplist);
        if (!mpl[0]) return message.reply({ content: "再生リストが見つかりません...`" + prefix + "splist [name]`で追加してくださいっ" });
        const page = Number(subcontent) || 1;
        let data = [[]];
        for (let i = 0; i != mpl.length; i++) {
          if (data[data.length - 1].length > 4) data.push([]);
          data[data.length - 1].push({ name: (i + 1) + ": " + mpl[i], value: myplist[mpl[i]].length + "曲入っています。`voice!lplist " + mpl[i] + "`" });
        };
        if (page > data.length || page < 1) return message.reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
        message.reply({
          content: "再生リスト一覧です。" + page + "/" + data.length,
          embeds: [
            new EmbedBuilder()
              .setDescription("あなたが作成した再生リストを一覧で表示しています。")
              .setAuthor({ name: "一覧" + "[" + page + "/" + data.length + "]", iconURL: message.author.avatarURL() })
              .addFields(data[page - 1])
          ]
        });
        break;
      }
      case "pubsplist": {
        if (!plist[0]) return message.reply({ content: "再生リストが空です...`" + prefix + "add [URL]`を使用して追加してくださいっ" });
        if (!subcontent) return message.reply({ content: "`" + prefix + "pubsplist [name]`で名前を指定してくださいっ" });
        if (clientdata.userid != userid) return message.reply({ content: "あなたはパブリック・プレイリストを操作することは出来ません..." });
        if (subcontent.length > 16) return message.reply({ content: "名前は16文字までです。もう一度名前を決めましょう！" });
        clientdata.pubplist[subcontent] = jsonRebuild(plist);
        message.reply({
          content: "再生リストを保存しました！\n`" +
            prefix + "publplist " + subcontent + "`で再生リストの読み込みができます！"
        });
        break;
      }
      case "publplist": {
        if (!subcontent) return message.reply({ content: "`" + prefix + "publplist [name]`で名前を指定してくださいっ" });
        if (!clientdata.pubplist[subcontent]) return message.reply({
          content: "そのようなパブリック・プレイリストは確認できませんでした...再度試して見てくださいっ"
        });
        channeldata.plist = jsonRebuild(clientdata.pubplist[subcontent]);
        message.reply({
          content: "再生リストを復元しました！\n" +
            channeldata.plist.length + "曲の再生リストです！お楽しみください！"
        });
        break;
      }
      case "pubplist": {
        const myplist = clientdata.pubplist;
        const mpl = Object.keys(myplist);
        if (!mpl[0]) return message.reply({
          content: "パプリック・プレイリストが設定されていません...\n" +
            "管理人がパプリック・プレイリストを設定するまで、しばらくお待ちください..."
        });
        const page = Number(subcontent) || 1;
        let data = [[]];
        for (let i = 0; i != mpl.length; i++) {
          if (data[data.length - 1].length > 4) data.push([]);
          data[data.length - 1].push({ name: (i + 1) + ": " + mpl[i], value: myplist[mpl[i]].length + "曲入っています。`voice!publplist " + mpl[i] + "`" });
        };
        if (page > data.length || page < 1) return message.reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
        message.reply({
          content: "プレイリスト一覧です。" + page + "/" + data.length,
          embeds: [
            new EmbedBuilder()
              .setDescription("パプリック・プレイリストを一覧で表示しています。")
              .setAuthor({ name: "一覧" + "[" + page + "/" + data.length + "]", iconURL: client.user.avatarURL() })
              .addFields(data[page - 1])
          ]
        });
        break;
      }
      case "help": {
        const repositoryLink = "https://github.com/azkazunami36/ibuki-bot1";
        if (!subcontent) message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("ヘルプ！")
              .setDescription("使い方を紹介します！")
              .setAuthor({
                name: client.user.username,
                iconURL: client.user.avatarURL()
              })
              .addFields(
                {
                  name: "コマンド一覧",
                  value: "" +
                    "`" + prefix + "add [url]` VCキューに曲を追加します。\n" +
                    "`" + prefix + "play` キュー内の曲を再生します。\n" +
                    "`" + prefix + "stop` 曲の再生を停止します。\n" +
                    "`" + prefix + "skip` 次の曲へすぐに切り替えます。\n" +
                    "`" + prefix + "volume [num]` 音量を調節します。\n" +
                    "`" + prefix + "repeat [0, 1, 2]` リピートパターンを切り替えます。\n" +
                    "`" + prefix + "remove [num]` 指定した曲を削除します。\n" +
                    "`" + prefix + "list [num]` 指定した曲の詳細が確認できます。\n" +
                    "`" + prefix + "splist [name]` キュー内の曲を保存します。\n" +
                    "`" + prefix + "lplist [num]` 保存したリストをキューに復元します。\n" +
                    "`" + prefix + "plist [page]` 保存したリストを一覧で表示します。\n" +
                    "`" + prefix + "pubplist [page]` パブプレを一覧で表示します。\n" +
                    "`" + prefix + "publplist [num]` パブプレからキューに復元します。\n" +
                    "`" + prefix + "help [command]` コマンドの詳細ヘルプを表示します。\n" +
                    ""
                },
                {
                  name: "概要",
                  value: "このbotはYouTubeから曲を入手する音楽botです。\n" +
                    "キューや再生リスト、パプリック・プレイリスト(略:パブプレ)機能を\n" +
                    "利用できる、多機能音楽botです。\n" +
                    "もしもバグが発生してしまった場合、\n" +
                    "GitHubから[ibuki-bot2](" + repositoryLink + ")にアクセスし、\n" +
                    "Issuesにエラー内容を書き込んでいただけると、ありがたいです。\n" +
                    "GitHubが分からない場合は、\n" +
                    "あんこかずなみ36#5008にDMでお知らせください！\n" +
                    "botの詳細の使い方は、`" + prefix + "help add`等を使用するか、\n" +
                    "ヘルプページにアクセスしてください！"
                }
              )
          ]
        })
        else {
          switch (subcontent) {
            case "add": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("addコマンドのヘルプ")
                    .setDescription("追加コマンドの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "このbotにはキュー機能が搭載されています。\n" +
                          "そのキューに追加するには、`voice!add [url]`を入力します。\n" +
                          "[url]の部分には、\n" +
                          "YouTubeのURLとVideo IDを利用することが出来ます。\n" +
                          "キューには実質無制限に追加することができ、\n" +
                          "そのキューのデータには、管理人とユーザー自身が操作出来ます。\n" +
                          "\n例: voice!add [https://youtu.be/srYREQyMzOo](https://youtu.be/srYREQyMzOo)\n" +
                          "この例にはP丸様。の\n" +
                          "可愛くてごめん／P丸様。【歌ってみた】を使用しています"
                      }
                    )
                ]
              });
              break;
            }
            case "play": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("playコマンドのヘルプ")
                    .setDescription("再生コマンドの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "キュー内に入っている曲を再生することができます。\n" +
                          "キューについては、`voice!help add`を利用し参照してください。\n" +
                          "今後再生コマンドには番号指定機能を追加するため、\n" +
                          "その説明を記述します。\n" +
                          "再生する際に、番号を使用してプレイリストの再生番号を\n" +
                          "指定することができます。例: `voice!play 2`"
                      }
                    )
                ]
              });
              break;
            }
            case "stop": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("stopコマンドのヘルプ")
                    .setDescription("停止コマンドの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "再生を停止して、VCから切断することができます。\n" +
                          "これと言って出来る機能はありませんが、`voice!stop`で可能です。"
                      }
                    )
                ]
              });
              break;
            }
            case "skip": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("skipコマンドのヘルプ")
                    .setDescription("スキップコマンドの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "現在再生している曲を停止し、すぐに\n" +
                          "次の曲へ切り替えることが出来ます。\n" +
                          "もしも１曲リピートがオンの場合、曲を切り替える事が出来ませんが、\n" +
                          "いずれ可能になるよう、現在作業を行っていますので少々お待ちください。\n" +
                          "リピートについては、`voice!help repeat`を利用し参照してください。"
                      }
                    )
                ]
              });
              break;
            }
            case "volume": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("volumeコマンドのヘルプ")
                    .setDescription("音量コマンドの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "このbotでは音量を変更することが可能です。\n" +
                          "推奨値はながら操作などの低音量で1～5%、\n" +
                          "通常通りの音量で楽しみたい場合は、50%がおすすめです。\n" +
                          "例: `voice!volume 2.5` (小数点以下の指定も可能です。)"
                      }
                    )
                ]
              });
              break;
            }
            case "repeat": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("repeatコマンドのヘルプ")
                    .setDescription("リピートコマンドの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "このbotではリピート機能を使用することが可能です。\n" +
                          "なし、リピート、1曲リピートの3パターンから選ぶことが可能です。\n" +
                          "なしの場合、最後まで再生しきるとVC切断、\n" +
                          "リピートの場合は、最後まで再生しきった場合に最初に戻り、\n" +
                          "1曲リピートの場合常に同じ曲を再生し続けます。"
                      }
                    )
                ]
              });
              break;
            }
            case "remove": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("removeコマンドのヘルプ")
                    .setDescription("削除コマンドの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "キューに保存されている曲を指定し削除します。\n" +
                          "キューについては`voice!help add`を利用し参照してください。\n" +
                          "指定せずに削除をすると、内部に記録されたフォーカスに従い、\n" +
                          "削除を行います。(再生中の場合は、その再生中の曲が削除されます。)\n" +
                          "どこに曲が入っているか分からない場合、`voice!list`をご確認ください。\n" +
                          "例: voice!remove 4"
                      }
                    )
                ]
              });
              break;
            }
            case "list": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("listコマンドのヘルプ")
                    .setDescription("リストコマンドの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "キューに保存されている曲をリストとして表示します。\n" +
                          "`list 番号`として入力すると、ページを切り替えることが出来ます。\n" +
                          "例: voice!list 1"
                      }
                    )
                ]
              });
              break;
            }
            case "splist": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("splistコマンドのヘルプ")
                    .setDescription("セーブプレイリストの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "キューに保存されている曲をマイ再生リストとし、" +
                          "登録をすることが出来ます。\n" +
                          "保存可能な個数は実質無限であり、同じ名前を指定すると\n" +
                          "上書きをすることが出来ます。\n" +
                          "マイ再生リストとは、あなただけが使用できる\n" +
                          "保存可能な再生リスト機能です。\n" +
                          "あなたの再生リストは管理者を除き、誰も見ることが出来ません。\n" +
                          "例: voice!splist 保存用 (日本語を使用することが可能です。)"
                      }
                    )
                ]
              });
              break;
            }
            case "lplist": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("lplistコマンドのヘルプ")
                    .setDescription("ロードプレイリストの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "マイ再生リストから名前を指定して、" +
                          "キューに曲を復元することが出来ます。\n" +
                          "マイ再生リストとは、あなただけが使用できる\n" +
                          "保存可能な再生リスト機能です。\n" +
                          "あなたの再生リストは管理者を除き、誰も見ることが出来ません。\n" +
                          "例: voice!lplist 保存用 (日本語を使用することが可能です。)"
                      }
                    )
                ]
              });
              break;
            }
            case "plist": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("plistコマンドのヘルプ")
                    .setDescription("プレイリストの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "マイ再生リストに登録済みのリストを一覧として表示します。\n" +
                          "マイ再生リストとは、あなただけが使用できる\n" +
                          "保存可能な再生リスト機能です。\n" +
                          "あなたの再生リストは管理者を除き、誰も見ることが出来ません。\n" +
                          "例: voice!plist 1"
                      }
                    )
                ]
              });
              break;
            }
            case "pubplist": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("pubplistコマンドのヘルプ")
                    .setDescription("パブリック・プレイリストの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "パブリック・プレイリストに登録済みのリストを利用し、\n" +
                          "キューに曲を復元することが出来ます。\n" +
                          "パブリック・プレイリストとは、誰もがアクセス可能な\n" +
                          "管理者が管理するプレイリストです。\n" +
                          "管理者が追加や削除等をし、それを皆さんが利用することが出来ます。\n" +
                          "例: voice!publplist 可愛くてごめんシリーズ"
                      }
                    )
                ]
              });
              break;
            }
            case "publplist": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("publplistコマンドのヘルプ")
                    .setDescription("ロードパブリック・プレイリストの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "パブリック・プレイリストに登録済みのリストを、\n" +
                          "一覧として表示します。\n" +
                          "パブリック・プレイリストとは、誰もがアクセス可能な\n" +
                          "管理者が管理するプレイリストです。\n" +
                          "管理者が追加や削除等をし、それを皆さんが利用することが出来ます。\n" +
                          "例: voice!pubplist 1"
                      }
                    )
                ]
              });
              break;
            }
            case "help": {
              message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("helpコマンドのヘルプ")
                    .setDescription("ヘルプの使い方を紹介します。")
                    .setAuthor({
                      name: client.user.username,
                      iconURL: client.user.avatarURL()
                    })
                    .addFields(
                      {
                        name: "概要",
                        value: "ここはヘルプコマンドの説明です。\n" +
                          "このbotについて知りたい場合は`voice!help`をご利用ください。\n" +
                          "例: voice!help lplist"
                      }
                    )
                ]
              });
              break;
            }
          }
        }
        break;
      }
      case "mlist": {
        const ytdt = clientdata.ytdt;
        const mpl = Object.keys(ytdt);
        if (!mpl[0]) return message.reply({ content: "音楽が入っていません...`" + prefix + "add [url]`で追加してくださいっ" });
        const page = Number(subcontent) || 1;
        let data = [[]];
        for (let i = 0; i != mpl.length; i++) {
          const yt = clientdata.ytdt[mpl[i]];
          if (data[data.length - 1].length > 4) data.push([]);
          data[data.length - 1].push({ name: (i + 1) + ": " + yt.title, value: "再生時間: " + await timeString(yt.lengthSeconds) + " `voice!add " + mpl[i] + "`" });
        };
        if (page > data.length || page < 1) return message.reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
        message.reply({
          content: "bot内の曲一覧です。" + page + "/" + data.length,
          embeds: [
            new EmbedBuilder()
              .setDescription("botがキャッシュした曲を一覧として表示しています。")
              .setAuthor({ name: "一覧" + "[" + page + "/" + data.length + "]", iconURL: message.author.avatarURL() })
              .addFields(data[page - 1])
          ]
        });
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
    if ((plist.length - 1) < channeldata.playing) {
      console.log("再生リストの指定番号がリスト数を超過していたため、最初の曲を指定しました。元番号: " + channeldata.playing);
      channeldata.playing = 0;
    };
    savejson(clientdata, "music_botv2");
    if (clientdata.cacheis) {
      if (!fs.existsSync("ytaudio/" + plist[channeldata.playing].url + ".mp3")) continue;
      server.ytstream = "ytaudio/" + plist[channeldata.playing].url + ".mp3";
    } else {
      try {
        console.log("キャッシュが無効なため、ytdlから直接音声データを取得しています。");
        server.ytstream = ytdl(plist[channeldata.playing].url, {
          filter: "audioonly",
          //filter: format => format.audioCodec === "opus" && format.container === "webm"
          quality: "highest", highWaterMark: 1024 * 1024 * 1024 //1GiBのバッファg
        });
      } catch (e) {
        console.error(e);
        musicstop(guildid);
        break;
      };
    };
    try {
      const player = createAudioPlayer();
      server.connection.subscribe(player);
      server.resource = createAudioResource(server.ytstream, { inputType: StreamType.WebmOpus, inlineVolume: true });
      server.resource.volume.setVolume(channeldata.volume / 100);
      player.play(server.resource);
      console.log("再生が開始しました。" + (channeldata.playing + 1) + "曲目: " + clientdata.ytdt[plist[channeldata.playing].url].title + "\n" +
        "音量は" + (channeldata.volume) + "%です。");
      await entersState(player, AudioPlayerStatus.Playing);
      await entersState(player, AudioPlayerStatus.Idle);
      if (plist[0]) {
        if (channeldata.repeat == 2) console.log("1曲リピートのため、トラック番号は同じままになります。");
        if (channeldata.repeat == 1) {
          channeldata.playing += 1;
          console.log("リピートにより数字に１足しました。");
        };
        if (plist.length == channeldata.playing) {
          channeldata.playing = 0;
          console.log("リピートにより数字が0に戻されました。");
          if (channeldata.repeat == 0) {
            musicstop(guildid);
            console.log("リピートオフのため、そのまま停止をします。")
            break;
          };
        };
      } else musicstop(guildid);
      continue;
    } catch (e) {
      console.error(e);
      musicstop(guildid);
      break;
    };
  };
};
const musicstop = guildid => {
  const server = temp[guildid];
  try { if (!clientdata.cacheis) server.ytstream.destroy(); }
  catch (e) { console.log("ytstreamの切断に失敗。", e); };
  try { server.connection.destroy(); }
  catch (e) { console.log("VoiceChatの切断に失敗。", e); };
  try { server.playing = null; }
  catch (e) { console.log("playingのステータス変更に失敗: ", e); };
  console.log("再生の停止");
};