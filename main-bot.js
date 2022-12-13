const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const { entersState, createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, AudioPlayerStatus } = require("@discordjs/voice");
const ytdl = require("ytdl-core");
const fs = require("fs");
const { timeString, init, jsonRebuild, jsonload, savejson, videoembed } = require("./func");
require("dotenv").config();
const { decycle } = require("json-cyclic");
const config = { prefix: "voice!" };
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
}); //クライアント
let voice = {
  server: {},
  youtubecache: {},
  default: {
    prefix: "voice!",
    audiocache: false,
    guild: {
      connection: {},
      resource: {},
      ytstream: {},
      playing: null,
      channellist: {}
    },
    channel: {
      channelname: "",
      repeat: 0,
      volume: 50,
      playing: {
        url: "",
        username: ""
      },
      playlist: []
    }
  }
};

const clientdata = {};
const temp = {};
clientdata.cacheis = true;

client.on("ready", async () => {
  console.log("準備おっけい！");
  jsonload();
});
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (message.content.startsWith(config.prefix)) {
    const content = message.content;
    const guildid = message.guild.id;
    const channelid = message.member.voice.channel.id;
    const userid = message.author.id;
    const reply = message.reply;
    const voiceAdapterCreator = message.guild.voiceAdapterCreator;
    const command = content.split(" ")[0].split("!")[1];
    const subcontent = content.split(" ")[1];
    if (channelid == "null" || !channelid) return reply({
      content: "ボイスチャットに参加していないようです...\n" +
        "僕のbotはボイスチャットに参加しないと何もできない仕様なので、ご了承くださいm_ _m"
    });
    console.log([content, guildid, channelid, userid, reply, voiceAdapterCreator, command, subcontent]);
    init(temp[guildid]);
    const server = temp[guildid];
    init(server[channelid]);
    const voice = server[channelid];
    init(clientdata.glist);
    init(clientdata.glist[guildid]);
    const guilddata = clientdata.glist[guildid];
    init(guilddata.chlist);
    init(guilddata.chlist[channelid]);
    const channeldata = guilddata.chlist[channelid];
    init(channeldata.plist);
    client.channels.fetch(channelid)
      .then(channel => channeldata.chname = channel.name);
    switch (command) {
      case "add": {
        if (!subcontent)
          return reply({
            content: "URLを指定しましょう...\n`" + config.prefix + "add [URL]`"
          });
        if (!ytdl.validateURL(subcontent) && !ytdl.validateID(subcontent))
          return reply({
            content: "送られたものがYouTube用のURLではないみたいです...\n" + "内容: " + subcontent
          });
        let tmp = subcontent;
        if (ytdl.validateURL(data)) tmp = ytdl.getURLVideoID(subcontent);
        const videoid = tmp;
        if (!clientdata.ytdt[videoid])
          await ytdl.getInfo(data)
            .then(info => clientdata.ytdt[videoid] = info.videoDetails);
        botStatusSet();
        channeldata.plist.push({ url: videoid, user: userid, data: clientdata.ytdt[videoid] });
        if (clientdata.cacheis) {
          if (!fs.existsSync("ytaudio")) fs.mkdirSync("ytaudio");
          if (!fs.existsSync("ytaudio/" + videoid + ".mp3"))
            new Promise(resolve => {
              const download = ytdl(videoid, { filter: "audioonly", quality: "highest" });
              download.on("end", resolve);
              download.pipe(fs.createWriteStream("ytaudio/" + videoid + ".mp3"));
            });
        };
        reply(await videoembed("再生リストに追加しました！", { url: videoid, user: userid, data: clientdata.ytdt[videoid] }));
        break;
      }
      case "play": {
        if (server.playing == channelid)
          return reply({
            content: "既にそのボイスチャットで再生しています..."
          });
        if (server.playing)
          return reply({
            content: "既に他のボイスチャットで再生しています..."
          });
        if (!channeldata.playlist[0]) return reply({ content: "再生リストが空です...`" + config.prefix + "add [URL]`を使用して追加してくださいっ" }); //再生リストがない場合
        server.connection = joinVoiceChannel({ //接続
          guildId: guildid,
          channelId: channelid,
          adapterCreator: voiceAdapterCreator,
          selfDeaf: true
        });
        ytplay(guildid, channelid);
        reply(await videoembed("再生を始めます！", voice.playing));
        break;
      }
      case "stop": {
        if (server.playing != channelid) return reply({ content: "現在音楽を再生していません..." });
        if (!clientdata.cacheis) server.ytstream.destroy(); //ytdlストリームの存在を確認し、切断
        server.connection.destroy();
        server.playing = null;
        reply(await videoembed("再生を停止しました！"));
        break;
      }
      case "skip": {
        if (server.playing != channelid) return reply({ content: "現在音楽を再生していません..." });
        ytplay(guildid, channelid);
        reply((await videoembed("次の曲の再生を始めます！", voice.playing)));
        break;
      }
      case "volume": {
        let volume = Number(subcontent);
        if (volume == NaN) return reply(await videoembed("`" + volume + "`が理解できませんでした..."));
        if (volume < 0) {
          volume = 0;
        } else if (volume > 100) {
          volume = 100;
        };
        if (server.playing == channelid) server.resource.volume.volume = volume / 100;
        voice.volume = volume;
        reply(await videoembed("音量を" + volume + "%にしました！"));
        break;
      }
      case "repeat": {
        switch (subcontent) {
          case "repeat": channeldata.repeat = 1; break;
          case "one-repeat": channeldata.repeat = 2; break;
          default: channeldata.repeat = 0; break;
        };
        let repeat = "";
        switch (channeldata.repeat) {
          case 0: repeat = "オフ"; break;
          case 1: repeat = "リピート"; break;
          case 2: repeat = "１曲リピート"; break;
        };
        reply(await videoembed("リピート状態を**" + repeat + "**に変更しました！"));
        break;
      }
      case "remove": {
        if (!channeldata.playlist[0]) return reply({ content: "再生リストが空です...`" + config.prefix + "add [URL]`を使用して追加してくださいっ" }); //再生リストがない場合
        const number = Number(subcontent);
        if (number > channeldata.playlist.length || number < 0) return reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
        if (number == 0) {
          channeldata.playlist.splice(0);
          reply(await videoembed("全ての曲を削除しました！"));
        } else {
          let data = JSON.parse(JSON.stringify(channeldata.playlist[number - 1]));
          server.channellist[channelid].playlist.splice((number - 1), 1);
          reply(await videoembed("削除しました～", data));
        };
        break;
      }
      case "list": {
        if (!channeldata.playlist[0]) return reply({ content: "再生リストが空です...`" + config.prefix + "add [URL]`を使用して追加してくださいっ" }); //再生リストがない場合
        const number = Number(subcontent);
        if (number > channeldata.playlist.length || number < 0) return reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
        break;
      }
    };
    savejson();
  };
});

