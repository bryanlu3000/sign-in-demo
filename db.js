require("dotenv").config();
const { MongoClient } = require("mongodb")

MongoClient.connect(process.env.CONNECTIONSTRING, async (err, client) => {
  module.exports = client
  const server = require("./server.js")
  const PORT = process.env.PORT || 8000
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})