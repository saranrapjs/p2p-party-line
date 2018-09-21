const websocket = require("websocket-stream");

module.exports = function(cabal) {
	cabal.getLocalKey(function(err, key) {
		const feedKey = cabal.key.toString("hex");
		const host = document.location.host || "localhost:3000";
		const proto = document.location.protocol === "https:" ? "wss" : "ws";
		const url = `${proto}://${host}/chat/${feedKey}/${key}`;
		const stream = websocket(url);
		var r = cabal.replicate();
		r.pipe(stream).pipe(r);
		r.on("error", noop);
	});
};

function noop(err) {
	console.warn(err);
}