const ytplay = async (guildid, voiceid) => {
  try {
    const server = temp[guildid];
    const voice = server[channelid];
    const guilddata = clientdata.glist[guildid];
    const channeldata = guilddata.chlist[voiceid];
    server.playing = voiceid;
    while (server.playing) {
      if (channeldata.plist[0]) {
        server[voiceid].playing = jsonRebuild(channeldata.plist[0]);
        if (server[voiceid].repeat != 2) server.channellist[voiceid].playlist.shift();
        if (server[voiceid].repeat == 1) server.channellist[voiceid].playlist.push(JSON.parse(JSON.stringify(server.channellist[voiceid].playing)));
      };
      savejson();

      if (voice.default.audiocache) { //音声ファイルをキャッシュするかどうかを確認してから
        if (!fs.existsSync("ytaudio/" + server.channellist[voiceid].playing.url + ".mp3")) continue;
        server.ytstream = "ytaudio/" + server.channellist[voiceid].playing.url + ".mp3"; //ファイルパスを取得
      } else {
        try {
          server.ytstream = ytdl(server.channellist[voiceid].playing.url, {  //ytdlでリアルタイムダウンロード
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
        const player = createAudioPlayer(); //多分音声を再生するためのもの
        server.connection.subscribe(player); //connectionにplayerを登録？
        server.resource = createAudioResource(server.ytstream, { inputType: StreamType.WebmOpus, inlineVolume: true }); //ytdlのストリームで取得できた音声ファイルを読み込む
        server.resource.volume.setVolume(server.channellist[voiceid].volume / 100); //音量調節

        player.play(server.resource); //再生
        await entersState(player, AudioPlayerStatus.Playing); //再生が始まるまでawaitで待機
        await entersState(player, AudioPlayerStatus.Idle); //再生リソースがなくなる(再生が終わる)まで待機
        savejson();
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
  } catch (e) {
    console.error(e);
    console.log("プレイヤー処理中にエラーが発生しました。エラー内容をあんこかずなみ36#5008にお送りください。");
  };
};

const botStatusSet = async () => {
  client.user.setPresence({
    activities: [{
      name: "現在" + Object.keys(voice.youtubecache).length + "曲が読み込まれてますっ"
    }],
    status: "online"
  });
};
client.login(process.env.token); //ログイン