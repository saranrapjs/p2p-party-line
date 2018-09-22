const pump = require("pump");
const express = require("express");
const expressWebSocket = require("express-ws");
const websocketStream = require("websocket-stream/stream");
const app = express();
let ram = require("random-access-memory");
let wswarm = require("webrtc-swarm");
let signalhub = require("signalhub");
let multifeed = require("multifeed");
const { SIGNAL_HUB } = process.env;
if (!SIGNAL_HUB) {
	console.warn("this needs a SIGNAL_HUB to operate");
	process.exit(1);
}
require("events").prototype._maxListeners = 100;

expressWebSocket(app, null, {
	perMessageDeflate: false
});

app.ws("/chat/:key/:id", function(ws, req) {
	const { key, id } = req.params;
	let swarm;
	console.warn("booting up ", id);
	const stream = websocketStream(ws, {
		binary: true,
		perMessageDeflate: false
	});
	stream.on("error", stop);
	stream.on("close", stop);
	stream.on("end", stop);
	let mf = multifeed(require("hypercore"), ram, { valueEncoding: "json" });
	// mf.writer(err => {
	let mStream = mf.replicate({ live: true });
	mStream.on("error", noop);
	pump(stream, mStream, stream);
	setInterval(() => {
		console.warn(mf._feeds);
	}, 5000);
	let hub = signalhub(key, [SIGNAL_HUB]);
	swarm = wswarm(hub, {
		uuid: id,
		wrtc: require("wrtc")
	});
	swarm.on("peer", (peer, id) => {
		console.warn("found peer", id);
		let pStream = mf.replicate({ live: true });
		pStream.on("error", noop);
		pump(peer, pStream, peer);
		console.warn("replicating peer", id);
		stream.destroy();
	});
	// });
	function stop(err) {
		console.warn("stopping id", id);
		if (err) console.warn(err);
		if (swarm) swarm.close();
	}
});

app.listen(4545);

function noop(err) {
	console.warn(err);
}
