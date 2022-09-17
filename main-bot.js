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

client.on("messageCreate", async message => {
  if (message.author.bot) return; //チャット送信者がbotならリターン(終了)

  if (message.content.startsWith(config.prefix)) {
    var connd = message.content.split(" "); //これはテキストにスペースがあれば、そのスペースを挟んでる文字列を取り出すコード(説明がごみ)
    var channel = message.member.voice.channel;
    if (connd[1] == "play") {
      var url = connd[2]; //URL設定
      if (!ytdl.validateURL(url)) return message.reply("`" + url + "`が理解できませんでした..."); //ytdlがURL解析してくれるらしい
      if (!channel) return message.reply(message.author.username + "さんがボイスチャットにいません...\n入ってからまたやってみてくださいね！"); //ボイスチャンネルにいるかの存在確認
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
      const resource = createAudioResource(stream, { inputType: StreamType.WebmOpus }); //多分streamのデータを形式とともに入れる？
      // 再生
      player.play(resource); //再生
      await entersState(player, AudioPlayerStatus.Playing, 10 * 1000);
      await entersState(player, AudioPlayerStatus.Idle, 24 * 60 * 60 * 1000);
      connection.destroy();
    } else if (connd[1] == "stop") {
      stream.destroy(); //ストリームの切断？わからん
      connection.destroy(); //VCの切断
    };
  };
});

client.login(token); //ログイン