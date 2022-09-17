const { Client, GatewayIntentBits, Partials, EmbedBuilder, BaseChannel, ApplicationCommandOptionType, ChannelType } = require('discord.js'); //Discord.js本体
const { entersState, createAudioPlayer, createAudioResource, joinVoiceChannel, getVoiceConnections, VoiceConnection, StreamType, AudioPlayerStatus } = require('@discordjs/voice'); //Discord.jsVoice
const ytdl = require('ytdl-core'); //YouTube取得用
var config = { prefix: "!" }; //json
var token = require("./token.json"); //トークン
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

var connection; //接続や切断を管理
var stream; //ストリーム？
var list = [""]; //プレイリスト機能に使用する。URLを入れる予定

client.on("messageCreate", async message => {
  if (message.author.bot) return; //チャット送信者がbotならリターン(終了)

  if (message.content.startsWith(config.prefix)) {
    var connd = message.content.split(" "); //これはテキストにスペースがあれば、そのスペースを挟んでる文字列を取り出すコード(説明がごみ)
    switch (connd[1]) { //ifのようなもので、connd[1]とcaseのものと比較する
      case "add": //addとconnd[1]が同じなら...
        var url = connd[2]; //URL設定
        console.log(connd);
        if (!ytdl.validateURL(url)) return message.reply("`" + url + "`が理解できませんでした..."); //ytdlがURL解析してくれるらしい
        list.push(url);
        console.log(list);
        break;
      case "play": //playが(ry
        console.log(list);
        if (list[1]) {
          ytplay(message);
        } else {
          message.reply("プレイリストが空です...`" + config.prefix + " add [URL]`でプレイリストに追加してください！");
        };
        break;
      case "stop":
        stream.destroy(); //ストリームの切断？わからん
        connection.destroy(); //VCの切断
        break;
    };
  };
});

const ytplay = async message => {
  var channel = message.member.voice.channel;
  if (!channel) return message.reply(message.author.username + "さんがボイスチャットにいません...\n入ってからまたやってみてくださいね！"); //ボイスチャンネルにいるかの存在確認
  var url;
  if (list[2]) {
    url = list[1];
    list.shift();
    console.log(list);
  } else {
    url = list[1];
  };
  connection = joinVoiceChannel({ //うまく説明はできないけど、ボイスチャンネル参加
    adapterCreator: message.guild.voiceAdapterCreator, //わからん
    channelId: channel.id, //VoiceChannelを設定
    guildId: message.guildId, //サーバーIDを設定
    selfDeaf: true //多分スピーカーミュート
  });
  var player = createAudioPlayer(); //多分音声を再生するためのもの
  connection.subscribe(player); //connectionにplayerを登録？
  stream = ytdl(ytdl.getURLVideoID(url), { //ストリームを使うらしいけど、意味わからない
    filter: format => format.audioCodec === 'opus' && format.container === 'webm', //webm？ opus？ しらね(いやwebmとかopusとかは知ってる)
    quality: 'highest', //わからん
    highWaterMark: 32 * 1024 * 1024, //わからん
  });
  const resource = createAudioResource(stream, { inputType: StreamType.WebmOpus, inlineVolume: true }); //多分streamのデータを形式とともに入れる？
  resource.volume.setVolume(0.8);

  player.play(resource); //再生
  await entersState(player, AudioPlayerStatus.Playing, 10 * 1000);
  await entersState(player, AudioPlayerStatus.Idle, 24 * 60 * 60 * 1000);
  ytplay(message);
};

client.login(token); //ログイン