let html = require("choo/html");
const Nanocomponent = require("nanocomponent");

class Input extends Nanocomponent {
  constructor() {
    super();
    this.state = {};
  }
  createElement(state) {
    this.state = state;
    return html`
      <input class="entry" onkeydown=${state.onkeydown} placeholder="type here" type="text" name="text" autofocus>
    `;
  }
  update(state) {
    return state.input === "";
  }
}

module.exports = Input;
