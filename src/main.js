require('dotenv').config();

const Discord = require('discord.js');
const client = new Discord.Client();

const Game = require('./classes/game');
const game = new Game();

// Réception d'un message
client.on('message', (message) => {
  // On ne prend pas en compte les messages de bot
  if(message.author.bot) return;

  // Seulement les messages du channel text Plateau
  if (message.channel.type !== 'text' && !/plateau/i.test(message.channel.name)) return;

  // Seulement les messages de l'admin
  if (message.author.id === process.env.ADMIN_ID) {
    // Si admin parle
    handleAdminResponse(message);
  }
});

// Confirmation de connexion
client.on('ready', () => {
  console.log(`*** logged in as ${client.user.tag}`);
  client.user.setActivity('Double-Z');

  // Recherche des références des channels "Plateau"
  client.channels.cache.forEach((chan) => {
    // regex pour le nom du channel "Plateau"
    const isNamePlateau = /plateau/i.test(chan.name);

    if (chan.type === 'voice' && isNamePlateau) {
      game.voiceChannel = chan;
      console.log('- voice channel "Plateau" found');
    }

    if (chan.type === 'text' && isNamePlateau) {
      game.textChannel = chan;
      console.log('- text channel "Plateau" found');
    }
  });
});

// Connexion du bot au serveur
client.login(process.env.DISCORD_TOKEN);


/**
 * Gestion des commandes admin
 * @param {*} message 
 */
const handleAdminResponse = (message) => {
  console.log(`Un admin a dit "${message.content}"`);
  switch (message.content) {
    case '!start':
      game.start();
      break;
    default:
      console.log('/// Commande inconnue');
      break;
  }
};
