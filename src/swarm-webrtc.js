let wswarm = require("webrtc-swarm");
let signalhub = require("signalhub");

module.exports = function(cabal, hubs = [], swarmOpts = {}) {
	let hub = signalhub(cabal.key.toString("hex"), hubs);
	cabal.getLocalKey(function(err, key) {
		let swarm = wswarm(
			hub,
			Object.assign(swarmOpts, {
				uuid: key
			})
		);
		const peers = {};
		swarm.on("peer", (peer, id) => {
			peers[id] = true;
			let rKey = Buffer.from(id, "hex");
			onConnect(id);
			cabal._addConnection(rKey);
			let rStream = cabal.replicate();
			rStream.pipe(peer).pipe(rStream);
			rStream.on("error", err => {
				console.warn(err);
				onDisconnect(id);
			});
			peer.on("error", err => {
				console.warn(err);
				onDisconnect(id);
			});
			peer.on("end", () => onDisconnect(id));
		});
		swarm.on("disconnect", (peer, id) => onDisconnect(id));
		function onConnect(id) {
			if (!peers[id]) {
				peers[id] = true;
				cabal._addConnection(id);
			}
		}
		function onDisconnect(id) {
			if (peers[id]) {
				delete peers[id];
				cabal._removeConnection(id);
			}
		}
	});
};

function noop(err) {
	console.warn(err);
}
