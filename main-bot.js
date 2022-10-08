const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js'); //Discord.js本体
const { entersState, createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, AudioPlayerStatus } = require('@discordjs/voice'); //Discord.jsVoice
const ytdl = require('ytdl-core'); //YouTube Downloadのコア
const fs = require("fs"); //ファイル書き込みや読み込み
require("dotenv").config(); //envデータ取得用(Glitchでは不要)
const { decycle } = require("json-cyclic"); //json管理に必須
require("./response.js"); //常時実行するために呼び出す専用のファイルを読み込む
const config = { prefix: "voice!" }; //json
const token = process.env.token; //トークン
const client = new Client({
  partials: [Partials.Channel],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
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
  console.log("準備おっけい！");
  if (!fs.existsSync("data.json")) fs.writeFileSync("data.json", JSON.stringify(voice));
  fs.readFileSync("data.json", (err, data) => {
    if (err) {
      console.log("jsonの内容が破損、または取得が出来ないためファイルを再作成します。");
      if (fs.existsSync("data.json")) fs.unlinkSync("data.json");
      fs.writeFileSync("data.json", JSON.stringify(voice));
    } else {
      voice = JSON.parse(data);
      client.user.setPresence({
        activities: [{
          name: "There are " + Object.keys(voice.youtubecache).length + " songs."
        }],
        status: "online"
      });
    };
  });
}); //準備OK通知

