const { Client, GatewayIntentBits, Partials, EmbedBuilder, BaseChannel, ApplicationCommandOptionType } = require('discord.js');
var config = require("./config.json");
const bot = new Client({
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
});
const HandleOrder = require('./services/handle_order.js'); //なにこれ取得しようにもない

//怪文
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
require('./discord/index');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', function (req, res) {
  res.send('Welcome to my word! I am Utadorei :)');
});

app.listen(process.env.PORT || 3000, function() {
  console.log('Utadorei app listening on port 3000!');
});
//怪文終了

bot.on("ready", () => {
  console.log("準備おっけい！");
});

bot.on("messageCreate", message => {
  if (message.author.bot) return; //チャット送信者がbotならリターン(終了)
  if (message.content.startsWith(config.prefix)) {
    HandleOrder.call(message);
  };
});

bot.login(config.token); //ログイン

const ytdl = require('ytdl-core');

module.exports = {
  call: call,
  play: play,
  isValidCommand: isValidCommand,
  handlePlay: handlePlay,
  handleSkip: handleSkip,
  handleStop: handleStop,
  handlePlayNow: handlePlayNow
}

let servers = {};

function call(message) {
  const args = message.content.slice(prefix.length).split(' ');
  const command = args.shift().toLowerCase();

  switch (command) {
    case 'play':
      handlePlay(message, args[0]);
      break;
    case 'skip':
      handleSkip(message);
      break;
    case 'stop':
      handleStop(message);
      break;
    case 'playnow':
      handlePlayNow(message, args[0]);
      break;
    case 'join':
      handleJoin(message);
      break;
    case 'np':
      handleNp(message);
      break;
    case 'list':
      handleList(message);
      break;
  }
}

function handleJoin(message) {
  if (!message.guild.voiceConnection) {
    message.member.voiceChannel.join()
      .then(connection => {
      })
      .catch(console.log);
  }
}

function play(connection, message) {
  let server = servers[message.guild.id];
  let unplay_queue = getFirstUnPlayedQueue(server.queue);
  server.dispatcher = connection.playStream(
    ytdl(unplay_queue.url)
  );
  console.log('Playing ' + unplay_queue.url);
  unplay_queue.status = 1;
  server.dispatcher.on('end', function () {
    let unplay_queue = getFirstUnPlayedQueue(server.queue);
    if (unplay_queue) { play(connection, message); }
    else { connection.disconnect(); }
  });
}

function isValidCommand(message, url) {
  if (!url) {
    message.reply('Please type a link.');
    return false;
  }

  let reg = /^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/gm;
  if (!url.match(reg)) {
    message.reply('Is that a valid youtube link?');
    return false;
  }

  if (!message.member.voiceChannel) {
    message.reply('Please go to the voice channel first.');
    return false;
  }

  return true;
}

function handlePlay(message, url) {
  if (!isValidCommand(message, url)) { return; }

  if (!servers[message.guild.id]) { servers[message.guild.id] = { queue: [] }; }
  servers[message.guild.id].queue.push({
    url: url,
    status: 0
  });

  console.log(servers[message.guild.id].queue);

  if (!message.guild.voiceConnection) {
    message.member.voiceChannel.join()
      .then(connection => {
        play(connection, message);
      })
      .catch(console.log);
  }
}

function handleSkip(message) {
  if (!servers[message.guild.id]) { return; }

  let server = servers[message.guild.id];
  if (server.dispatcher) { server.dispatcher.end(); }
}

function handleStop(message) {
  if (message.guild.voiceConnection) { message.guild.voiceConnection.disconnect(); }
}

function handlePlayNow(message, url) {
  let server = servers[message.guild.id];
  if (!server) {
    handlePlay(message, url);
    return;
  }

  server.queue.splice(1, 0, {
    url: url,
    status: 0
  });
  server.dispatcher.end();
}

function handleNp(message) {
  let server = servers[message.guild.id];
  if (!server || !server.queue) {
    message.reply("There is not things.");
    return;
  }
  let current_queue = getCurrentQueue(server.queue);
  if (!server) { return; }
  ytdl.getBasicInfo(current_queue.url).then(info => {
    message.reply(getInfoMsg(info, current_queue.url));
  });
}

function getCurrentQueue(queues) {
  return queues.filter(function (queue) {
    return queue.status === 1;
  }).slice(-1)[0];
}

function getFirstUnPlayedQueue(queues) {
  return queues.filter(function (queue) {
    return queue.status === 0;
  })[0];
}

async function handleList(message) {
  let server = servers[message.guild.id];
  if (!server || !server.queue) {
    message.reply("There is not things.");
    return;
  }
  let msg = "";
  server.queue.forEach(function (queue) {
    ytdl.getBasicInfo(queue.url).then(info => {
      msg += getInfoMsg(info, queue.url) + '\n --------------------------';
      console.log(msg);
    });
  });

  await delay();
  message.reply(msg);
}

function getInfoMsg(info, url) {
  return `\n Title: ${info.player_response.videoDetails.title} \n Author: ${info.author.name} \n Link: ${url}`;
}

function delay() {
  return new Promise(resolve => setTimeout(resolve, 1000));
}