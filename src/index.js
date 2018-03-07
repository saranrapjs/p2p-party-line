let html = require("choo/html");
// let devtools = require('choo-devtools')
let Chat = require("./chat.js");
let choo = require("choo");
let DateTime = require("luxon").DateTime;
let memdb = require("memdb");
let ColorHash = require("color-hash/lib/color-hash.js");
let colorhash = new ColorHash({ lightness: 0.5 });
let app = choo();
let storedName = localStorage.getItem("name");
let bip39 = require("bip39");
app.use(countStore);
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
            const m = row.value.message;
            return html`<div class="line">
                <span class="time">${DateTime.fromMillis(
                    row.value.time
                ).toLocaleString(timeConfig)}</span>
                <span class="who" style="color:${toColor(m.who)}">${"<" +
                m.who +
                ">"}</span>
                ${toHTML(m.message)}
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
            who: this.elements.name.value,
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
        emit(
            "pushState",
            `#${bip39
                .generateMnemonic()
                .split(" ")
                .join("-")}`
        );
    }

    function onsubmit(e) {
        e.preventDefault();
        if (this.elements.key.value.length) {
            emit("pushState", `#${this.elements.key.value}`);
        }
    }
}

function countStore(state, emitter) {
    state.input = "";
    state.here = true;
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
