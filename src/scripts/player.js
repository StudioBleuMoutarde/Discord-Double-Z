module.exports = {
  handleResponse(message) {
    console.log(`Un joueur "${message.author.username}" a dit "${message.content}"`);
  }
};
