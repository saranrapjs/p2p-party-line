const [hub, key] = process.argv.slice(2);
let memdb = require("memdb");
const c = require("./chat.js");
console.warn("mirroring chat for", key, "at", hub);
const chat = new c("bot", memdb(), key, [hub]);
chat.on("say", row => console.log(row.value.time, row.value.message.who));
chat.start({ wrtc: require("wrtc") });
