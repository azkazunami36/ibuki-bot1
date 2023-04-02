import ytdl from "ytdl-core";
import discord from "discord.js";
import discordjsvoice, { getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import ytpl from "ytpl";
import readline from "readline";
import dotenv from "dotenv";
import fs from "fs";
import request from "request";
import yts from "yt-search";

const {
  Client,
  Partials,
  GatewayIntentBits,
  EmbedBuilder,
  Events,
  Status
} = discord;
dotenv.config();
const {

} = discordjsvoice;
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

/**
 * このクラスは同期関数のみのため、複数を同時利用しても競合が起こることはありません。
 */
class dataManager {
  /**
   * 全データを司ります。
   */
  data: {
    /**
     * botに応答するために最初に入力するキーワードです。
     */
    prefix?: string;
    /**
     * VideoIDに関連付けられた動画の詳細データをここに保存します。
     * 高速化を狙います。
     */
    ytdlDatas?: {
      [videoId: string]: ytdl.MoreVideoDetails;
    };
    /**
     * サーバーIDに関連付けたデータにアクセスするために使用します。
     */
    guilds?: {
      [guildId: string]: {
        /**
         * チャンネルIDに関連付けたデータにアクセスするために使用します。
         */
        channels?: {
          [channel: string]: {
            /**
             * VideoIDの配列を使用したプレイリストです。
             */
            playList: string[];
            /**
             * プレイリストから再生中のVideoIDを指定するのに使用します。
             */
            playing: number;
            /**
             * 音量を保存します。
             */
            volumes: number;
          };
        }
      };
    };
    /**
     * ユーザーIDに関連付けられたデータにアクセスするために使用します。
     */
    authors?: {
      [authorId: string]: {
        /**
         * ユーザー専用の自分用プレイリストを保存します。
         */
        myPlayList: {
          [playListName: string]: string[]
        }
      }
    }
  } = {};
  private filename = "data.json";
  constructor() {
    const fileExist = fs.existsSync(this.filename);
    if (fileExist) {
      this.data = JSON.parse(String(fs.readFileSync(this.filename)));
    } else {
      this.data = {
        prefix: "v"
      };
      this.save();
    }
  }
  save() {
    fs.writeFileSync(this.filename, JSON.stringify(this.data));
  }
}
class ytdlTools {
  dataMgr: dataManager;
  constructor() {
    this.dataMgr = new dataManager;
  }
  async getInfo(url: string) {
    const videoId = await this.getVideoId(url);
    if (videoId.errorCode === 0 && videoId.content) {
      const data = this.dataMgr.data
      if (!data.ytdlDatas) {
        data.ytdlDatas = {};
        this.dataMgr.save();
      }
      if (!data.ytdlDatas[videoId.content]) {
        data.ytdlDatas[videoId.content] = (await ytdl.getInfo(videoId.content)).videoDetails;
        this.dataMgr.save();
      }
      return data.ytdlDatas[videoId.content];
    }
    return null;
  }
  async getVideoId(string: string): Promise<{
    content?: string;
    errorCode: 0 | 1 | 2;
  }> {
    let videoId = string;
    if (ytdl.validateURL(videoId)) videoId = ytdl.getVideoID(videoId);
    if (ytdl.validateID(videoId)) { //VideoIDではない場合
      if (await new Promise(resolve => request.get({ //このifでそのほかのURLかどうかを検査
        url: videoId,
        headers: {
          "content-type": "text/plain"
        }
      }, resolve))) {
        const data = await yts({ query: videoId }); //検索
        if (data.videos[0]) videoId = data.videos[0].videoId; //検索から取得する
        else {
          return { errorCode: 1 }; //入力されたデータから動画を取得できない時に。
        }
      } else {
        return { errorCode: 2 }; //YouTubeのURLではないときに。
      }
    }
    return { content: videoId, errorCode: 0 };
  }
}

class discordTools {
  dataMgr: dataManager;
  constructor() {
    this.dataMgr = new dataManager;
  }
  /**
   * 保存されている音楽数を更新する際に使用します。
   * @param client client.onなどに使うclientを入力してください。
   */
  statusSetting(client: discord.Client<boolean>) {
    client.user?.setPresence({
      activities: [{
        name: "現在は" + (() => {
          if (this.dataMgr.data.ytdlDatas) return Object.keys(this.dataMgr.data.ytdlDatas).length
          else return 0;
        })() + "個の音楽が収録済み"
      }],
      status: "online"
    });
  }
  /**
   * send()やreply()等に使用する、楽々関数です。  
   * embed等を都度作成し、自動的にリストなども作成できるものです。
   * @param content ユーザーに送信したいメッセージを表示します。
   * @param videoId YouTubeのVideoIDを入力すると、自動で動画データをEmbedに表示します。
   * @param option 手動で調整したいものを指定します。
   * @returns 
   */
  async msgVList(content: string, options?: { //入力
    /**
     * 埋め込みに使用するタイトルをカスタマイズします。
     */
    customEmbedTitle?: string;
    /**
     * 埋め込みに使用する説明をカスタマイズします。
     */
    customEmbedDescription?: string;
    /**
     * 再生中の動画として埋め込みに大きく表示します。
     */
    videoId?: string;
    /**
     * VideoIDなどのリストを利用することで、一覧を表示することができます。
     */
    list?: {
      /**
       * VideoIDを配列で入力してください。
       */
      videoIds: string[];
      /**
       * ５つ以上でページ別になるため、指定番号を入力してください。  
       * 大きすぎる数字は自動で修正されます。
       */
      index: number;
      /**
       * 再生中の曲として表示したい番号を入力してください。
       */
      playing: number;
    };
  }) { //関数開始
    const message: {
      content: string;
      embed?: discord.EmbedBuilder;
    } = {
      content: content
    };
    const embed = new EmbedBuilder();
    if (options) {
      if (options.videoId) {
        const ytdlTool = new ytdlTools();
        const videoData = await ytdlTool.getInfo(options.videoId);
        if (videoData) {
          embed.setTitle("**" + "**");
          embed.setDescription("現在再生中の音楽を表示します。");
          embed.setThumbnail(videoData.thumbnails[videoData.thumbnails.length - 1].url);
          embed.setAuthor({
            name: videoData.author.name,
            iconURL: (() => {
              const authorThumbnails = videoData.author.thumbnails;
              if (authorThumbnails) return authorThumbnails[authorThumbnails.length - 1].url;
            })()
          });
          message.embed = embed;
        }
      }
      if (options.list) {
        const playlist: {
          name: string;
          value: string;
        }[][] = [[]]
        const ytdlTool = new ytdlTools();
        for (let i = 0; i !== options.list.videoIds.length; i++) {
          //ページ内の配列が5だったら次ページを作成し、そこに追加する。
          if (playlist[playlist.length - 1].length === 4) playlist.push([]);
          const videoData = await ytdlTool.getInfo(options.list.videoIds[i]);
          const bold = (i === options.list.playing) ? "**" : ""; //再生中の場合文字を太くする。
          if (videoData) playlist[playlist.length - 1].push({
            name: bold + (i + 1) + ": " + videoData.title + bold,
            value: "再生時間: " + discordTools.timeString(Number(videoData.lengthSeconds))
          });
        }
        const index = (() => {
          const index = options.list.index;
          if (index > playlist.length - 1) return playlist.length - 1;
          return index;
        })();
        embed.setDescription(
          "再生リスト一覧を表示します。(" +
          (index + 1) + "/" + playlist.length +
          ")"
        );
        embed.addFields(playlist[index]);
        message.embed = embed;
      }
    }
    return message;
  }
  static timeString(seconds: number) {
    let minutes = 0, hour = 0, timeset = "";
    for (minutes; seconds > 59; minutes++) seconds -= 60;
    for (hour; minutes > 59; hour++) minutes -= 60;
    if (hour != 0) timeset += hour + "時間";
    if (minutes != 0) timeset += minutes + "分";
    if (seconds != 0) timeset += seconds + "秒";
    return timeset;
  };
}

client.on(Events.ClientReady, client => {
  const user = client.user;
  console.log(user.username + "#" + user.discriminator + "さんようこそ。");
  new discordTools().statusSetting(client);
});
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return; //botメッセージをスキップ
  const dataMgr = new dataManager();
  //このbotに対してのコマンドかどうか
  if (dataMgr.data.prefix && message.content.startsWith(dataMgr.data.prefix)) {
    //必要な情報がそろっているかどうか
    if (message.member && message.guild && message.member.voice.channel) {
      const temp = {
        content: message.content,
        guildId: message.guild.id,
        channelId: message.member.voice.channel.id,
        authorId: message.author.id,
        voiceAdapterCreator: message.guild.voiceAdapterCreator,
        mainCommand: message.content.split(" ")[0].split("!")[1],
        subCommand: (() => {
          const args = message.content.split(" ");
          let string = "";
          for (let i = 1; i !== args.length; i++) {
            if (i !== 1) string += " ";
            string += args[i];
          }
          if (string === "") return null;
          return string;
        })()
      };

      if (!dataMgr.data.guilds) dataMgr.data.guilds = {};
      if (!dataMgr.data.guilds[temp.guildId]) dataMgr.data.guilds[temp.guildId] = {};
      const guildData = dataMgr.data.guilds[temp.guildId];
      if (typeof guildData.channels === "undefined") guildData.channels = {};
      if (!guildData.channels[temp.channelId]) guildData.channels[temp.channelId] = {
        playList: [],
        playing: 0,
        volumes: 50
      };
      const channelData = guildData.channels[temp.channelId];;

      const commands: { [commandName: string]: () => Promise<void> } = {
        "add": async () => {
          if (temp.subCommand === null) {
            message.reply("動画のURLが書かれていません。'" + dataMgr.data.prefix + "!add [URL]'でもう一度試してください。");
            return;
          }
          const ytdlTool = new ytdlTools();
          const videoIDdata = await ytdlTool.getVideoId(temp.subCommand)
          if (videoIDdata.errorCode !== 0) {
            switch (videoIDdata.errorCode) {
              case 1: message.reply("テキストから検索を試みましたが、動画を見つけることができませんでした。"); break;
              case 2: message.reply("YouTubeのURLではないようです...他のURLでお試しください。"); break;
              default: message.reply("不明のエラーが発生しました。申し訳ありませんが、もう一度やり直してください。"); break;
            }
            console.log(dataMgr.data, "エラー発生のため、json内のデータを表示します。");
            return;
          }
          if (!videoIDdata.content) {
            message.reply("予想外のエラーが発生しました。理由は不明ですが、解決に取り組みます。その方法では音楽を追加することができません。今しばらくの間、ご了承ください。");
            console.log(dataMgr.data, "エラー発生のため、json内のデータを表示します。");
            return;
          }
          const videoId = videoIDdata.content;
          channelData.playList.push(videoId);
          dataMgr.save();
          message.reply(
            await new discordTools().msgVList("再生リストに追加しました！", {
              videoId: videoId,
              list: {
                videoIds: channelData.playList,
                index: channelData.playList.length - 1,
                playing: channelData.playList.length - 1
              }
            })
          );
        },
        "play": async () => {
          if (channelData.playList.length === 0) {
            message.reply(
              "再生リストに曲が１つも入っていません...\n" +
              "音楽を追加するコマンドを" + dataMgr.data.prefix + "!helpで確かめましょう。"
            );
            return;
          }
          const oldConnection = getVoiceConnection(temp.guildId);
          if (oldConnection) {
            message.reply(
              "既に音楽botを利用しているようです...\n" +
              "確認できない場合は管理人などが利用している可能性が高いため、報告しましょう。"
            );
            return;
          }
          const connection = joinVoiceChannel({
            guildId: temp.guildId,
            channelId: temp.channelId,
            adapterCreator: temp.voiceAdapterCreator
          })
        }
      };
    }
  }
});
