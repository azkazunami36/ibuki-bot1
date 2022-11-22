const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js'); //Discord.js本体
const { entersState, createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, AudioPlayerStatus } = require('@discordjs/voice'); //Discord.jsVoice
const ytdl = require('ytdl-core'); //YouTube Downloadのコア
const fs = require("fs"); //ファイル書き込みや読み込み
require("dotenv").config(); //envデータ取得用(Glitchでは不要)
const { decycle } = require("json-cyclic"); //json管理に必須
const config = { prefix: "voice!" }; //json
const token = process.env.token; //トークン
const { music } = require("../multi-function-discord/main");
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

/**
 * voiceコマンドのデータ格納庫
 */
let voice = {
  /**
   * サーバー毎やチャンネル毎の再生リストなどを保管する
   */
  server: {},
  /**
   * YouTubeのタイトル等を格納する
   */
  youtubecache: {},
  /**
   * 初期設定を格納する
   */
  default: {
    /**
     * チャットコマンド実行用プレフィックス
     */
    prefix: "voice!",
    /**
     * 音声ファイルを保存するかどうかの設定
     * レンタルサーバー(Glitch)や容量の少ないデバイス等では無効を推奨
     */
    audiocache: false,
    /**
     * サーバー用の初期化用オブジェクト
     * ※変更厳禁(知識あるなら改善ok
     */
    guild: {
      /**
       * discordのボイスチャット接続データを保管
       */
      connection: {},
      /**
       * discord用プレイヤーデータを保管
       */
      resource: {},
      /**
       * ytdlの音声ストリームデータを保管
       * リアルタイム取得時のみ使用。キャッシュを有効にすると使用されなくなり、代わりに音声ファイル先を記録します。
       */
      ytstream: {},
      /**
       * 再生中のボイスチャンネルのIDを保管
       */
      playing: null,
      /**
       * ボイスチャンネル事のデータを記録
       */
      channellist: {}
    },
    /**
     * チャンネル用初期化用オブジェクト
     * ※変更厳禁(一部分はok または知識があ(ry
     */
    channel: {
      /**
       * ボイスチャンネルの名前を保管
       */
      channelname: "",
      /**
       * リピート状態を保管
       * 0: 無し
       * 1: リピート
       * 2: １曲リピート
       */
      repeat: 0,
      /**
       * 音量を保管
       * 変更ok
       */
      volume: 50,
      /**
       * 再生中のデータを記録
       */
      playing: {
        /**
         * VideoIDを保管
         */
        url: "",
        /**
         * 追加者を記録
         */
        username: ""
      },
      /**
       * 再生リストを記録
       */
      playlist: []
    }
  }
};

client.on("ready", async () => {
  try {
    console.log("準備おっけい！");
    jsonload();
  } catch (e) {
    console.error(e);
    console.log("起動後処理中にエラーが発生しました。エラー内容をあんこかずなみ36#5008にお送りください。");
  };
}); //準備OK通知