client.on("messageCreate", async message => { //メッセージを受信したら
  if (message.author.bot) return; //チャット送信者がbotならリターン(終了)

  if (message.content.startsWith(config.prefix)) { //最初にPrefix文字列があれば
    const incommands = message.content.split(" "); //スペースを参考に配列を生成する
    const command = incommands[0].slice(config.prefix.length).trim().split(/ +/g)[0]; //Prefixを取り除く
    const subcontent = incommands[1]; //2番目の文字列を受け取る

    if (!voice.server[message.guildId]) voice.server[message.guildId] = JSON.parse(JSON.stringify(voice.default.guild)); //サーバー用オブジェクト初期化
    const server = voice.server[message.guildId]; //コード見やすくするための
    const channel = String(message.member.voice.channelId); //ボイスチャンネルの場所を取得
    console.log(command);
    console.log(subcontent);
    console.log(channel);
    if (channel == "null") return message.reply({ //ボイスチャット未参加の場合リターン
      content: "ボイスチャットに参加していないようです...\n" +
        "僕のbotはボイスチャットに参加しないと何もできない仕様なので、ご了承くださいm_ _m"
    });
    if (!server.channellist[channel]) server.channellist[channel] = JSON.parse(JSON.stringify(voice.default.channel)); //チャンネル用オブジェクト初期化
    switch (command) {
      case "add": {
        if (!subcontent) return message.reply({ content: "URLを指定しましょう...\n`" + config.prefix + "add [URL]`" }); //URLがない場合
        if (!ytdl.validateURL(subcontent)) return message.reply({ content: "送られたものがYouTube用のURLではないみたいです...\n" + "内容: " + subcontent }); //URLが認識できない場合
        const videoid = ytdl.getURLVideoID(subcontent); //URLからVideoIDを取得
        if (!voice.youtubecache[videoid]) await ytdl.getInfo(subcontent).then(info => voice.youtubecache[videoid] = info.player_response.videoDetails); //youtubeのデータがキャッシュされてなかったら取得
        client.user.setPresence({
          activities: [{
            name: "There are " + Object.keys(voice.youtubecache).length + " songs."
          }],
          status: "online"
        });
        server.channellist[channel].playlist.push({ //再生リストに追加
          url: videoid, //VideoIDを保管
          user: message.author.id //追加者を記録
        });
        if (voice.default.audiocache) { //音声ファイルをキャッシュするかどうかを確認してから
          if (!fs.existsSync("ytaudio")) fs.mkdirSync("ytaudio"); //フォルダがなければ作成
          if (!fs.existsSync("ytaudio/" + videoid + ".mp3")) ytdl(videoid, { filter: "audioonly", quality: "highest" }).pipe(fs.createWriteStream("ytaudio/" + videoid + ".mp3")); //YouTubeの音声ファイルが無ければ取得(非同期
        };
        message.reply({ //追加を通知
          content: "再生リストに追加しました！",
          embeds: [new EmbedBuilder()
            .setTitle("**" + voice.youtubecache[videoid].title + "**")
            .setDescription("再生時間: " + (await timeString(voice.youtubecache[videoid].lengthSeconds)))
            .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
            .setURL("https://youtu.be/" + videoid)
            .setThumbnail("https://i.ytimg.com/vi/" + videoid + "/hqdefault.jpg")
          ]
        });
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
        message.reply({ //追加を通知
          content: "再生を始めます！",
          embeds: [new EmbedBuilder()
            .setTitle("**" + voice.youtubecache[server.channellist[channel].playing.url].title + "**")
            .setDescription("再生時間: " + (await timeString(voice.youtubecache[server.channellist[channel].playing.url].lengthSeconds)))
            .setAuthor({ name: client.users.cache.get(server.channellist[channel].playing.user).username, iconURL: client.users.cache.get(server.channellist[channel].playing.user).avatarURL() })
            .setURL("https://youtu.be/" + server.channellist[channel].playing.url)
            .setThumbnail("https://i.ytimg.com/vi/" + server.channellist[channel].playing.url + "/hqdefault.jpg")
          ]
        });
        break;
      }
      case "stop": {
        if (server.playing != channel) return message.reply({ content: "現在音楽を再生していません..." }); //そのチャンネルで再生をしていない場合
        if (!voice.default.audiocache) server.ytstream.destroy(); //音声ファイルをキャッシュしないか確認してから、ストリームを切断
        server.connection.destroy(); //ボイスチャット切断
        server.playing = null; //再生中のチャンネル場所を破棄
        message.reply({ content: "再生を停止しました！" });
        break;
      }
      case "skip": {
        if (server.playing != channel) return message.reply({ content: "現在音楽を再生していません..." }); //そのチャンネルで再生をしていない場合
        ytplay(message.guildId, channel);
        message.reply({ //追加を通知
          content: "次の曲の再生を始めます！",
          embeds: [new EmbedBuilder()
            .setTitle("**" + voice.youtubecache[server.channellist[channel].playing.url].title + "**")
            .setDescription("再生時間: " + (await timeString(voice.youtubecache[server.channellist[channel].playing.url].lengthSeconds)))
            .setAuthor({ name: client.users.cache.get(server.channellist[channel].playing.user).username, iconURL: client.users.cache.get(server.channellist[channel].playing.user).avatarURL() })
            .setURL("https://youtu.be/" + server.channellist[channel].playing.url)
            .setThumbnail("https://i.ytimg.com/vi/" + server.channellist[channel].playing.url + "/hqdefault.jpg")
          ]
        });
        break;
      }
      case "volume": {
        let volume = Number(subcontent);
        if (volume == NaN) return message.reply({ content: "`" + volume + "`が理解できませんでした..." });
        if (volume < 0) {
          volume = 0;
        } else if (volume > 100) {
          volume = 100;
        };
        if (server.playing == channel) server.resource.volume.volume = volume / 100;
        server.channellist[channel].volume = volume;
        message.reply({ content: "音量を" + volume + "%にしました！" });
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
        message.reply({ content: "リピート状態を**" + repeat + "**に変更しました！" });
        break;
      }
      case "remove": {
        if (!server.channellist[channel].playlist[0]) return message.reply({ content: "再生リストが空です...`" + config.prefix + "add [URL]`を使用して追加してくださいっ" }); //再生リストがない場合
        const number = Number(subcontent);
        if (number > server.channellist[channel].playlist.length || number < 0) return message.reply("受け取った値がよろしくなかったようです...もう一度やり増しましょう...！");
        if (number == 0) {
          server.channellist[channel].playlist.splice(0);
          message.reply({ content: "削除しました～" });
        } else {
          let data = JSON.parse(JSON.stringify(server.channellist[channel].playlist[number - 1]));
          server.channellist[channel].playlist.splice((number - 1), 1);
          message.reply({
            content: "削除しました～",
            embeds: [new EmbedBuilder()
              .setTitle("**" + voice.youtubecache[data.url].title + "**")
              .setDescription("再生時間: " + (await timeString(voice.youtubecache[data.url].lengthSeconds)))
              .setAuthor({ name: client.users.cache.get(data.user).username, iconURL: client.users.cache.get(data.user).avatarURL() })
              .setURL("https://youtu.be/" + data.url)
              .setThumbnail("https://i.ytimg.com/vi/" + data.url + "/hqdefault.jpg")
            ]
          });
        };
        break;
      }
    };
    savejson();
  };
});

const ytplay = async (guildId, voiceid) => {
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
      server.ytstream = ytdl(server.channellist[voiceid].playing.url, {  //ytdlでリアルタイムダウンロード
        filter: format => format.audioCodec === 'opus' && format.container === 'webm', //取り出すデータ
      quality: "highest", //品質
      highWaterMark: 32 * 1024 * 1024, //メモリキャッシュする量 
    });
    };
    const player = createAudioPlayer(); //多分音声を再生するためのもの
    server.connection.subscribe(player); //connectionにplayerを登録？
    server.resource = createAudioResource(server.ytstream, { inputType: StreamType.WebmOpus, inlineVolume: true }); //ytdlのストリームで取得できた音声ファイルを読み込む
    server.resource.volume.setVolume(server.channellist[voiceid].volume / 100); //音量調節

    player.play(server.resource); //再生
    await entersState(player, AudioPlayerStatus.Playing); //再生が始まるまでawaitで待機
    await entersState(player, AudioPlayerStatus.Idle); //再生リソースがなくなる(再生が終わる)まで待機
    savejson();
    continue;
  };
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

const savejson = () => {
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
  fs.writeFile("data.json", JSON.stringify(decycle(json), null, "\t"), e => { if (e) throw e; });
};

client.login(token); //ログイン