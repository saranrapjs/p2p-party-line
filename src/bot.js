const [hub, key] = process.argv.slice(2);
if (!hub || !key) {
	console.warn("usage: bot.js <hub> <chatKey>");
	process.exit(1);
}
let ram = require("random-access-memory");
let multifeed = require("multifeed");
let signalhub = require("signalhub");
let wswarm = require("webrtc-swarm");
let pump = require("pump");
let mf = multifeed(require("hypercore"), ram, { valueEncoding: "json" });
mf.writer("local", (err, feed) => {
	if (err) return;
	let id = feed.key.toString("hex");
	let h = signalhub(key, [hub]);
	let swarm = wswarm(h, {
		uuid: id,
		wrtc: require("wrtc")
	});
	swarm.on("peer", (peer, id) => {
		let pStream = mf.replicate({ live: true });
		pStream.on("error", noop);
		pump(peer, pStream, peer);
		console.warn("replicating peer", id);
	});
});

function noop(err) {
	if (err) console.warn(err);
}
