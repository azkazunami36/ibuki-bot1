const { Client, GatewayIntentBits, Partials, EmbedBuilder, BaseChannel, ApplicationCommandOptionType, ChannelType } = require('discord.js'); //Discord.js本体
const { entersState, createAudioPlayer, createAudioResource, joinVoiceChannel, getVoiceConnections, VoiceConnection, StreamType } = require('@discordjs/voice'); //Discord.jsVoice
const ytdl = require('ytdl-core'); //YouTube取得用
var config = { prefix: "!plays", channelid: "1013747732588023818" }; //json
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

client.on("messageCreate", async message => {
  if (message.author.bot) return; //チャット送信者がbotならリターン(終了)
  
  if (message.content.startsWith(config.prefix)) {
    var connd = message.content.split(" "); //これはテキストにスペースがあれば、そのスペースを挟んでる文字列を取り出すコード(説明がごみ)
    console.log(connd);
    if (connd[1] == "play") {
      var url = connd[2]; //URL設定
      connection = joinVoiceChannel({ //うまく説明はできないけど、ボイスチャンネル参加
        adapterCreator: message.guild.voiceAdapterCreator, //わからん
        channelId: config.channelid, //VoiceChannelを設定
        guildId: message.guildId, //サーバーIDを設定
        selfDeaf: true //多分スピーカーミュート
      });
      console.log(getVoiceConnections());
      var player = createAudioPlayer(); //多分音声を再生するためのもの
      connection.subscribe(player); //connectionにplayerを登録？
      var stream = ytdl(ytdl.getURLVideoID(url), {
        filter: format => format.audioCodec === 'opus' && format.container === 'webm', //webm opus //わからん
        quality: 'highest', //わからん
        highWaterMark: 32 * 1024 * 1024, //わからん
      });
      const resource = createAudioResource(stream, { inputType: StreamType.WebmOpus }); //多分streamのデータを形式とともに入れる？
      // 再生
      player.play(resource); //再生
    } else if (connd[1] == "stop") {
      connection.destroy();
    };
  };
});


client.login(token); //ログイン