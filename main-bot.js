const { Client, GatewayIntentBits, Partials, EmbedBuilder, SlashCommandBuilder, BaseChannel, ApplicationCommandOptionType, ChannelType } = require('discord.js'); //Discord.js本体
const { entersState, createAudioPlayer, createAudioResource, joinVoiceChannel, getVoiceConnections, VoiceConnection, StreamType, AudioPlayerStatus } = require('@discordjs/voice'); //Discord.jsVoice
const ytdl = require('ytdl-core'); //YouTube取得用
const { getInfo } = require('ytdl-core');
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

let connection; //接続や切断を管理
let stream; //ストリーム？
let list = []; //プレイリスト機能に使用する。URLを入れる予定
let playmeta = { name: "", url: "", title: "", time: "", thumbnails: "" }; //再生中の曲のURLを保存
let resource; //プレイヤーの管理をするやつ？音量変更に使用
let playing; //再生中かどうかを判断
let volumes = 0.5; //音量を設定

client.on("messageCreate", async message => {
  if (message.author.bot) return; //チャット送信者がbotならリターン(終了)

  if (message.content.startsWith(config.prefix)) {
    let subcontent = message.content.split(" ")[1]; //これはテキストにスペースがあれば、そのスペースを挟んでる文字列を取り出すコード(説明がごみ)
    let command = message.content.split(" ")[0].slice(config.prefix.length).trim().split(/ +/g)[0]; //prefixを排除する
    switch (command) {
      case "add":
        const url = subcontent;
        if (!ytdl.validateURL(url)) return message.reply("`" + url + "`が理解できませんでした...");  //警告 ytdlがURL解析する？
        let uname = message.author.username;
        let titled, times, timem = 0, thumbnails;
        await ytdl.getInfo(url).then(info => {
          titled = info.player_response.videoDetails.title;
          times = info.player_response.videoDetails.lengthSeconds;
          let th = info.player_response.videoDetails.thumbnail.thumbnails[0].url;
          thumbnails = th.split("?")[0];
          for (timem; times > 59; timem++) times -= 60;
        });
        list.push({ url: url, username: uname, title: titled, time: timem + "分" + times + "秒", thumbnails: thumbnails });
        message.reply(await voicestatus(0, 1, 0, 2, "追加ができました！")); //お知らせ
        break;
      case "play":
        if (playing) return message.reply("既に再生をしています。"); //警告
        if (!message.member.voice.channel) return message.reply(message.author.username + "さんがボイスチャットにいません...\n入ってからまたやってみてくださいね！"); //警告
        if (!list[0]) return message.reply("プレイリストが空です...`add [URL]`でプレイリストに追加してください！"); //警告
        connection = joinVoiceChannel({ //うまく説明はできないけど、ボイスチャンネル参加
          adapterCreator: message.guild.voiceAdapterCreator, //わからん
          channelId: message.member.voice.channel.id, //VoiceChannelを設定
          guildId: message.guildId, //サーバーIDを設定
          selfDeaf: true //多分スピーカーミュート
        });
        ytplay();
        message.reply(await voicestatus(1, 1, 1, 1, "曲の再生を始めます！")); //お知らせ
        break;
      case "stop":
        if (!playing) return message.reply("現在、音楽を再生していません。後で実行してください。");
        stream.destroy(); //ストリームの切断？わからん
        connection.destroy(); //VCの切断
        playmeta.name = "";
        playmeta.url = "";
        message.reply(await voicestatus(0, 1, 0, 0, "曲を止めました...(´・ω・｀)")); //お知らせ
        playing = false;
        break;
      case "skip":
        if (!playing) return message.reply("現在、音楽を再生していません。後で実行してください。");
        stream.destroy(); //ストリームの切断？わからん
        if (list[0]) {
          ytplay();
          message.reply((await voicestatus(1, 1, 1, 1, "次の曲を再生しますねぇ"))); //お知らせ
        } else {
          message.reply("うまく動作ができていません。エラーの可能性がありますので、この状態になるまでの動きを\n`あんこかずなみ36#5008`にお伝えください。");
        };
        break;
      case "volume":
        let volume = (subcontent / 100);
        if (volume < 0) {
          volume = 0;
        } else if (volume > 100) {
          volume = 100;
        };
        if (playing) resource.volume.volume = volume;
        volumes = volume;
        message.reply(await voicestatus(0, 0, 1, 0, "音量を変更しました！"));
        break;
      case "status":
        message.reply((await voicestatus(1, 1, 1, 1, "現在のすべての状態を表示しまーすっ")));
    };
  };
});
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  switch (interaction.commandName) {
    case "add":
      const url = interaction.options.getString("url");
      if (!ytdl.validateURL(url)) return interaction.reply("`" + url + "`が理解できませんでした..."); //ytdlがURL解析してくれるらしい
      let uname = interaction.user.username;
      let titled, times, timem = 0, thumbnails;
      await getInfo(url).then(info => {
        titled = info.player_response.videoDetails.title;
        times = info.player_response.videoDetails.lengthSeconds;
        let th = info.player_response.videoDetails.thumbnail.thumbnails[0].url;
        thumbnails = th.split("?")[0];
        for (timem; times > 59; timem++) times -= 60;
      });
      list.push({ url: url, username: uname, title: titled, time: timem + "分" + times + "秒", thumbnails: thumbnails });
      interaction.reply(await voicestatus(0, 1, 0, 2, "追加ができました！"));
      break;
    case "play":
      if (playing) return interaction.reply("既に再生をしています。");
      if (!interaction.member.voice.channel) return message.reply(message.author.username + "さんがボイスチャットにいません...\n入ってからまたやってみてくださいね！");
      if (!list[0]) return interaction.reply("プレイリストが空です...`add [URL]`でプレイリストに追加してください！");
      connection = joinVoiceChannel({ //うまく説明はできないけど、ボイスチャンネル参加
        adapterCreator: interaction.guild.voiceAdapterCreator, //わからん
        channelId: interaction.member.voice.channel.id, //VoiceChannelを設定
        guildId: interaction.guildId, //サーバーIDを設定
        selfDeaf: true //多分スピーカーミュート
      });
      ytplay();
      interaction.reply(await voicestatus(1, 1, 1, 1, "曲の再生を始めます！"));
      break;
    case "stop":
      if (!playing) return interaction.reply("現在、音楽を再生していません。後で実行してください。");
      stream.destroy(); //ストリームの切断？わからん
      connection.destroy(); //VCの切断
      playmeta.name = "";
      playmeta.url = "";
      playmeta.title = "";
      interaction.reply(await voicestatus(0, 1, 0, 0, "曲を止めました...(´・ω・｀)"));
      playing = false;
      break;
    case "skip":
      if (!playing) return interaction.reply("現在、音楽を再生していません。後で実行してください。");
      stream.destroy(); //ストリームの切断？わからん
      if (list[0]) {
        ytplay();
        interaction.reply((await voicestatus(1, 1, 1, 1, "次の曲を再生しますねぇ")));
      } else {
        interaction.reply("うまく動作ができていません。エラーの可能性がありますので、この状態になるまでの動きを\n`あんこかずなみ36#5008`にお伝えください。ログには記録済みです。");
      };
      break;
    case "volume":
      let volume = (interaction.options.getNumber("vol") / 100);
      if (volume < 0) {
        volume = 0;
      } else if (volume > 100) {
        volume = 100;
      };
      if (playing) resource.volume.volume = volume;
      volumes = volume;
      interaction.reply(await voicestatus(0, 0, 1, 0, "音量を変更しました！"));
      break;
    case "status":
      interaction.reply((await voicestatus(1, 1, 1, 1, "現在のすべての状態を表示しまーすっ")));
  };
});

