import ytdl from "ytdl-core";
import discord from "discord.js";
import discordjsvoice, { DiscordGatewayAdapterCreator } from "@discordjs/voice";
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
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnectionStatus
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
      [videoId: string]: ytdl.MoreVideoDetails | undefined;
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
          } | undefined;
        };
      } | undefined;
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
          [playListName: string]: string[] | undefined;
        };
      } | undefined;
    };
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
       * 「auto」を使用した場合、playingから自動的にページを計算して表示します。
       */
      index: number | "auto";
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
        let playPage = 0; //再生中の曲の場所を指定
        const ytdlTool = new ytdlTools();
        for (let i = 0; i !== options.list.videoIds.length; i++) {
          //ページ内の配列が5だったら次ページを作成し、そこに追加する。
          if (playlist[playlist.length - 1].length === 4) playlist.push([]);
          const videoData = await ytdlTool.getInfo(options.list.videoIds[i]);
          let bold = "";
          if (i === options.list.playing) {
            bold = "**"; //再生中の場合文字を太くする。
            playPage = playlist.length - 1; //再生ページを指定
          }
          if (videoData) playlist[playlist.length - 1].push({
            name: bold + (i + 1) + ": " + videoData.title + bold,
            value: "再生時間: " + discordTools.timeString(Number(videoData.lengthSeconds))
          });
        }
        const index = (() => {
          const index = options.list.index;
          if (index === "auto") {
            return playPage;
          } else {
            if (index > playlist.length - 1) return playlist.length - 1;
            return index;
          }
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
        messageChannelId: message.member.voice.channel.id,
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

      if (dataMgr.data.guilds === undefined) dataMgr.data.guilds = {};
      if (!dataMgr.data.guilds[temp.guildId]) dataMgr.data.guilds[temp.guildId] = {};
      /**
       * 存在しない連想配列の初期化をし、undefinedを回避します。
       * @param keyName キー名を入力します。
       * @param datas キー名が入るとされる連想配列を入力します。
       * @param set 初期化時に使用するデータを入力します。
       * @returns 参照渡しがそのまま受け継がれたデータを出力します。
       */
      const def = <T>(keyName: string, datas: { [key: string]: T | undefined }, set: T) => {
        const key = keyName;
        const objects = datas;
        let object = objects[key];
        if (object === undefined) {
          object = set;
          objects[key] = object;
        }
        return object;
      };
      const guildData = def(temp.guildId, dataMgr.data.guilds, {});
      if (guildData.channels === undefined) guildData.channels = {};
      const channelData = def(temp.channelId, guildData.channels, {
        playList: [],
        playing: 0,
        volumes: 50
      });
      if (dataMgr.data.authors === undefined) dataMgr.data.authors = {};
      const authorData = def(temp.authorId, dataMgr.data.authors, {
        myPlayList: {}
      });

      const commands: { [commandName: string]: { jaName: string, commandLine: string, program: () => Promise<void> } } = {
        "add": {
          jaName: "追加",
          commandLine: "add [url]",
          program: async () => {
            if (temp.subCommand === null) {
              await message.channel.send("動画のURLが書かれていません。'" + dataMgr.data.prefix + "!add [URL]'でもう一度試してください。");
              return;
            }
            const ytdlTool = new ytdlTools();
            const videoIDdata = await ytdlTool.getVideoId(temp.subCommand)
            if (videoIDdata.errorCode !== 0) {
              switch (videoIDdata.errorCode) {
                case 1: await message.channel.send("テキストから検索を試みましたが、動画を見つけることができませんでした。"); break;
                case 2: await message.channel.send("YouTubeのURLではないようです...他のURLでお試しください。"); break;
                default: await message.channel.send("不明のエラーが発生しました。申し訳ありませんが、もう一度やり直してください。"); break;
              }
              console.log(dataMgr.data, "エラー発生のため、json内のデータを表示します。");
              return;
            }
            if (!videoIDdata.content) {
              await message.channel.send("予想外のエラーが発生しました。理由は不明ですが、解決に取り組みます。その方法では音楽を追加することができません。今しばらくの間、ご了承ください。");
              console.log(dataMgr.data, "エラー発生のため、json内のデータを表示します。");
              return;
            }
            const videoId = videoIDdata.content;
            channelData.playList.push(videoId);
            dataMgr.save();
            await message.channel.send(
              await new discordTools().msgVList("再生リストに追加しました！", {
                videoId: videoId,
                list: {
                  videoIds: channelData.playList,
                  index: channelData.playList.length - 1,
                  playing: channelData.playList.length - 1
                }
              })
            );
          }
        },
        "play": {
          jaName: "再生",
          commandLine: "play",
          program: async () => {
            if (channelData.playList.length === 0) {
              await message.channel.send(
                "再生リストに曲が１つも入っていません...\n" +
                "音楽を追加するコマンドを" + dataMgr.data.prefix + "!helpで確かめましょう。"
              );
              return;
            }
            const oldConnection = getVoiceConnection(temp.guildId);
            if (oldConnection) {
              await message.channel.send(
                "既に音楽botを利用しているようです...\n" +
                "確認できない場合は管理人などが利用している可能性が高いため、報告しましょう。\n" +
                "利用中のチャンネル: <#" + oldConnection.joinConfig.channelId + ">"
              );
              return;
            }
            const connection = joinVoiceChannel({
              guildId: temp.guildId,
              channelId: temp.channelId,
              adapterCreator: temp.voiceAdapterCreator as DiscordGatewayAdapterCreator
            });
            connection.on("error", async error => {
              await message.channel.send("再生・接続にエラーが起こってしまったようです。\n次のメッセージが開発者の役に立つ可能性があります。" + error.name + ": " + error.message);
            });
            /**
             * まだ肝心の処理を書いていません。ここに書きます。
             */
            await message.channel.send(
              await new discordTools().msgVList("再生を始めます！", {
                videoId: channelData.playList[channelData.playing],
                list: {
                  videoIds: channelData.playList,
                  index: "auto",
                  playing: channelData.playing
                }
              })
            );
          }
        },
        "stop": {
          jaName: "停止",
          commandLine: "stop",
          program: async () => {
            const connection = getVoiceConnection(temp.guildId);
            if (connection) {
              const channelId = connection.joinConfig.channelId;
              if (channelId && channelId === temp.channelId) {
                connection.destroy();
                await message.channel.send("再生を停止しました！");
              } else {
                await message.channel.send(
                  "あなたが入ってるVCはbotがいないため、切断する権限がありません。\n" +
                  "利用中のチャンネル: <#" + connection.joinConfig.channelId + ">"
                );
                return;
              }
            } else {
              await message.channel.send("現在音楽を再生していないようです...");
              return;
            }
          }
        },
        "skip": {
          jaName: "スキップ",
          commandLine: "skip",
          program: async () => {
            const connection = getVoiceConnection(temp.guildId);
            if (connection) {
              const channelId = connection.joinConfig.channelId;
              if (channelId && channelId === temp.channelId) {
                if (channelData.playList.length === 0) {
                  await message.channel.send(
                    "再生リストに曲が１つも入っていません...\n" +
                    "音楽を追加するコマンドを" + dataMgr.data.prefix + "!helpで確かめましょう。"
                  );
                  return;
                }
                channelData.playing++;
                /**
                 * まだ肝心の処理を書いていません。ここに書きます。
                 */
                await message.channel.send(
                  await new discordTools().msgVList("音楽をスキップし、現在再生中の曲はこちらです！", {
                    videoId: channelData.playList[channelData.playing],
                    list: {
                      videoIds: channelData.playList,
                      index: "auto",
                      playing: channelData.playing
                    }
                  })
                );
              } else {
                await message.channel.send(
                  "あなたが入ってるVCはbotがいないため、スキップする権限がありません。\n" +
                  "利用中のチャンネル: <#" + connection.joinConfig.channelId + ">"
                );
                return;
              }
            } else {
              await message.channel.send("現在音楽を再生していないようです...");
              return;
            }
          }
        },
        "volume": {
          jaName: "音量",
          commandLine: "volume [num]",
          program: async () => {
            const volume = (() => {
              const volume = Number(temp.subCommand);
              if (!Number.isNaN(volume)) {
                if (volume < 0) return 0;
                return volume;
              }
              return null;
            })();
            if (!volume) {
              /**
               * まだ肝心の処理を書いていません。ここに書きます。
               */
              await message.channel.send("音量を" + volume + "%に設定しました！");
            } else {
              await message.channel.send("入力された次の値は無効です...: " + temp.subCommand);
            }
          }
        },
        "repeat": {
          jaName: "リピート",
          commandLine: "repeat [0, 1, 2]",
          program: async () => {
            const repeatType = ((): 0 | 1 | 2 | null => {
              const str = temp.subCommand;
              if (str) {
                const num = Number(str);
                if (!Number.isNaN(num)) {
                  if (num === 0) return 0;
                  if (num === 1) return 1;
                  if (num === 2) return 2;
                  return 0;
                } else {
                  const data = { //文字列でリピートタイプを選択するために使用する。
                    0: [
                      "off",
                      "none",
                      "null",
                      "undefined",
                      "no",
                      "no-repeat",
                      "no repeat"
                    ],
                    1: [
                      "repeat",
                      "on",
                      "loop",
                      "set",
                      "true"
                    ],
                    2: [
                      "one-repeat",
                      "one repeat",
                      "one",
                      "one-loop",
                      "one loop",
                      "only"
                    ]
                  }
                  for (let i = 0; i !== Object.keys(data).length; i++) { //data内の0,1,2を周回する
                    if (i === 0 || i === 1 || i === 2) { //TypeScriptでの型定義をするために
                      for (let m = 0; m !== data[i].length; m++) { //0,1,2の中にあるデータを確認
                        if (data[i][m] === str) { //文字列を比較する
                          return i; //会っていたらその時点での0,1,2を出力する
                        }
                      }
                    }
                  }
                  return 0; //一致しない場合は0
                }
              } else {
                return null; //内容がない際はnull
              }
            })();
            if (repeatType === null) {
              await message.channel.send("リピートタイプを選択してください...");
              return;
            }
            /**
             * まだ肝心の処理を書いていません。ここに書きます。
             */
            await message.channel.send("リピート状態を「**" + ["オフ", "リピート", "１曲リピート"][repeatType] + "**」に変更しました！");
          }
        },
        "remove": {
          jaName: "削除",
          commandLine: "remove [num]",
          program: async () => {
            if (channelData.playList.length === 0) {
              await message.channel.send(
                "再生リストに曲が１つも入っていません...\n" +
                "音楽を追加するコマンドを" + dataMgr.data.prefix + "!helpで確かめましょう。"
              );
              return;
            }
            if (temp.subCommand) {
              const num = Number(temp.subCommand);
              if (Number.isNaN(num)) {
                await message.channel.send("入力された値が数字として認識できませんでした...");
                return;
              }
              if (num === 0) {
                channelData.playList.splice(0);
                await message.channel.send("全ての曲を再生リストから削除しました！");
                return;
              }
              const deleteNum = (() => {
                if (num < 1) return 1;
                if (num > channelData.playList.length) return channelData.playList.length;
                return num;
              })();
              const videoId = channelData.playList[channelData.playing];
              channelData.playList.splice(deleteNum - 1, 1);
              await message.channel.send(
                await new discordTools().msgVList("指定した曲が再生リストから削除されました！", {
                  videoId: videoId,
                  list: {
                    videoIds: channelData.playList,
                    index: "auto",
                    playing: channelData.playing
                  }
                })
              );
            } else {
              const videoId = channelData.playList[channelData.playing];
              channelData.playList.splice(channelData.playing - 1, 1);
              await message.channel.send(
                await new discordTools().msgVList("再生中の曲を再生リストから削除しました！", {
                  videoId: videoId,
                  list: {
                    videoIds: channelData.playList,
                    index: "auto",
                    playing: channelData.playing
                  }
                })
              );
            }
          }
        },
        "playlist": {
          jaName: "再生リスト",
          commandLine: "playlist [num]",
          program: async () => {
            if (channelData.playList.length === 0) {
              await message.channel.send(
                "再生リストに曲が１つも入っていません...\n" +
                "音楽を追加するコマンドを" + dataMgr.data.prefix + "!helpで確かめましょう。"
              );
              return;
            }
            const num = (() => {
              if (temp.subCommand) {
                const num = Number(temp.subCommand);
                if (num < 1) return 1;
                if (num > channelData.playList.length) return channelData.playList.length;
                return num;
              }
              return null;
            })();
            await message.channel.send(
              await new discordTools().msgVList(num ? "指定の曲を表示します！" : "再生中の曲を含むページリストを表示します！", {
                videoId: channelData.playList[channelData.playing],
                list: {
                  videoIds: channelData.playList,
                  index: "auto",
                  playing: num ? num - 1 : channelData.playing
                }
              })
            );
          }
        },
        "saveplaylist": {
          jaName: "再生リスト保存",
          commandLine: "saveplaylist [name]",
          program: async () => {
            if (channelData.playList.length === 0) {
              await message.channel.send(
                "再生リストに曲が１つも入っていません...\n" +
                "音楽を追加するコマンドを" + dataMgr.data.prefix + "!helpで確かめましょう。"
              );
              return;
            }
            if (!temp.subCommand) {
              await message.channel.send("再生リストの名前を指定しましょう...");
              return;
            }
            if (temp.subCommand.length > 16) {
              await message.channel.send("再生リストの名前は１６文字以上使用することは出来ません。もう一度名前を付け直してください。");
            }
            authorData.myPlayList[temp.subCommand] = channelData.playList;
            await message.channel.send("再生リストを保存しました！");
          }
        },
        "loadplaylist": {
          jaName: "再生リスト読み込み",
          commandLine: "loadplaylist [name]",
          program: async () => {
            if (channelData.playList.length === 0) {
              await message.channel.send(
                "再生リストに曲が１つも入っていません...\n" +
                "音楽を追加するコマンドを" + dataMgr.data.prefix + "!helpで確かめましょう。"
              );
              return;
            }
            if (!temp.subCommand) {
              await message.channel.send("再生リストの名前を指定しましょう...");
              return;
            }
            const playlist = authorData.myPlayList[temp.subCommand];
            if (playlist === undefined) {
              await message.channel.send("そのような再生リストは見つかりませんでした...");
              return;
            }
            channelData.playList = playlist;
            await message.channel.send("保存された再生リストから上書き読み込みをしました！");
          }
        },
        "help": {
          jaName: "ヘルプ",
          commandLine: "help [command]",
          program: async () => {
            const config = (() => {
              if (temp.subCommand) {
                if (commands[temp.subCommand]) {
                  return {
                    name: temp.subCommand + "コマンドのヘルプ",
                    description: commands[temp.subCommand].jaName + "コマンドの使い方を紹介します。",
                    fields: {
                      name: "概要",
                      value: ""
                    }
                  };
                } else return null;
              }
              return {
                name: "ヘルプ！",
                description: "使い方を紹介します！",
                fields: {
                  name: "コマンド一覧",
                  value: (() => {
                    return "";
                  })()
                }
              };
            })
          }
        }
      };
    }
  }
});