client.on("messageCreate", async message => { //メッセージを受信したら
  try {
    if (message.author.bot) return; //チャット送信者がbotならリターン(終了)

    if (message.content.startsWith(config.prefix)) { //最初にPrefix文字列があれば
      try {
        const incommands = message.content.split(" "); //スペースを参考に配列を生成する
        const command = incommands[0].slice(config.prefix.length).trim().split(/ +/g)[0]; //Prefixを取り除く
        const subcontent = incommands[1]; //2番目の文字列を受け取る

        const channel = String(message.member.voice.channelId); //ボイスチャンネルの場所を取得
        if (channel == "null" || !channel) return message.reply({ //ボイスチャット未参加の場合リターン
          content: "ボイスチャットに参加していないようです...\n" +
            "僕のbotはボイスチャットに参加しないと何もできない仕様なので、ご了承くださいm_ _m"
        });
        await setChannelData(message.guildId, message.member.voice.channel.id);
        const server = voice.server[message.guildId]; //コード見やすくするための
        console.log(command);
        console.log(subcontent);
        console.log(channel);
        switch (command) {
          case "add": {
            if (!subcontent) return message.reply({ content: "URLを指定しましょう...\n`" + config.prefix + "add [URL]`" }); //URLがない場合
            if (!ytdl.validateURL(subcontent) && !ytdl.validateID(subcontent)) return message.reply({ content: "送られたものがYouTube用のURLではないみたいです...\n" + "内容: " + subcontent }); //URLが認識できない場合
            const videoid = await addYouTubeVideo(message.guildId, channel, subcontent, message.author.id);
            message.reply(await videoembed("再生リストに追加しました！", { url: videoid.videoid, user: message.author.id }));
            break;
          }
          case "play": {
            if (server.playing == channel) return message.reply({ content: "既にそのボイスチャットで再生しています..." }); //既に参加していた場合
            if (server.playing) return message.reply({ content: "既に他のボイスチャットで再生しています..." }); //既にほかの場所で参加していた場合
            if (!server.channellist[channel].playlist[0]) return message.reply({ content: "再生リストが空です...`" + config.prefix + "add [URL]`を使用して追加してくださいっ" }); //再生リストがない場合
            server.connection = joinVoiceChannel({ //接続
              guildId: message.guildId, //サーバーID
              channelId: channel, //チャンネルID
              adapterCreator: message.guild.voiceAdapterCreator, //わからない
              selfDeaf: true //スピーカーミュート
            });
            ytplay(message.guildId, channel);
            message.reply(await videoembed("再生を始めます！", server.channellist[channel].playing));
            break;
          }
          case "stop": {
            if (server.playing != channel) return message.reply({ content: "現在音楽を再生していません..." }); //そのチャンネルで再生をしていない場合
            if (!voice.default.audiocache) server.ytstream.destroy(); //音声ファイルをキャッシュしないか確認してから、ストリームを切断
            server.connection.destroy(); //ボイスチャット切断
            server.playing = null; //再生中のチャンネル場所を破棄
            message.reply(await videoembed("再生を停止しました！"));
            break;
          }
          case "skip": {
            if (server.playing != channel) return message.reply({ content: "現在音楽を再生していません..." }); //そのチャンネルで再生をしていない場合
            ytplay(message.guildId, channel);
            message.reply((await videoembed("次の曲の再生を始めます！", server.channellist[channel].playing)));
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
            if (server.playing == channel) server.resource.volume.volume = volume / 100;
            server.channellist[channel].volume = volume;
            message.reply(await videoembed("音量を" + volume + "%にしました！"));
            break;
          }
          case "repeat": {
            let repeat = "";
            switch (subcontent) {
              case "repeat": server.channellist[channel].repeat = 1; break;
              case "one-repeat": server.channellist[channel].repeat = 2; break;
              default: server.channellist[channel].repeat = 0; break;
            };
            switch (server.channellist[channel].repeat) {
              case 0: repeat = "オフ"; break;
              case 1: repeat = "リピート"; break;
              case 2: repeat = "１曲リピート"; break;
            };
            message.reply(await videoembed("リピート状態を**" + repeat + "**に変更しました！"));
            break;
          }
          case "remove": {
            if (!server.channellist[channel].playlist[0]) return message.reply({ content: "再生リストが空です...`" + config.prefix + "add [URL]`を使用して追加してくださいっ" }); //再生リストがない場合
            const number = Number(subcontent);
            if (number > server.channellist[channel].playlist.length || number < 0) return message.reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
            if (number == 0) {
              server.channellist[channel].playlist.splice(0);
              message.reply(await videoembed("全ての曲を削除しました！"));
            } else {
              let data = JSON.parse(JSON.stringify(server.channellist[channel].playlist[number - 1]));
              server.channellist[channel].playlist.splice((number - 1), 1);
              message.reply(await videoembed("削除しました～", data));
            };
            break;
          }
          case "list": {
            if (!server.channellist[channel].playlist[0]) return message.reply({ content: "再生リストが空です...`" + config.prefix + "add [URL]`を使用して追加してくださいっ" }); //再生リストがない場合
            const number = Number(subcontent);
            if (number > server.channellist[channel].playlist.length || number < 0) return message.reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
            break;
          }
        };
        savejson();
      } catch (e) {
        console.error(e);
        console.log("コマンド処理中にエラーが発生しました。エラー内容をあんこかずなみ36#5008にお送りください。");
        let random = new Date;
        console.log("コマンド送信者にエラーを通知するメッセージと、エラー時の番号を送信しました。次の番号と一致する場合そのエラー内容をあんこかずなみ36にお送りください。:" + random);
        message.reply("エラーが発生しました...\n次の番号が開発者には役に立つかもしれません...`" + random + "`");
      };
    };
  } catch (e) {
    console.error(e);
    console.log("メッセージ処理中にエラーが発生しました。エラー内容をあんこかずなみ36#5008にお送りください。");
  };
});

const addYouTubeVideo = async (guildid, channelid, data, user) => {
  let youtubetytdlturltid;
  if (ytdl.validateURL(data)) youtubetytdlturltid = ytdl.getURLVideoID(data); //URLからVideoIDを取得
  if (ytdl.validateID(data)) youtubetytdlturltid = data;
  const videoid = youtubetytdlturltid;
  if (!voice.youtubecache[videoid]) await ytdl.getInfo(data).then(info => voice.youtubecache[videoid] = info.player_response.videoDetails); //youtubeのデータがキャッシュされてなかったら取得
  resetstatus();
  voice.server[guildid].channellist[channelid].playlist.push({ url: videoid, user: user });
  if (voice.default.audiocache) { //音声ファイルをキャッシュするかどうかを確認してから
    if (!fs.existsSync("ytaudio")) fs.mkdirSync("ytaudio"); //フォルダがなければ作成
    if (!fs.existsSync("ytaudio/" + videoid + ".mp3")) await ytdl(videoid, { filter: "audioonly", quality: "highest" }).pipe(fs.createWriteStream("ytaudio/" + videoid + ".mp3")); //YouTubeの音声ファイルが無ければ取得(非同期
  };
  return { videoid: videoid };
};

