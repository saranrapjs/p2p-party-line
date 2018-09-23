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
		swarm.on("peer", (peer, id) => {
			let rKey = Buffer.from(id, "hex");
			cabal._addConnection(rKey);
			let rStream = cabal.replicate();
			rStream.pipe(peer).pipe(rStream);
			rStream.on("error", err => {
				console.warn(err);
				cabal._removeConnection(rKey);
			});
			peer.on("error", err => {
				console.warn(err);
				cabal._removeConnection(rKey);
			});
			peer.on("end", () => cabal._removeConnection(rKey));
		});
	});
};

function noop(err) {
	console.warn(err);
}
