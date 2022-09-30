const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js'); //Discord.js本体
const { entersState, createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, AudioPlayerStatus } = require('@discordjs/voice'); //Discord.jsVoice
const ytdl = require('ytdl-core'); //YouTube取得用
require("dotenv").config(); //envデータ取得用(Glitchでは不要)
const config = { prefix: "!" }; //json
const token = process.env.token; //トークン
const client = new Client({
  partials: [Partials.Channel],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
}); //クライアント
client.on("ready", () => {
  console.log("準備おっけい！"); //準備OK通知
});

let dynamic = {
  connection: "", //接続や切断を管理
  stream: "", //ストリーム
  resource: "", //プレイヤーの管理をするやつ？音量変更に使用
  vilist: [], //プレイリスト機能に使用する。URLを入れる
  playing: false, //再生中かどうかを判断
  playmeta: { name: "", url: "", title: "", time: "", thumbnails: "" }, //再生中の曲のURLを保存
  volumes: 50, //音量を設定
};
client.on("messageCreate", async message => {
  if (message.author.bot) return; //チャット送信者がbotならリターン(終了)

  if (message.content.startsWith(config.prefix)) {
    const subcontent = message.content.split(" ")[1]; //これはテキストにスペースがあれば、そのスペースを挟んでる文字列を取り出すコード(説明がごみ)
    let command = message.content.split(" ")[0].slice(config.prefix.length).trim().split(/ +/g)[0]; //prefixを排除する
    switch (command) {
      case "add":
        if (!ytdl.validateURL(subcontent)) return message.reply("`" + subcontent + "`が理解できませんでした..."); //ytdlがURL解析してくれるらしい
        const videoid = ytdl.getURLVideoID(subcontent);
        let uname = message.author.username;
        let titled, times, timem = 0, thumbnails;
        await ytdl.getInfo(subcontent).then(info => {
          titled = info.player_response.videoDetails.title;
          times = info.player_response.videoDetails.lengthSeconds;
          let th = info.player_response.videoDetails.thumbnail.thumbnails[0].url;
          thumbnails = th.split("?")[0];
          for (timem; times > 59; timem++) times -= 60;
        });
        dynamic.vilist.push({ url: videoid, username: uname, title: titled, time: timem + "分" + times + "秒", thumbnails: thumbnails });
        message.reply(await voicestatus(0, 1, 0, 2, "追加ができました！"));
        break;
      case "play":
        if (dynamic.playing) return message.reply("既に再生をしています。");
        if (!message.member.voice.channel) return message.reply(message.author.username + "さんがボイスチャットにいません...\n入ってからまたやってみてくださいね！");
        if (!dynamic.vilist[0]) return message.reply("プレイリストが空です...`add [URL]`でプレイリストに追加してください！");
        dynamic.connection = joinVoiceChannel({ //うまく説明はできないけど、ボイスチャンネル参加
          adapterCreator: message.guild.voiceAdapterCreator, //わからん
          channelId: message.member.voice.channel.id, //VoiceChannelを設定
          guildId: message.guildId, //サーバーIDを設定
          selfDeaf: true //多分スピーカーミュート
        });
        ytplay();
        message.reply(await voicestatus(1, 1, 1, 1, "曲の再生を始めます！"));
        break;
      case "stop":
        if (!dynamic.playing) return message.reply("現在、音楽を再生していません。後で実行してください。");
        dynamic.stream.destroy(); //ストリームの切断
        dynamic.connection.destroy(); //VCの切断
        dynamic.playmeta.name = "";
        dynamic.playmeta.url = "";
        dynamic.playmeta.title = "";
        message.reply(await voicestatus(0, 1, 0, 0, "曲を止めました...(´・ω・｀)"));
        dynamic.playing = false;
        break;
      case "skip":
        if (!dynamic.playing) return message.reply("現在、音楽を再生していません。後で実行してください。");
        dynamic.stream.destroy(); //ストリームの切断
        if (dynamic.vilist[0]) {
          ytplay();
          message.reply((await voicestatus(1, 1, 1, 1, "次の曲を再生しますねぇ")));
        } else {
          message.reply("うまく動作ができていません。エラーの可能性がありますので、この状態になるまでの動きを\n`あんこかずなみ36#5008`にお伝えください。ログには記録済みです。");
        };
        break;
      case "volume":
        let volumes = subcontent;
        if (volumes < 0) {
          volumes = 0;
        } else if (volumes > 100) {
          volumes = 100;
        };
        if (dynamic.playing) dynamic.resource.volume.volume = volumes / 100;
        dynamic.volumes = volumes;
        message.reply(await voicestatus(0, 0, 1, 0, "音量を変更しました！"));
        break;
      case "status":
        message.reply((await voicestatus(1, 1, 1, 1, "現在のすべての状態を表示しまーすっ")));
    };
  };
});
const ytplay = async () => {
  if (dynamic.vilist[0]) {
    dynamic.playmeta.url = dynamic.vilist[0].url;
    dynamic.playmeta.name = dynamic.vilist[0].username;
    dynamic.playmeta.title = dynamic.vilist[0].title;
    dynamic.playmeta.time = dynamic.vilist[0].time;
    dynamic.playmeta.thumbnails = dynamic.vilist[0].thumbnails;
    dynamic.vilist.shift();
  };
  let player = createAudioPlayer(); //多分音声を再生するためのもの
  dynamic.connection.subscribe(player); //connectionにplayerを登録？
  dynamic.stream = ytdl(dynamic.playmeta.url, { //ytdlで音声をダウンロードする
    filter: format => format.audioCodec === 'opus' && format.container === 'webm', //多分これで音声だけ抽出してる
    quality: "highest", //品質
    highWaterMark: 32 * 1024 * 1024, //メモリキャッシュする量
  });
  dynamic.resource = createAudioResource(dynamic.stream, { inputType: StreamType.WebmOpus, inlineVolume: true }); //多分streamのデータを形式とともに入れる？
  dynamic.resource.volume.setVolume(dynamic.volumes / 100); //音量調節

  player.play(dynamic.resource); //再生
  dynamic.playing = true;
  await entersState(player, AudioPlayerStatus.Playing, 10 * 1000);
  await entersState(player, AudioPlayerStatus.Idle, 24 * 60 * 60 * 1000);
  ytplay();
};
const voicestatus = async (p, l, v, t, content) => {
  let vilist = "";
  let viplay = "```タイトル: " + dynamic.playmeta.title + "\n動画時間: " + dynamic.playmeta.time + "\nURL: https://youtu.be/" + dynamic.playmeta.url + "\n追加者: " + dynamic.playmeta.name + "```";
  for (let i = 0; i != dynamic.vilist.length; i++) {
    vilist += (i + 1) + "本目";
    if (i == 0) vilist += "(次再生されます。)";
    vilist += "\n```タイトル: " + dynamic.vilist[i].title + "\n動画時間: " + dynamic.vilist[i].time + "\nURL: https://youtu.be/" + dynamic.vilist[i].url + "\n追加者: " + dynamic.vilist[i].username + "```";
  };
  if (!dynamic.vilist[0]) vilist = "リストの内容はありません。";
  if (!dynamic.playing) viplay = "現在再生されていません。";
  let embed = new EmbedBuilder().setTitle("状態");
  let description = "主に";
  if (p == 1) {
    embed.addFields({ name: "再生中の曲の詳細", value: viplay });
    if (description != "主に") description += "、";
    description += "再生中の曲";
  };
  if (l == 1) {
    embed.addFields({ name: "再生リスト", value: vilist });
    if (description != "主に") description += "、";
    description += "再生リスト";
  };
  if (v == 1) {
    embed.addFields({ name: "音量", value: String(dynamic.volumes) + "%" });
    if (description != "主に") description += "、";
    description += "音量";
  };
  if (t == 1 && dynamic.playing) {
    embed.setThumbnail(dynamic.playmeta.thumbnails);
  };
  if (t == 1 && !dynamic.playing || t == 2) {
    embed.setThumbnail(dynamic.vilist[dynamic.vilist.length - 1].thumbnails);
  };
  description += "を表示します。";
  if (p == 1 && l == 1 && v == 1) description = "全ての状態を表示します。";
  embed.setDescription(description);
  return { content: content, embeds: [embed] };
};

client.login(token); //ログイン