const setChannelData = async (guildid, channelid) => {
  if (!voice.server[guildid]) voice.server[guildid] = JSON.parse(JSON.stringify(voice.default.guild)); //サーバー用オブジェクト初期化
  if (!voice.server[guildid].channellist[channelid]) voice.server[guildid].channellist[channelid] = JSON.parse(JSON.stringify(voice.default.channel)); //チャンネル用オブジェクト初期化
  voice.server[guildid].channellist[channelid].channelname = (await client.channels.cache.get(channelid)).name;
};

const ytplay = async (guildId, voiceid) => {
  try {
    const server = voice.server[guildId];
    server.playing = voiceid;
    while (server.playing) {
      if (server.channellist[voiceid].playlist[0]) {
        server.channellist[voiceid].playing = JSON.parse(JSON.stringify(server.channellist[voiceid].playlist[0]));
        if (server.channellist[voiceid].repeat != 2) server.channellist[voiceid].playlist.shift();
        if (server.channellist[voiceid].repeat == 1) server.channellist[voiceid].playlist.push(JSON.parse(JSON.stringify(server.channellist[voiceid].playing)));
      };
      savejson();

      if (voice.default.audiocache) { //音声ファイルをキャッシュするかどうかを確認してから
        if (!fs.existsSync("ytaudio/" + server.channellist[voiceid].playing.url + ".mp3")) continue;
        server.ytstream = "ytaudio/" + server.channellist[voiceid].playing.url + ".mp3"; //ファイルパスを取得
      } else {
        try {
          server.ytstream = ytdl(server.channellist[voiceid].playing.url, {  //ytdlでリアルタイムダウンロード
            filter: format => format.audioCodec === 'opus' && format.container === 'webm', //取り出すデータ
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

const videoembed = async (content, data) => {
  const outdata = {};
  try {
    outdata.content = content;
    if (data) {
      const embed = new EmbedBuilder()
        .setTitle("**" + voice.youtubecache[data.url].title + "**")
        .setDescription("再生時間: " + (await timeString(voice.youtubecache[data.url].lengthSeconds)))
        .setAuthor({ name: client.users.cache.get(data.user).username, iconURL: client.users.cache.get(data.user).avatarURL() })
        .setURL("https://youtu.be/" + data.url)
        .setThumbnail("https://i.ytimg.com/vi/" + data.url + "/hqdefault.jpg");
      outdata.embeds = [embed];
    };
  } catch (e) {
    console.error(e);
    console.log("embed作成中にエラーが発生しました。エラー内容をあんこかずなみ36#5008にお送りください。");
    outdata.content = "エラーが発生しました。";
  };
  return outdata;
};

const resetstatus = async () => {
  try {
    client.user.setPresence({
      activities: [{
        name: "There are " + Object.keys(voice.youtubecache).length + " songs."
      }],
      status: "online"
    });
  } catch (e) {
    console.error(e);
    console.log("ステータス設定中にエラーが発生しました。エラー内容をあんこかずなみ36#5008にお送りください。");
  };
};

const jsonload = async () => {
  try {
    const req = require("http").request("http://localhost", {
      port: 3000,
      method: "post",
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
    req.on('response', res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => { voice = JSON.parse(data).music_bot; });
    });
    req.write(JSON.stringify([""]));
    req.on('error', err => console.log(err));
    req.end();
  } catch (e) {
    console.error(e);
    console.log("json読み込み中にエラーが発生しました。エラー内容をあんこかずなみ36#5008にお送りください。");
  };
};

const savejson = async () => {
  try {
    let json = {
      server: {},
      youtubecache: voice.youtubecache,
      default: voice.default
    };
    for (let i = 0; Object.keys(voice.server).length != i; i++) {
      let guildkey = Object.keys(voice.server)[i];
      let channelplay = voice.server[guildkey];
      json.server[guildkey] = {
        connection: {},
        resource: {},
        ytstream: {},
        playing: null,
        channellist: channelplay.channellist
      };
    };
    const req = require("http").request("http://localhost", {
      port: 3000,
      method: "post",
      headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
    req.write(JSON.stringify(["music_bot", decycle(json)]));
    req.on('error', err => console.log(err));
    req.end();
  } catch (e) {
    console.error(e);
    console.log("json記録中にエラーが発生しました。エラー内容をあんこかずなみ36#5008にお送りください。");
  };
};

/**
 * 秒のデータを文字列として置き換えます。
 * @param seconds - 秒数を入力します。
 * @returns - 時間、分、秒が組み合わさった文字列を出力します。
 */
const timeString = async seconds => {
  try {
    let minutes = 0, hour = 0, timeset = "";
    for (minutes; seconds > 59; minutes++) seconds -= 60;
    for (hour; minutes > 59; hour++) minutes -= 60;
    if (hour != 0) timeset += hour + "時間";
    if (minutes != 0) timeset += minutes + "分";
    if (seconds != 0) timeset += seconds + "秒";
    return timeset;
  } catch (e) {
    console.error(e);
    console.log("timeStringにて計算処理中にエラーが発生しました。エラー内容をあんこかずなみ36#5008にお送りください。");
  };
};

client.login(token); //ログイン