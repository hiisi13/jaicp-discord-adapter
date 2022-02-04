require("dotenv").config();
const {
  Client,
  Intents,
  MessageEmbed,
  MessageActionRow,
  MessageButton,
} = require("discord.js");
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
const axios = require("axios");

const POLLING_INTERVAL_MS = 1000;
let lastJaicpMessageTimestamps = {};
let lastQuestionIds = {};
let listeningLoops = {};

const processReply = function (channel, reply) {
  if (reply.type === "text") {
    channel.send(reply.text);
  } else if (reply.type === "carousel") {
    channel.send(reply.text);

    reply.content.forEach((item) => {
      let embed = new MessageEmbed()
        .setImage(item.image)
        .setDescription(item.title || "No description")
        .setURL(item.url);

      let actionRow = new MessageActionRow();
      let b = new MessageButton()
        .setLabel(item.btnText)
        .setStyle(5)
        .setURL(item.url);
      actionRow.addComponents(b);

      channel.send({ embeds: [embed], components: [actionRow] });
    });
  }
};

const startListeningLoopForUser = async function (userId, channel) {
  const endpoint = `https://app.jaicp.com/chatapi/${process.env.JAICP_CHAT_API_KEY}/events`;
  setInterval(async () => {
    const eventsResponse = await axios.get(endpoint, {
      params: {
        clientId: userId,
        ts: lastJaicpMessageTimestamps[userId],
      },
    });
    eventsResponse.data.events.forEach((event) => {
      if (event.type === "botResponse") {
        const ts = Date.parse(event.event.timestamp);
        if (
          event.event.questionId !== lastQuestionIds[userId] &&
          ts > lastJaicpMessageTimestamps[userId]
        ) {
          lastJaicpMessageTimestamps[userId] = ts;
          lastQuestionIds[userId] = event.event.questionId;
          event.event.data.replies.forEach((reply) => {
            processReply(channel, reply);
          });
        }
      }
    });
  }, POLLING_INTERVAL_MS);
};

client.on("message", function (message) {
  if (message.author.bot) return;

  message.channel.sendTyping();

  let payload = {
    query: message.content,
    clientId: message.author.id,
  };

  axios
    .post(
      `https://app.jaicp.com/chatapi/${process.env.JAICP_CHAT_API_KEY}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    .then(function (response) {
      lastJaicpMessageTimestamps[message.author.id] = Date.parse(
        response.data.timestamp
      );
      lastQuestionIds[message.author.id] = response.data.questionId;
      response.data.data.replies.forEach(async (reply) => {
        processReply(message.channel, reply);
      });
      if (!listeningLoops.hasOwnProperty(message.author.id)) {
        listeningLoops[message.author.id] = true;
        startListeningLoopForUser(message.author.id, message.channel);
      }
    })
    .catch(function (error) {
      console.log(error);
    });
});
client.login(process.env.BOT_TOKEN);
