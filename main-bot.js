const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js'); //Discord.js本体
const { entersState, createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType, AudioPlayerStatus } = require('@discordjs/voice'); //Discord.jsVoice
const ytdl = require('ytdl-core'); //YouTube Downloadのコア
require("dotenv").config(); //envデータ取得用(Glitchでは不要)
const config = { prefix: "!" }; //json
const token = process.env.token; //トークン
const client = new Client({
  partials: [Partials.Channel],     //こんなところに書いて申し訳ない　Discordのアカウントは無効になりましたって出てくる　LINE works　来れる？　reirai2387rinurinu@gmail.comに返事よろしく　2022年10月4日　から林間学校
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
client.on("ready", () => { console.log("準備おっけい！"); }); //準備OK通知
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
    const command = message.content.split(" ")[0].slice(config.prefix.length).trim().split(/ +/g)[0]; //prefixを排除する
    const subcontent = message.content.split(" ")[1]; //これはテキストにスペースがあれば、そのスペースを挟んでる文字列を取り出すコード(説明がごみ)
    switch (command) {
      case "add": //addなら...
        if (!ytdl.validateURL(subcontent)) return message.reply("`" + subcontent + "`が理解できませんでした..."); //YouTubeリンクじゃないのなら通知
        const videoid = ytdl.getURLVideoID(subcontent); //YouTubeのVideoIDを取り出す
        let titled, times, timem = 0, thumbnails; //変数
        await ytdl.getInfo(subcontent).then(info => { //動画の情報を取得する
          titled = info.player_response.videoDetails.title; //タイトル
          times = info.player_response.videoDetails.lengthSeconds; //動画秒数
          thumbnails = info.player_response.videoDetails.thumbnail.thumbnails[0].url.split("?")[0]; //サムネイルリンク(「?」より先の文字列を削除)
          for (timem; times > 59; timem++) times -= 60; //動画秒数から分数を取り出し、秒数を分数だけ60減らす
        });
        dynamic.vilist.push({ url: videoid, username: message.author.username, title: titled, time: timem + "分" + times + "秒", thumbnails: thumbnails }); //再生リストに追加
        message.reply(await voicestatus(0, 1, 0, 2, "追加ができました！")); //通知
        break; //終了
      case "play":
        if (dynamic.playing) return message.reply("既に再生をしています。"); //playingがtrueなら通知
        if (!message.member.voice.channel) return message.reply(message.author.username + "さんがボイスチャットにいません...\n入ってからまたやってみてくださいね！"); //VCに入っていなかったら通知
        if (!dynamic.vilist[0]) return message.reply("プレイリストが空です...`add [URL]`でプレイリストに追加してください！"); //再生リストが空なら通知
        dynamic.connection = joinVoiceChannel({ //ボイスチャンネル参加
          adapterCreator: message.guild.voiceAdapterCreator, //わからん
          channelId: message.member.voice.channel.id, //VoiceChannelを設定
          guildId: message.guildId, //サーバーIDを設定
          selfDeaf: true //多分スピーカーミュート
        });
        ytplay(); //関数
        message.reply(await voicestatus(1, 1, 1, 1, "曲の再生を始めます！")); //通知
        break;
      case "stop":
        if (!dynamic.playing) return message.reply("現在、音楽を再生していません。後で実行してください。"); //playingがfalseなら通知
        dynamic.stream.destroy(); //ストリームの切断
        dynamic.connection.destroy(); //VCの切断
        message.reply(await voicestatus(0, 1, 0, 0, "曲を止めました...(´・ω・｀)")); //通知
        dynamic.playing = false; //再生状況
        break;
      case "skip":
        if (!dynamic.playing) return message.reply("現在、音楽を再生していません。後で実行してください。"); //通知
        dynamic.stream.destroy(); //ストリームの切断
        if (dynamic.vilist[0]) {
          ytplay(); //関数
          message.reply((await voicestatus(1, 1, 1, 1, "次の曲を再生しますねぇ"))); //通知
        } else {
          message.reply("うまく動作ができていません。エラーの可能性がありますので、この状態になるまでの動きを\n`あんこかずなみ36#5008`にお伝えください。ログには記録済みです。"); //通知
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
        message.reply(await voicestatus(0, 0, 1, 0, "音量を変更しました！")); //通知
        break;
      case "status":
        message.reply((await voicestatus(1, 1, 1, 1, "現在のすべての状態を表示しまーすっ"))); //通知
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
