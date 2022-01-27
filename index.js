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

client.on("message", function (message) {
  if (message.author.bot) return;

  message.channel.sendTyping();

  axios
    .post(
      `https://app.jaicp.com/chatapi/${process.env.JAICP_CHAT_API_KEY}`,
      {
        query: message.content,
        clientId: message.author.id,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    .then(function (response) {
      response.data.data.replies.forEach(async (reply) => {
        if (reply.type === "text") {
          message.channel.send(reply.text);
        } else if (reply.type === "carousel") {
          message.channel.send(reply.text);

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

            message.channel.send({ embeds: [embed], components: [actionRow] });
          });
        }
      });
    })
    .catch(function (error) {
      console.log(error);
    });
});
client.login(process.env.BOT_TOKEN);
