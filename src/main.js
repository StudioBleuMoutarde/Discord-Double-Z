require('dotenv').config();

const Discord = require('discord.js');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

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

client.on('messageReactionAdd', async (reaction, user) => {
  // On ne prend pas les réactions du bot
  if (user.bot) return;

  if (user.id === process.env.ADMIN_ID) {
    // Admin a décidé du résultat d'une question
    game.buzzResponse(reaction);
  } else {
    // Joueur a buzzé
    game.buzz(user.id, reaction.message.id);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  // On ne prend pas les réactions du bot ni de l'admin
  if (user.bot || user.id === process.env.ADMIN_ID) return;

  // Joueur a buzzé
  game.buzz(user.id, reaction.message.id);
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
  switch (message.content) {
    case '!start':
      game.start();
      break;
    case '!clear-text-channel':
      clearTextChannel();
      break;
    default:
      console.log('/// Commande inconnue');
      break;
  }
};

/**
 * Supprime tous les messages du channel texte "plateau"
 */
const clearTextChannel = () => {
  game.textChannel.bulkDelete(100);
};

const addLeaderboard = async (players) => {
  // Récupération du message du channel "classements"
  const chanLeaderboard = client.channels.cache.find((chan) => {
    // regex pour le nom du channel "classements"
    const isNameHallDesChampions = /classements/i.test(chan.name);

    return chan.type === 'text' && isNameHallDesChampions;
  });

  if (chanLeaderboard) {
    chanLeaderboard.messages.fetch({ limit: 10 })
      .then((messages) => {
        if (messages.size <= 0) {
          const fields = players.map((player) => {
            return {
              name: `${player.username} - ${player.id}`,
              value: `${player.score} points`,
            };
          });
    
          const embedChampions = {
            color: '#ffff00',
            author: {
              name: 'Classement',
            },
            fields,
          };
          chanLeaderboard.send({ embed: embedChampions });
        } else {
          const msg = messages.first();

          const newFields = players.map((p) => {
            const exportedPlayer = msg.embeds[0].fields.find((f) => {
              const fieldId = f.name.split('-')[1].trim();

              return fieldId === p.id;
            });

            let score = p.score;
            if (exportedPlayer) {
              const exportedScore = exportedPlayer.value.split(' ')[0].trim();
              score += +exportedScore;
            }

            return {
              name: `${p.username} - ${p.id}`,
              value: `${score} points`,
            };
          });

          // Tri des joueurs par score
          const sortedFields = newFields.sort((a, b) => {
            const aScore = +a.value.split(' ')[0].trim();
            const bScore = +b.value.split(' ')[0].trim();

            return bScore - aScore;
          });

          const updateEmbed = {
            color: '#ffff00',
            author: {
              name: 'Classement',
            },
            fields: sortedFields,
          };
          // Modification du classement
          msg.edit({ embed: updateEmbed });
        }
      });
  }
};

module.exports.addLeaderboard = addLeaderboard;
