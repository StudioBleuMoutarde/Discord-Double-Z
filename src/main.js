require('dotenv').config();
const adminService = require('./scripts/admin');
const playerService = require('./scripts/player');

const Discord = require('discord.js');
const client = new Discord.Client();

client.on('message', (message) => {
  // Si admin parle
  if (message.author.id === process.env.ADMIN_ID) {
    // gestion des commandes
    adminService.handleResponse(message);
  } else {
    // Si un random parle
    playerService.handleResponse(message);
  }
});

client.on('ready', () => {
  console.log(`*** logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
