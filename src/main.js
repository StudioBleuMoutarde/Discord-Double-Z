require('dotenv').config();

const Discord = require('discord.js');
const client = new Discord.Client();

const Game = require('./classes/game');
const game = new Game();

// Réception d'un message
client.on('message', (message) => {
  if (message.author.id === process.env.ADMIN_ID) {
    // Si admin parle
    handleAdminResponse(message);
  } else {
    // Si un random parle
    handlePlayerResponse(message);
  }
});

// Confirmation de connexion
client.on('ready', () => {
  console.log(`*** logged in as ${client.user.tag}`);
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
      game.start(message);
      break;
    default:
      console.log('/// Commande inconnue');
      break;
  }
};

/**
 * Gestion des messages des joueurs
 * @param {*} message 
 */
const handlePlayerResponse = (message) => {
  console.log(`Un joueur "${message.author.username}" a dit "${message.content}"`);
  switch (message.content) {
    default:
      console.log('/// Commande inconnue');
      break;
  }
};
