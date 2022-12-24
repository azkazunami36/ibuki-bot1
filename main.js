const {
    Client,
    GatewayIntentBits,
    Partials,
    Events,
    EmbedBuilder,
    Status,
    Message
} = require("discord.js")
const {
    entersState,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    StreamType,
    AudioPlayerStatus
} = require("@discordjs/voice")
const ytdl = require("ytdl-core")
const ytpl = require("ytpl")
const fs = require("fs")
const readline = require("readline")
const { data, errortype } = require("./index")
require("dotenv").config()
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
})
/**
 * 呼び名を定義します。
 * バランスが崩れないよう、json表記にしています。
 */
const nmD = {
    vc: {
        name: "ボイスチャット",
        short: "vc",
        command: "v",
        description: "Discordのボイスチャットの呼び方です。ショートにはVCを利用します。"
    },
    plist: {
        name: "再生リスト",
        short: "plist",
        command: "plist",
        description: "プレイリストとも言われますが、ここでは再生リストとします。ショートにはplistとし、コマンドを中心に利用します。"
    },
    url: {
        name: "リンク",
        short: "URL",
        command: "url",
        description: "URLの呼び方です。ショートにはURLを利用します。"
    },
    yt: {
        name: "YouTube",
        short: "yt",
        command: "yt",
        description: "YouTubeの呼び方です。ショートにはytとし、コマンドを中心に利用します。"
    },
    pub: {
        name: "パプリック・プレイリスト",
        short: "パブプレ",
        command: "pub",
        description: "公開プレイリストの呼び方です。独自定義なので、不安定な可能性があります。"
    },
    music: {
        name: "音楽",
        short: "m",
        command: "m",
        description: "ミュージックの読み方です。ショート等は１文字だけなため、利用はコマンドのみの可能性があります。"
    },
    voice: {
        name: "ボイス",
        short: "voice",
        command: "voice",
        description: "voiceの呼び方です。基本的にコマンドの最初に使用する重要なものです。"
    },
    help: {
        name: "ヘルプ",
        short: "help",
        command: "help",
        description: "ヘルプの呼び方です。ショートにはhelpを利用します。"
    },
    discord: {
        name: "Discord",
        short: "DC",
        command: "d",
        description: "Discordの呼び方です。ショートは基本的に内部でのみ利用の可能性があります。"
    },
    bot: {
        name: "音楽bot",
        short: "bot",
        command: "bot",
        description: "このプログラムの呼び方です。ショートにはbotを利用します"
    },
    add: {
        name: "追加",
        short: "add",
        command: "add",
        description: "追加の呼び方です。基本的に内部で利用します"
    },
    name: {
        name: "名前",
        short: "name",
        command: "name",
        description: "名前の呼び方です。基本的に内部で利用します"
    },
    play: {
        name: "再生",
        short: "play",
        command: "play",
        description: "再生の呼び方です。基本的に内部で利用します"
    },
    split: {
        name: "分割",
        short: "!",
        command: "!",
        description: "これは呼び方ではなく、コマンドに使用する特殊文字です。"
    },
    s: {
        name: "セーブ",
        short: "save",
        command: "s",
        description: "これは呼び方ではなく、コマンドに使用する特殊文字です。"
    },
    l: {
        name: "ロード",
        short: "load",
        command: "l",
        description: "これは呼び方ではなく、コマンドに使用する特殊文字です。"
    },

}
client.on(Events.ClientReady, () => {
    console.info("Discordに接続済み。:" + client.user.username + "#" + client.user.discriminator)
    client.user.setPresence({
        activities: [{
            name: nmD.voice.command + nmD.split.command + nmD.help.command
        }],
        status: Status.Idle
    })

})

client.on(Events.MessageCreate, message => {
    if (message.author.bot) return
    if (message.content.startsWith("voice!")) {

    }
})

/**
 * 
 * @param {data} data 
 * @param {errortype} notype 
 * @returns 
 */
