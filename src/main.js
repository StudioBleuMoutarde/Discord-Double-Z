require('dotenv').config();

const Discord = require('discord.js');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });

const Game = require('./classes/game');
const game = new Game();

const channelName = process.env.ENVIRONMENT === 'development' ? /test/i : /plateau/i;
const channelLeaderboard = process.env.ENVIRONMENT === 'development' ? /classementss/i : /classements/i;

// Réception d'un message
client.on('message', (message) => {
  // On ne prend pas en compte les messages de bot
  if(message.author.bot) return;

  // Seulement les messages du channel text Plateau
  if (message.channel.type !== 'text' && !channelName.test(message.channel.name)) return;

  if (message.author.id === process.env.ADMIN_ID) {
    // Si admin parle
    handleAdminResponse(message);
  } else {
    // Joueur a buzzé
    game.buzz(message.author.id);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  // On ne prend pas les réactions du bot
  if (user.bot) return;

  if (user.id === process.env.ADMIN_ID) {
    // Admin a décidé du résultat d'une question
    game.buzzResponse(reaction);
  } /* else {
    // Joueur a buzzé
    game.buzz(user.id, reaction.message.id);
  } */
});

/* client.on('messageReactionRemove', async (reaction, user) => {
  // On ne prend pas les réactions du bot ni de l'admin
  if (user.bot || user.id === process.env.ADMIN_ID) return;

  // Joueur a buzzé
  game.buzz(user.id, reaction.message.id);
}); */

// Confirmation de connexion
client.on('ready', () => {
  console.log(`*** logged in as ${client.user.tag}`);
  client.user.setActivity('Double-Z');

  // Recherche des références des channels "Plateau"
  client.channels.cache.forEach((chan) => {
    // regex pour le nom du channel "Plateau"
    const isNamePlateau = channelName.test(chan.name);

    if (chan.type === 'voice' && isNamePlateau) {
      game.voiceChannel = chan;
      console.log(`- voice channel "${channelName}" found`);
    }

    if (chan.type === 'text' && isNamePlateau) {
      game.textChannel = chan;
      console.log(`- text channel "${channelName}" found`);
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
    case '!clear':
      clearTextChannel();
      break;
    case '!join':
      game.joinVocal();
      break;
    case '!register':
      game.registerPlayers();
      break;
    case '!play':
      game.testAudio();
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
    const isNameLeaderboard = channelLeaderboard.test(chan.name);

    return chan.type === 'text' && isNameLeaderboard;
  });

  if (chanLeaderboard) {
    chanLeaderboard.messages.fetch({ limit: 10 })
      .then((messages) => {
        if (messages.size <= 0) {
          const fields = players.map((player) => {
            return {
              name: `${player.username} #&# ${player.id}`,
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

          // Joueurs dans le classement actuel
          let current = msg.embeds[0].fields.map((field) => {
            const [username, id] = field.name.split('#&#');
            const score = field.value.split(' ')[0].trim();

            return {
              id: id.trim(),
              username: username.trim(),
              score: +score,
            }
          });

          // Regroupement des scores actuels et nouveaux scores
          const rest = players.filter((c) => {
            const isPlayerAlreadyInLeaderboard = current.find((f) => f.id === c.id);

            if (isPlayerAlreadyInLeaderboard) {
              current = current.map((curr) => {
                if (curr.id === c.id) {
                  return {
                    ...curr,
                    score: c.score + isPlayerAlreadyInLeaderboard.score,
                  }
                }
                return curr;
              });
            }

            return !isPlayerAlreadyInLeaderboard;
          });

          // Classement final
          const finalLeaderboard = [...rest, ...current];

          const newFields = finalLeaderboard.map((p) => {
            return {
              name: `${p.username} #&# ${p.id}`,
              value: `${p.score} points`,
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
