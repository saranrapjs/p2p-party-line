const websocket = require("websocket-stream/stream");

module.exports = function(cabal) {
	cabal.getLocalKey(function(err, key) {
		let connecting;
		function connect() {
			if (connecting) connecting = null;
			console.warn("connecting...");
			const feedKey = cabal.key.toString("hex");
			const host = document.location.host || "localhost:4545";
			const proto =
				document.location.protocol === "https:" ? "wss" : "ws";
			const url = `${proto}://${host}/chat/${feedKey}/${key}`;
			const stream = websocket(url, {
				binary: true
			});
			let r = cabal.replicate();
			stream.pipe(r).pipe(stream);
			stream.once("data", () => console.warn("connected"));
			stream.on("error", onError);
			r.on("error", onError);
		}
		function onError(err) {
			console.warn("stream has closed", err);
			if (!connecting) {
				connecting = setTimeout(connect, 5000);
			}
		}
		connect();
	});
};

function noop(err) {
	console.warn(err);
}