const voiceerrorfunction = (data, notype) => {
    try {
        if (!subcontent) {
            if (notype.addurl) return nmD.url.name + "を指定しましょう...\n`" + nmD.voice.command + nmD.split.command + nmD.add.command + " [" + nmD.url.command + "]`"
            if (notype.notsplist) return "`" + nmD.voice.command + nmD.split.command + nmD.s.command + nmD.plist.command + " [" + nmD.name.command + "]`で" + nmD.name.name + "を指定してくださいっ"
            if (notype.notlplist) return "`" + nmD.voice.command + nmD.split.command + nmD.l.command + nmD.plist.command + " [" + nmD.name.command + "]`で" + nmD.name.name + "を指定してくださいっ"
            if (notype.notpublplist) return "`" + nmD.voice.command + nmD.split.command + nmD.pub.command + "l" + nmD.plist.command + " [" + nmD.name.command + "]`で" + nmD.name.name + "を指定してくださいっ"
            if (notype.notpubsplist) return "`" + nmD.voice.command + nmD.split.command + nmD.pub.command + "s" + nmD.plist.command + " [" + nmD.name.command + "]`で" + nmD.name.name + "を指定してくださいっ"
        }
        if (!ytdl.validateURL(data.subcontent) && !ytdl.validateID(data.subcontent)) {
            if (notype.ytdlurlorid) return "送られたものが" + nmD.yt.name + "用の" + nmD.url.name + "ではないみたいです..."
        }
        if (server.playing == data.channelid) {
            if (notype.playinguser) return "既にその" + nmD.vc.name + "で" + nmD.play.name + "しています..."
        }
        if (server.playing) {
            if (notype.playing) return "既に他の" + nmD.vc.name + "で" + nmD.play.name + "しています..."
        }
        if (!clientdata.glist[data.guildid].chlist[data.channelid].plist[0]) {
            if (notype.plistempty) return nmD.plist.name + "が空です...`" + nmD.voice.command + nmD.split.command + nmD.add.command + " [" + nmD.url.command + "]`を使用して" + nmD.add.name + "してくださいっ"
        }
        if (server.playing != data.channelid) {
            if (notype.noplaying) return "現在" + nmD.music.name + "を" + nmD.play.name + "していません..."
        }
        if (number > clientdata.glist[data.guildid].chlist[data.channelid].plist.length || number < 0) {
            if (notype.nullnumber) return "受け取った値がよろしくなかったようです...もう一度やり増しましょう...！"
        }
        if (subcontent.length > 16) {
            if (notype.stringlengthis) return nmD.name.name + "は16文字までです。もう一度" + nmD.name.name + "を決めましょう！"
        }
        if (!clientdata.userdata[userid].myplist[subcontent]) {
            if (notype.notplist) return "そのような" + nmD.plist.name + "は確認できませんでした...再度試して見てくださいっ"
        }
        if (!data[0]) {
            if (notype.zeroplist) return nmD.plist.name + "が見つかりません...`" + nmD.voice.command + "!s" + nmD.plist.command + " [" + nmD.name.command + "]`で" + nmD.add.command + "してくださいっ"
            if (notype.zeropubplist) return nmD.pub.name + "が設定されていません...\n" + "管理人が" + nmD.pub.name + "を設定するまで、しばらくお待ちください..."
        }
        if (clientdata.userid != userid) {
            if (notype.notadminispub) return "あなたは" + nmD.pub.name + "を操作することは出来ません..."
        }
        if (!clientdata.pubplist[subcontent]) {
            if (notype.notpubplist) return "そのような" + nmD.pub.name + "は確認できませんでした...再度試して見てくださいっ"
        }
        if (!clientdata.ytdt[0]) {
            if (notype.noytcontent) return nmD.music.name + "が入っていません...`" + nmD.voice.command + nmD.split.command + nmD.add.command + " [" + nmD.url.command + "]`で" + nmD.add.command + "してくださいっ"
        }
    } catch (e) {
        console.log(e)
        return "条件確認をする際に予想外のエラーが発生してしまいました。\n申し訳ありませんが、そのコマンドをGitHubにお送りください。\n詳細はヘルプコマンドを利用してください。"
    }
}