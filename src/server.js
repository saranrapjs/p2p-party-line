const express = require("express");
const expressWebSocket = require("express-ws");
const websocketStream = require("websocket-stream/stream");
const app = express();
let ram = require("random-access-memory");
let wswarm = require("webrtc-swarm");
let signalhub = require("signalhub");

expressWebSocket(app, null, {
	perMessageDeflate: false
});

app.ws("/chat/:key/:id", function(ws, req) {
	const archiveKey = req.params.key;
	const stream = websocketStream(ws, {
		binary: true
	});
	stream.on("error", noop);
	let hub = signalhub(archiveKey, [process.env.SIGNAL_HUB]);
	let swarm = wswarm(hub, {
		uuid: req.params.id,
		wrtc: require("wrtc")
	});
	swarm.on("peer", (peer, id) => {
		peer.pipe(stream).pipe(peer);
	});
});

app.listen(4545);

function noop(err) {
	console.warn(err);
}
