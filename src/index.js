let html = require("choo/html");
let Cabal = require("cabal-core");
let choo = require("choo");
let DateTime = require("luxon").DateTime;
let ram = require("random-access-memory");
let ColorHash = require("color-hash/lib/color-hash.js");
let colorhash = new ColorHash({ lightness: 0.5 });
let app = choo();
let storedName = localStorage.getItem("name");
let swarm = require("./swarm");
let collect = require("collect-stream");

const channel = "p2p-party-line";

app.use(setupView);
app.use(setupChat);
app.route("/", loginView);
app.route("/*", mainView);
app.mount("body");
setScroll(true);

const windowTitle = "party line chat";

const colorMap = {};

function toColor(name) {
    if (!colorMap[name]) {
        colorMap[name] = colorhash.hex(name);
    }
    return colorMap[name];
}

function setupChat(state, emitter) {
    let chat;
    emitter.on("navigate", () => onNavigate());
    emitter.on("DOMContentLoaded", () => onNavigate());
    function onNavigate() {
        let key = state.params && state.params.wildcard;
        if (chat && (!key || !key.length)) {
            chat = null;
            emitter.removeAllListeners("newmsg");
        } else if (!chat && key && key.length) {
            let actualKey = key !== "newchat" ? key : undefined;
            chat = Cabal(ram, actualKey);
            window.chat = chat;
            chat.getLocalKey((err, newKey) => {
                if (key === "newchat") {
                    emitter.emit("pushState", `#${newKey}`);
                }
                swarm(chat, window.HUBS);
            });
            let rs = chat.messages.read(channel, { limit: 100, lt: "~" });
            collect(rs, function(err, msgs) {
                if (err) return;
                // console.warn("initial messages", msgs);
            });
            chat.users.events.on("update", (key, msg) => {
                state.names[key] = msg.value.content.name;
                emitter.emit("render");
            });
            chat.messages.events.on("message", msg => {
                emitter.emit("say", msg);
            });
            chat.on("peer-added", () => {
                state.peers += 1;
                emitter.emit("render");
            });
            chat.on("peer-dropped", () => {
                state.peers === 0 ? 0 : state.peers - 1;
                emitter.emit("render");
            });
            emitter.on("newmsg", ({ name, message }) => {
                state.name = name;
                if (chat.username !== name) {
                    localStorage.setItem("name", name);
                    chat.publishNick(name);
                    chat.username = name;
                }
                if (message) {
                    chat.publish({
                        type: "chat/text",
                        content: {
                            text: message,
                            channel
                        }
                    });
                }
            });
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
    replaced = replaced.replace(
        /(`{1,3})([^`]+)(`{1,3})/g,
        (t, b1, code) => `<code>${code}</code>`
    );
    replaced = replaced.replace(
        /^> (.*)/g,
        text => `<blockquote>${text}</blockquote>`
    );
    el.innerHTML = replaced;
    return el;
}

function mainView(state, emit) {
    return html`
    <body onblur=${onblur} onfocus=${onfocus}>
        <div class="chat">
        ${state.lines.map(row => {
            const name = state.names[row.key] || row.key;
            return html`<div class="line">
                <span class="time">${DateTime.fromMillis(
                    row.value.timestamp
                ).toLocaleString(timeConfig)}</span>
                <span class="who" style="color:${toColor(name)}">${"<" +
                name +
                ">"}</span>
                ${toHTML(row.value.content.text)}
            </div>`;
        })}
        </div>
        <form onsubmit=${onsubmit} class="newmsg">
            <div class="info">
                <span>peers online: ${state.peers}</span>
                <span>your name: <input class="edit-name" type="text" name="name" placeholder="enter name" value="${state.name}"></span>
            </div>
            <input onkeydown=${onkeydown} class="entry" placeholder="type here" type="text" name="text" autofocus value=${state.input} />
            <button>Enter</button>
        </form>
    </body>
  `;
    function onkeydown(e) {
        state.input = e.target.value;
    }
    function onsubmit(e) {
        state.input = "";
        e.preventDefault();
        emit("newmsg", {
            name: this.elements.name.value,
            message: this.elements.text.value
        });
    }

    function onblur() {
        state.here = false;
    }
    function onfocus() {
        state.here = true;
        emit("DOMTitleChange", windowTitle);
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
        emit("pushState", "#newchat");
    }

    function onsubmit(e) {
        e.preventDefault();
        if (this.elements.key.value.length) {
            emit("pushState", `#${this.elements.key.value}`);
        }
    }
}

function setupView(state, emitter) {
    state.input = "";
    state.here = true;
    state.peers = 0;
    state.names = {};
    state.name =
        storedName || `scatman ${Math.floor(Math.random() * (10 - 1) + 1)}`;
    state.lines = [];
    emitter.on("say", function(row) {
        state.lines.push(row);
        state.lines = state.lines.sort(
            (a, b) => a.value.timestamp - b.value.timestamp
        );
        emitter.emit("render");
        let title = windowTitle;
        if (!state.here) {
            title += " *";
        }
        emitter.emit("DOMTitleChange", title);
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
