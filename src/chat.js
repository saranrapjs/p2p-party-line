let hyperlog = require("hyperlog");
let wswarm = require("webrtc-swarm");
let signalhub = require("signalhub");
let EventEmitter = require("events").EventEmitter;
let sub = require("subleveldown");
let sodium = require("sodium-universal");

function generateKey(input) {
  var digest = new Buffer(32);
  sodium.crypto_generichash(digest, new Buffer(input));
  return digest.toString("hex");
}

class Chat extends EventEmitter {
  constructor(
    name,
    db,
    channelName = "chat",
    hubs = ["https://signalhub.mafintosh.com/"]
  ) {
    super();
    this.db = db;
    this.name = name;
    this.channelName = channelName;
    this.hubs = hubs;
    this.log = hyperlog(sub(this.db, "chat"), {
      valueEncoding: "json"
    });
    this.peers = {};
  }

  start(opts = {}) {
    this.log.createReadStream({ live: true }).on("data", row => {
      this.emit("say", row);
    });
    let hub = signalhub(generateKey(this.channelName), this.hubs);
    this.swarm = wswarm(hub, opts);
    this.onswarm = (peer, id) => {
      this.peers[id] = peer;
      this.emit("peer", id);
      const stream = this.log.replicate({ live: true });
      stream.on("error", err => console.warn(err));
      peer.pipe(stream).pipe(peer);
    };
    this.ondisconnect = (peer, id) => {
      delete this.peers[id];
      this.emit("disconnect", id);
    };
    this.swarm.on("peer", this.onswarm);
    this.swarm.on("disconnect", this.ondisconnect);
  }

  say(msg) {
    let data = {
      time: Date.now(),
      who: this.name,
      message: msg
    };
    this.log.append(data, function(err, node) {});
  }

  stop() {
    this.swarm.removeListener("peer", this.onswarm);
    this.swarm.removeListener("disconnect", this.ondisconnect);
    Object.keys(this.peers).forEach(function(key) {
      this.peers[key].destroy();
    });
  }
}

module.exports = Chat;
