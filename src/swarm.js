let wswarm = require("webrtc-swarm");
let signalhub = require("signalhub");

module.exports = function(cabal, hubs = []) {
	let hub = signalhub(cabal.key.toString("hex"), hubs);
	cabal.getLocalKey(function(err, key) {
		let swarm = wswarm(hub, {
			uuid: key
		});
		swarm.on("peer", (peer, id) => {
			let rKey = Buffer.from(id, "hex");
			cabal._addConnection(rKey);
			function replicate() {
				var r = cabal.replicate();
				r.pipe(peer).pipe(r);
				r.on("error", noop);
			}
			replicate();
			peer.on("error", err => console.warn(err));
		});
		swarm.on("disconnect", (peer, id) => {
			cabal._removeConnection(id);
		});
	});
};

function noop(err) {
	console.warn(err);
}
