let html = require("choo/html");
// let devtools = require('choo-devtools')
let Chat = require("./chat.js");
let choo = require("choo");
let DateTime = require("luxon").DateTime;
let memdb = require("memdb");
let app = choo();
let storedName = localStorage.getItem("name");
app.use(countStore);
app.use(setupChat);
app.route("/", loginView);
app.route("/*", mainView);
app.mount("body");
setScroll(true);

function setupChat(state, emitter) {
    let chat;
    emitter.on("navigate", () => onNavigate());
    emitter.on("DOMContentLoaded", () => onNavigate());
    function onNavigate() {
        let key = state.params && state.params.wildcard;
        if (chat && (!key || !key.length)) {
            chat.stop();
            chat = null;
            emitter.removeAllListeners("newmsg");
        } else if (!chat && key && key.length) {
            chat = new Chat(state.nym, memdb(), key, window.HUBS);
            chat.on("peer", () => emitter.emit("peers", chat.peers));
            chat.on("disconnect", () => emitter.emit("peers", chat.peers));
            chat.on("say", row => emitter.emit("say", row));
            emitter.on("newmsg", msg => {
                state.name = msg.who;
                localStorage.setItem("name", msg.who);
                chat.say(msg);
            });
            chat.start();
        }
    }
}

const timeConfig = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
};

function toHTML(msg) {
    let el = html`<span class="message"></span>`;
    let replaced = msg.replace(
        /(https?:\/\/[^\s]+)/g,
        url => `<a href="${url}">${url}</a>`
    );
    el.innerHTML = replaced;
    return el;
}

function mainView(state, emit) {
    return html`
    <body>
        <div class="chat">
        ${state.lines.map(row => {
            const m = row.value.message;
            return html`<div class="line">
                <span class="time">${DateTime.fromMillis(
                    row.value.time
                ).toLocaleString(timeConfig)}</span>
                <span class="who">${"<" + m.who + ">"}</span>
                ${toHTML(m.message)}
            </div>`;
        })}
        </div>
        <form onsubmit=${onsubmit} class="newmsg">
            <div class="info">
                <span>peers online: ${state.peers}</span>
                <span>your name: <input class="edit-name" type="text" name="name" placeholder="enter name" value="${state.name}"></span>
            </div>
            <input class="entry" placeholder="type here" type="text" name="text" autofocus>
            <button>Enter</button>
        </form>
    </body>
  `;

    function onsubmit(e) {
        e.preventDefault();
        emit("newmsg", {
            who: this.elements.name.value,
            message: this.elements.text.value
        });
    }
}

function loginView(state, emit) {
    return html`<body>
        <form onsubmit=${onsubmit} class="enter-key">
            <img src="party-line.jpg">
            <input class="key" name="key" type="text" placeholder="enter chat key" autofocus>
            <button onclick=${onclick}>(or generate a new chat)</button>
        </form>
    </body>`;

    function onclick(e) {
        e.preventDefault();
        let key = new Buffer(32);
        window.crypto.getRandomValues(key);
        emit("pushState", `#${key.toString("hex")}`);
    }

    function onsubmit(e) {
        e.preventDefault();
        if (this.elements.key.value.length) {
            emit("pushState", `#${this.elements.key.value}`);
        }
    }
}

function countStore(state, emitter) {
    state.peers = 0;
    state.name =
        storedName || `scatman ${Math.floor(Math.random() * (10 - 1) + 1)}`;
    state.lines = [];
    emitter.on("peers", peers => {
        state.peers = Object.keys(peers).length;
        emitter.emit("render");
    });
    emitter.on("say", function(row) {
        state.lines.push(row);
        emitter.emit("render");
    });
    emitter.on("render", setScroll);
}

function setScroll(initialLoad = true) {
    if (!document.querySelector(".chat")) return;
    setTimeout(() => {
        document.querySelector(".chat").scrollTop = document.querySelector(
            ".chat"
        ).scrollHeight;
    });
}