const ytplay = async () => {
  if (list[0]) {
    playmeta.url = list[0].url;
    playmeta.name = list[0].username;
    playmeta.title = list[0].title;
    playmeta.time = list[0].time;
    playmeta.thumbnails = list[0].thumbnails;
    list.shift();
  };
  let player = createAudioPlayer(); //多分音声を再生するためのもの
  connection.subscribe(player); //connectionにplayerを登録？
  stream = ytdl(ytdl.getURLVideoID(playmeta.url), { //ストリームを使うらしいけど、意味わからない
    filter: format => format.audioCodec === 'opus' && format.container === 'webm', //多分これで音声だけ抽出してる
    quality: "highest", //品質
    highWaterMark: 32 * 1024 * 1024, //メモリキャッシュする量
  });
  resource = createAudioResource(stream, { inputType: StreamType.WebmOpus, inlineVolume: true }); //多分streamのデータを形式とともに入れる？
  resource.volume.setVolume(volumes); //音量調節

  player.play(resource); //再生
  playing = true;
  await entersState(player, AudioPlayerStatus.Playing, 10 * 1000);
  await entersState(player, AudioPlayerStatus.Idle, 24 * 60 * 60 * 1000);
  ytplay();
};
const voicestatus = async (p, l, v, t, content) => {
  let vilist = "";
  let viplay = "```タイトル: " + playmeta.title + "\n動画時間: " + playmeta.time + "\nURL: " + playmeta.url + "\n追加者: " + playmeta.name + "```";
  for (let i = 0; i != list.length; i++) {
    vilist += (i + 1) + "本目";
    if (i == 0) vilist += "(次再生されます。)";
    vilist += "\n```タイトル: " + list[i].title + "\n動画時間: " + list[i].time + "\nURL: " + list[i].url + "\n追加者: " + list[i].username + "```";
  };
  if (!list[0]) vilist = "リストの内容はありません。";
  if (!playing) viplay = "現在再生されていません。";
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
    embed.addFields({ name: "音量", value: String(volumes * 100) + "%" });
    if (description != "主に") description += "、";
    description += "音量";
  };
  if (t == 1 && playing) {
    embed.setThumbnail(playmeta.thumbnails);
  };
  if (t == 1 && !playing || t == 2) {
    embed.setThumbnail(list[0].thumbnails);
  };
  description += "を表示します。";
  embed.setDescription(description);
  if (p == 1 && l == 1 && v == 1) description = "全ての状態を表示します。";
  return { content: content, embeds: [embed] };
};

client.login(token); //ログイン