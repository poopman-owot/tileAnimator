w.on("cursorMove", handleCursorMove);

class CanvasLayer {
  constructor(id, width, height) {
    const layers = document.querySelectorAll(".screen_canvas").length;
    this.renderData = "";
    this.location = [0, 0];
    this.offset = [0, 0];
    this.relativeLocation = false;
    this.snapToCell = false;
    this.elm = document.createElement("canvas");
    this.elm.id = id || `layer-${layers}`;
    this.elm.style.top = 0;
    this.elm.style.position = "fixed";
    this.elm.style.pointerEvents = "none";
    this.elm.style.zIndex = 1000 + layers;
    this.width = width;
    this.height = height;
    this.elm.style.width = this.width;
    this.elm.style.height = this.height;
    this.ctx = this.elm.getContext('2d');
    elm.main_view.appendChild(this.elm);
  }

  renderPreviewChar(textRender, fontX, fontY, char, color, link, writability, canvasWrite) {
    var textYOffset = cellH - (5 * zoom);
    var deco = getCharTextDecorations(char);
    char = clearCharTextDecorations(char);
    char = resolveCharEmojiCombinations(char);

    var cCode = char.codePointAt(0);

    // initialize link color to default text color in case there's no link to color
    var linkColor = styles.text;
    if (textColorOverride) {
      if (writability == 0 && textColorOverride & 4) linkColor = styles.public_text;
      if (writability == 1 && textColorOverride & 2) linkColor = styles.member_text;
      if (writability == 2 && textColorOverride & 1) linkColor = styles.owner_text;
    }

    var isLink = false;
    if (link) {
      isLink = true;
      if (link.linkType == "url") {
        linkColor = defaultURLLinkColor;
      } else if (link.linkType == "coord") {
        linkColor = defaultCoordLinkColor;
      }
    }

    // if text has no color, use default text color. otherwise, colorize it
    if (color == 0 || !colorsEnabled || (isLink && !colorizeLinks)) {
      textRender.fillStyle = linkColor;
    } else {
      textRender.fillStyle = `rgb(${color >> 16 & 255},${color >> 8 & 255},${color & 255})`;
    }

    // x padding of text if the char width is > 10
    var XPadding = cellWidthPad * zoom;

    // underline link
    if (isLink) {
      textRender.fillRect(fontX, fontY + textYOffset + zoom, cellW, zoom);
    }

    if (deco) {
      if (deco.under) {
        textRender.fillRect(fontX, fontY + textYOffset + zoom, cellW, zoom);
      }
      if (deco.strike) {
        textRender.fillRect(fontX, fontY + Math.floor((16 * zoom) / 2), cellW, zoom);
      }
    }

    // don't render whitespaces
    if (char == "\u0020" || char == "\u00A0") return;

    var isBold = deco && deco.bold;
    var isItalic = deco && deco.italic;
    var checkIdx = 1;
    if (char.codePointAt(0) > 65535) checkIdx = 2;
    var isSpecial = char.codePointAt(checkIdx) != void 0;
    isSpecial = isSpecial || (cCode >= 0x2500 && cCode <= 0x257F);

    var tempFont = null;
    var prevFont = null;
    if (isSpecial || deco) {
      prevFont = textRender.font;
      tempFont = textRender.font;
      if (isSpecial) tempFont = specialCharFont;
      if (isBold) tempFont = "bold " + tempFont;
      if (isItalic) tempFont = "italic " + tempFont;
      textRender.font = tempFont;
    }
    textRender.fillText(char, Math.round(fontX + XPadding), Math.round(fontY + textYOffset));
    if (prevFont) {
      textRender.font = prevFont;
    }
  }

  renderString(str, canvasWrite) {
    var parser = textcode_parser(str, {
      tileX: 0,
      tileY: 0,
      charX: 0,
      charY: 0
    }, YourWorld.Color, YourWorld.BgColor);

    var renderChars = [];
    var lastProt = null;
    var lastLink = null;

    var maxX = 0;
    var maxY = 0;

    while (true) {
      var data = parser.nextItem();
      if (data == -1) break;

      if (data.type == "char") {
        if (!data.writable) continue;
        var char = data.char;
        var color = data.color;
        var bgColor = data.bgColor;

        if (char == "\n" || char == "\r") continue;

        var posX = data.tileX * 16 + data.charX;
        var posY = data.tileY * 8 + data.charY;
        if (posX > maxX) maxX = posX;
        if (posY > maxY) maxY = posY;

        renderChars.push([posX, posY, char, color, bgColor, lastProt, lastLink]);
        lastProt = null;
        lastLink = null;
      } else if (data.type == "protect") {
        lastProt = data.protType;
      } else if (data.type == "link") {
        lastLink = data;
      }
    }


    this.ctx.font = font;

    // pass 1: background colors
    for (var i = 0; i < renderChars.length; i++) {
      var cell = renderChars[i];

      var posX = cell[0];
      var posY = cell[1];
      var bgColor = cell[4];
      var prot = cell[5];

      if (prot == null) prot = state.worldModel.writability;

      if (bgColor > -1) {
        this.ctx.fillStyle = `rgb(${bgColor >> 16 & 255},${bgColor >> 8 & 255},${bgColor & 255})`;
      } else {
        if (prot == 0) this.ctx.fillStyle = styles.public;
        if (prot == 1) this.ctx.fillStyle = styles.member;
        if (prot == 2) this.ctx.fillStyle = styles.owner;
      }
      this.ctx.fillRect(posX * cellW, posY * cellH, cellW, cellH);
    }

    // pass 2: text data
    var editArray = [];
    for (var i = 0; i < renderChars.length; i++) {
      var cell = renderChars[i];
      var posX = cell[0];
      var posY = cell[1];
      var char = cell[2];
      var color = cell[3];
      var bgColor = cell[4];
      var prot = cell[5];
      var link = cell[6];

      if (canvasWrite && cursorCoords) {
        const [tileX, tileY] = cursorCoords;
        const charData = getCharInfo(tileX, tileY, posX, posY);
        if (prot == null) prot = state.worldModel.writability;
        if (charData.char !== char || charData.color !== color || charData.bgColor !== bgColor) {
          editArray = [tileY, tileX, posY, posX, getDate(), char, nextObjId, color, bgColor];
          tellEdit.push(editArray); // track local changes
          writeBuffer.push(editArray); // send edits to server
          nextObjId++;
        }
      }
      var code = char.codePointAt();
      if (isValidSpecialSymbol(code)) {
        this.ctx.fillStyle = `rgb(${color >> 16 & 255},${color >> 8 & 255},${color & 255})`;
        drawBlockChar(code, this.ctx, posX, posY, tileW, tileH);
      } else {
        this.renderPreviewChar(this.ctx, posX * cellW, posY * cellH, char, color, link, prot, canvasWrite);
      }
    }
  }
  convertData(str, colors, bgcolors, links, protections, decorations, coords) {
    var s_str = str;
    var s_colors = colors;
    var s_bgcolors = bgcolors;
    var s_links = links;
    var s_prots = protections;
    var s_decos = decorations;
    var text = str;
    var currentCol = -1;
    var currentBgCol = -1;
    var resText = [];
    for (var y = 0; y < text.length; y++) {
      var textRow = text[y].slice(0);
      filterAdvancedChars(textRow, false, false);
      var colRow = s_colors[y] && s_colors[y].slice(0);
      var bgColRow = s_bgcolors[y] && s_bgcolors[y].slice(0);
      var linkRow = s_links[y] && s_links[y].slice(0);
      var protRow = s_prots[y] && s_prots[y].slice(0);
      var decoRow = s_decos[y] && s_decos[y].slice(0);
      for (var x = 0; x < textRow.length; x++) {
        var chr = textRow[x];
        var deco = decoRow ? decoRow[x] : false;;

        if (deco) {
          chr = setCharTextDecorations(chr, deco.bold, deco.italic, deco.under, deco.strike);
          textRow[x] = chr;
        }
      }

      if (true) {
        for (var x = 0; x < textRow.length; x++) {
          var col = 0;
          var bgCol = -1;
          if (colRow) col = colRow[x];
          if (bgColRow) bgCol = bgColRow[x];

          if (col == currentCol && bgCol == currentBgCol) continue;

          var chr = "";
          if (bgCol != currentBgCol) { // cell color
            chr += "\x1b";
            if (bgCol == -1) {
              chr += "x";
              currentCol = -1; // this also resets text color, so re-add it right after bgcolor definition
            } else {
              chr += "b" + bgCol.toString(16).padStart(6, 0);
            }
          }
          if (col != currentCol) { // text color
            chr += "\x1b";
            if (col == 0) {
              chr += "x";
              if (bgCol != -1) { // re-add cell color if applicable
                chr += "\x1b" + "b" + bgCol.toString(16).padStart(6, 0);
              }
            } else {
              chr += "F" + col.toString(16).padStart(6, 0);
            }
          }
          currentCol = col;
          currentBgCol = bgCol;
          textRow[x] = chr + textRow[x];
        }
      }
      textRow = textRow.join("");
      resText.push(textRow);

    }
    resText = resText.join("\n");

    this.renderData = resText;

  }
  handleFetch(coordA, coordB, regWidth, regHeight) {
    var tileX = coordA[0];
    var tileY = coordA[1];
    var charX = coordA[2];
    var charY = coordA[3];
    var reg = [];
    var colors = [];
    var bgcolors = [];
    var links = [];
    var protections = [];
    var decorations = [];
    for (var y = 0; y < regHeight; y++) {
      // rows
      var r_reg = [];
      var r_colors = [];
      var r_bgcolors = [];
      var r_links = [];
      var r_protections = [];
      var r_decorations = [];
      // contains non-default (not null) value in row?
      var c_color = false;
      var c_bgcolor = false;
      var c_link = false;
      var c_protection = false;
      var c_decoration = false;
      for (var x = 0; x < regWidth; x++) {
        var charInfo = getCharInfo(tileX, tileY, charX, charY);
        var char = charInfo.char;
        char = char.replace(/\r|\n|\x1b/g, " ");
        r_reg.push(char);
        r_colors.push(charInfo.color);
        r_bgcolors.push(charInfo.bgColor);
        if (charInfo.color) c_color = true;
        if (charInfo.bgColor != -1) c_bgcolor = true;
        var tile = Tile.get(tileX, tileY);
        var containsLink = false;
        if (tile && tile.properties && tile.properties.cell_props) {
          if (tile.properties.cell_props[charY] && tile.properties.cell_props[charY][charX]) {
            var link = tile.properties.cell_props[charY][charX];
            if (link.link) {
              link = link.link;
              containsLink = true;
              c_link = true;
              if (link.type == "url") {
                r_links.push("$u" + "\"" + escapeQuote(link.url) + "\"");
              } else if (link.type == "coord") {
                r_links.push("$c" + "[" + link.link_tileX + "," + link.link_tileY + "]");
              }
            }
          }
        }
        r_protections.push(charInfo.protection);
        if (charInfo.protection !== null) c_protection = true;
        if (!containsLink) {
          r_links.push(null);
        }
        r_decorations.push(charInfo.decoration);
        if (charInfo.decoration !== null) c_decoration = true;
        charX++;
        if (charX >= tileC) {
          charX = 0;
          tileX++;
        }
      }
      if (!c_color) r_colors = null;
      if (!c_link) r_links = null;
      if (!c_protection) r_protections = null;
      if (!c_decoration) r_decorations = null;
      if (!c_bgcolor) r_bgcolors = null;
      reg.push(r_reg);
      colors.push(r_colors);
      bgcolors.push(r_bgcolors);
      links.push(r_links);
      protections.push(r_protections);
      decorations.push(r_decorations);
      tileX = coordA[0];
      charX = coordA[2];
      charY++;
      if (charY >= tileR) {
        charY = 0;
        tileY++;
      }
    }

    this.convertData(reg, colors, bgcolors, links, protections, decorations, [coordA, coordB]);

  }

  clear() {
    this.ctx.clearRect(0, 0, this.elm.width, this.elm.height);
  }
  updateScale() {
    this.elm.width = this.width;
    this.elm.height = this.height;
  }
  updatePosition() {
    let [x, y] = this.location;
    const [ox, oy] = this.offset;
    x += ox;
    y += oy;
    this.elm.style.left = (this.relativeLocation ? x + positionX : x) + "px";
    this.elm.style.top = (this.relativeLocation ? y + positionY : y) + "px";
  }
  getPosition() {
    let [x, y] = this.location;
    x += this.relativeLocation ? positionX : 0;
    y += this.relativeLocation ? positionY : 0;
    return [x, y];
  }
  updateRender() {
    const [x, y] = this.getPosition();
    const coordA = getTileCoordsFromMouseCoords(x, y);
    const coordB = getTileCoordsFromMouseCoords(x + this.width, y + this.height);
    this.handleFetch(coordA, coordB, this.width / cellW, this.height / cellH);
    this.renderString(this.renderData.replace(/\r\n/g, "\n"));
  }
  update() {
    this.clear();
    this.updateScale();
    this.updatePosition();
    this.updateRender();
  }
}

function createPreview(scalar = 1) {
  const previewLayer = new CanvasLayer(null, tileWidth, tileHeight);
  previewLayer.offset = [tileWidth * scalar, 0];
  previewLayer.elm.style.opacity = 0.2;
  previewLayer.offsetScalar = scalar;
  previewLayers.push(previewLayer);
  return previewLayer;
}

function createDataLayer() {
  const previewLayer = new CanvasLayer(null, tileWidth, tileHeight);
  previewLayer.offset = [0, 0];
  previewLayer.elm.style.opacity = 0;
  previewLayer.offsetScalar = 0;
  return previewLayer;
}

function handleCursorMove(e) {
  const {
    tileX,
    tileY,
    charX,
    charY
  } = e;
  updateLayers(tileX, tileY);
  updateDataLayer(tileX, tileY);
}

function updateLayers(tileX, tileY) {
  previewLayers.forEach((layer) => {
    const [x, y] = getTileScreenPosition(tileX + (layer.offsetScalar * -1), tileY);
    layer.location = [x, y];
    layer.update();
  });
}

const previewLayers = [];
const leftside = createPreview();
const rightside = createPreview(-1);
const dataLayer = createDataLayer();

function updateDataLayer(tileX, tileY) {
  const [x, y] = getTileScreenPosition(tileX, tileY);
  dataLayer.location = [x, y];
  dataLayer.update();
}
if (!gridEnabled) {
  menu.entries[menuOptions.grid - 1].content.click();
}

const uiHTML = `
  <div id="animation-frames">
<div id = "add-zero-frame" class="animation-add"><div class="ani-btn" title = "Add new from from tile" data-frame-key="0"><div class="ani-btn-txt">+</div></div></div>
  </div>
  <div id="animation-preview-container">
    <div id="settings-container">
      <div id="setting-header">
        <div id="ani-settings-txt">
          <p>Options</p>
        </div>
      </div>
      <ul id="settings-list">
        <li>FPS: <input title = "Set animation FPS playback speed" type="range" min="1" max="6" value="3">
          <p>3</p>
        </li>
        <li> <button title = "Export animation frames as a JSON file" type="button" onclick = exportFrames();>Export JSON</button></li>

        <li> <button title = "Imports a .js JSON file and adds data to frames" onclick = readJsonFromFile();>Import JSON</button></li>
<li> <button type="button" title = "Creates and copies a standalone animation script to the users clipboard" onclick = createStandalone();>Copy Animation</button></li>
<li>
    <div class="checkbox-container">
        <label  title = "Determines if animation preview should play in the current tile" class="checkbox-label">
            <input type="checkbox"id="previewCheckbox">
            <span class="checkbox-custom"></span>
            Render preview <br>on tile
        </label>
    </div></li>
      </ul>
    </div>
    <div title = "Toggle options menu" id="settings">≡
    </div>
    <div id="ani-prev-txt">
      <p>preview</p>
    </div>
    <div class="ani-hover play">
      <div class="ani-play-btn" title = "Toggles the animation">
        <div class="ani-btn-txt play"></div>
      </div>
    </div>
    <div class="ani-frame-content">
      <div class="af-image"></div>
    </div>
  </div>
`

const styleHTML =
  `

#animation-container {
  position: fixed;
  width: 100%;
  height: 200px;
  bottom: 0px;
  background-color: #2f2f2ff0;
  display: inline-block;
  padding-left: 5px;
}

#animation-frames {
  display: inline-flex;
  height: 200px;
  width: 100%;
  position: relative;
  bottom: 0px;
  justify-content: flex-start;
  overflow-x: scroll;
  float: left;
}

.animation-frame {
  width: 210px;
  display: flex;
}

.af-image {
  width: 160px;
  height: 144px;
  display: block;
  background-color: white;
  cursor: pointer;
}

.animation-add {
  display: flex;
  width: 50px;
  height: 100%;
  align-content: center;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

.ani-btn {
  display: flex;
  width: 40px;
  height: 40px;
  background-color: #464646;
  border-radius: 100%;
  cursor: pointer;
  justify-content: center;
  align-items: baseline;
  font-family: monospace;
  font-size: 40px;
  align-content: center;
  flex-wrap: wrap;
  color: #838383;
}

.ani-play-btn {
  display: flex;
  width: 40px;
  height: 40px;
  background-color: #464646;
  border-radius: 100%;
  cursor: pointer;
  justify-content: center;
  align-items: baseline;
  font-family: monospace;
  font-size: 25px;
  align-content: center;
  flex-wrap: wrap;
  color: #838383;
}

.ani-btn-txt {
  margin-top: -5px;
}

.ani-btn:hover,
.ani-play-btn:hover {
  background-color: #6e00cb;
  color: #ffffff;
}

.animation-frame:hover {}

.ani-hover {
  width: 160px;
  height: 100%;
  position: absolute;
  cursor: pointer;
  opacity: 0;
  display: flex;
  flex-direction: row-reverse;
}

#animation-frames .animation-frame:last-child {
  margin-right: 400px
}

#animation-frames .animation-frame:first-child {
  margin-left: 44px
}

.ani-frame-content {
  display: flex;
  flex-direction: row;
  align-content: center;
  justify-content: center;
  align-items: center;
}

.ani-hover:hover,
.ani-hover.selected {
  background-color: #a900ff69;
  opacity: 1;
}

.ani-hover>.ani-btn {
  opacity: 0;
  border-radius: 0;
}

.ani-hover:hover>.ani-btn,
.ani-hover:hover>.ani-play-btn {
  opacity: 1;
}

.ani-hover>.close-btn:hover {
  background-color: red;

}
.ani-hover>.paste-btn:hover {
  background-color: #a900ff;

}
.ani-remove-btn {
  display: block;
  background-color: aquamarine;
  width: 40px;
  height: 40px;
  float: right;
}

#animation-preview-container {
  display: inline-flex;
  height: 200px;
  background-color: #272727;
  float: right;
  width: 220px;
  position: relative;
  align-content: center;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  top: -200px;
  flex-wrap: wrap;
  flex-direction: column;
}


#ani-prev-txt {
  color: grey;
  font-family: monospace;
  font-size: x-large;
  margin: 5px;
  margin-top: -10px;
}

/* Webkit-based browsers (Chrome, Safari) */
#animation-frames::-webkit-scrollbar {
  width: 10px;
  /* Set the width of the scrollbar */

}

#animation-frames::-webkit-scrollbar-thumb {
  background-color: #888;
  /* Set the color of the scrollbar thumb (the draggable part) */
  border-radius: 10px;
}

#animation-frames::-webkit-scrollbar-thumb:hover {
  background-color: #555;
  /* Set the color of the scrollbar thumb on hover */
  border-radius: 10px;
}

#animation-frames::-webkit-scrollbar-track {
  background-color: #ddd;
  /* Set the color of the scrollbar track (the non-draggable part) */

}

/* Firefox scrollbar styling */
#animation-frames {
  scrollbar-width: thin;
  /* For Firefox */
  scrollbar-color: #888 #ddd;
  /* For Firefox */
}

.ani-hover.play {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ani-play-btn .ani-btn-txt {
  margin-top: 0px;
  margin-left: 3px;
}

.ani-btn-txt.pause {
  margin-left: 0px;
}

.ani-btn-txt.play::after {
  content: "▶";
}

.ani-btn-txt.pause::after {
  content: "◼";
}

#settings {
  display: flex;
  width: 30px;
  height: 30px;
  position: absolute;
  top: 4px;
  left: 0px;
  z-index: 1000;
  justify-content: center;
  align-items: center;
  font-size: xx-large;
  color: white;
  cursor: pointer;
}

#settings:hover {
  background-color: #464646;
}
#settings-container {
display: none;
    width: 220px;
    height: 100%;
    position: fixed;
    top: 0;
    background-color: #3a3a3a;
    right: 0px;
    z-index: -1;
}
#settings-container.active {
display: block;

}
#ani-settings-txt {
    color: grey;
    font-family: monospace;
    font-size: x-large;
    margin: 5px;
}

#setting-header {
    display: flex;
    justify-content: center;
}

#settings-list li {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    font-family: monospace;
    color: white;
    border-bottom: 1px solid black;
    padding-bottom: 10px;
}

#settings-list {padding: 0px 20px;}

#settings-list li button {
    background-color: #0074D9; /* Set the background color to a shade of blue */
    color: #FFFFFF; /* Set the text color to white */
    font-size: 16px; /* Set the font size to 16 pixels */
    padding: 10px 20px; /* Add padding to the button (10px top/bottom, 20px left/right) */
    border: none; /* Remove the default button border */
    border-radius: 5px; /* Add rounded corners */
    cursor: pointer; /* Change cursor to a pointer when hovering over the button */
    width: 100%;
}

#settings-list li button:hover {
    background-color: #228ae4;
}
#settings-container .checkbox-container {
  display: flex;
  align-items: center;
}

#settings-container .checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

#settings-container .checkbox-custom {
  width: 24px;
  height: 24px;
  border: 2px solid #3498db;
  border-radius: 4px;
  margin-right: 10px;
  position: relative;
}

#settings-container .checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
  background-color: #3498db;
  border: 2px solid #3498db;
}

#settings-container .checkbox-label input[type="checkbox"]:checked + .checkbox-custom::after {
  content: "✓";
  color: white;
  font-size: 16px;
  position: absolute;
  top: 2px;
  left: 5px;
}

#settings-container .checkbox-label input[type="checkbox"] {
  display: none;
}
`
const animation_container = document.createElement("div");
animation_container.id = `animation-container`;
animation_container.innerHTML = uiHTML;
elm.main_view.appendChild(animation_container);

const ui_style = document.createElement("style");
ui_style.innerHTML = styleHTML;
document.head.appendChild(ui_style);


let animationFrames = [];
class AnimationFrame {
  constructor() {
    this.id = btoa(`${animationFrames.length}_${Math.random()}`);
    this.data = structuredClone(dataLayer.renderData);
    this.element = document.createElement('div');
    this.element.classList.add('animation-frame');
    this.randomBackgroundColor = this.getRandomColor();
    this.src = dataLayer.elm.toDataURL("image/png");
    this.element.innerHTML = `
        <div class="ani-hover">
          <div class="ani-btn close-btn" data-frame-key="${this.id}">
            <div class="ani-btn-txt" title = "remove thumbnail">×</div>
          </div>
          <div class="ani-btn paste-btn" title = "Paste into tile" data-frame-key="${this.id}">
            <div class="ani-btn-txt">⮭</div>
          </div>
        </div>
        <div class="ani-frame-content">
           <div class="af-image" style="background-image:url(${this.src}); background-color: ${this.randomBackgroundColor};"></div>
          <div class="animation-add">
            <div class="ani-btn" title = "Add new from from tile">
              <div class="ani-btn-txt">+</div>
            </div>
          </div>
        </div>
    `;
  }
  updateImage() {
    this.element.innerHTML = `
        <div class="ani-hover">
          <div class="ani-btn close-btn" data-frame-key="${this.id}">
            <div class="ani-btn-txt" title = "remove thumbnail">×</div>
          </div>
          <div class="ani-btn paste-btn"  title = "Paste into tile" data-frame-key="${this.id}">
            <div class="ani-btn-txt">⮭</div>
          </div>
        </div>
        <div class="ani-frame-content">
           <div class="af-image" style="background-image:url(${this.src}); background-color: ${this.randomBackgroundColor};"></div>
          <div class="animation-add">
            <div class="ani-btn" title = "Add new from from tile">
              <div class="ani-btn-txt" >+</div>
            </div>
          </div>
        </div>
    `;
  }
  getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  addToFrames(frame, index) {
    animationFrames.splice(index + 1, 0, frame);
    updateAnimationFrames();
  }
  removeFromFrames(index) {
    animationFrames.splice(index, 1);
    updateAnimationFrames();
  }
}

// Add a single event listener to the container and delegate the click handling
document.getElementById('animation-frames').addEventListener('click', function(event) {
  const addButton = event.target.closest('.animation-add .ani-btn');
  const removeButton = event.target.closest('.ani-hover .close-btn');
  const hoverButton = event.target.closest('.ani-hover');
  const pasteButton = event.target.closest('.ani-hover .paste-btn');

  if (addButton) {
    const frame_container = document.querySelector("#animation-frames");
    const lastChild = frame_container.lastChild;
    const fc_width = frame_container.scrollWidth;
    if (lastChild) {
      if (lastChild.nodeName !== `#text`) {
        if (lastChild.querySelector('.animation-add .ani-btn') == addButton) {
          setTimeout(function() {
            frame_container.scrollTo({
              top: 0,
              left: fc_width,
              behavior: "smooth",
            });

          }, 10)
        }
      }
    }

    let frameElement = addButton.closest('.animation-frame');
    if (!frameElement) {
      frameElement = document.querySelector('#add-zero-frame');
    }
    const frameKey = frameElement.querySelector(".ani-btn").getAttribute('data-frame-key');
    createFrameObject(frameKey);
  } else if (removeButton) {

    let frameElement = removeButton.closest('.animation-frame');
    const frameKey = frameElement.querySelector(".ani-btn").getAttribute('data-frame-key');
    removeFrameObject(frameKey);


  } else if (pasteButton) {
    let frameElement = pasteButton.closest('.animation-frame');
    const frameKey = frameElement.querySelector(".ani-btn").getAttribute('data-frame-key');
    pasteFrameObject(frameKey);

  } else if (hoverButton) {
    document.querySelectorAll(".ani-hover.selected").forEach(function(e) {
      e.classList.remove("selected");
    })
    hoverButton.classList.add("selected");
    setPreview();
  }
});

function setPreview() {
  const selectedImage = document.querySelector(".ani-hover.selected + .ani-frame-content .af-image");
  const bg_url = selectedImage ? document.querySelector(".ani-hover.selected + .ani-frame-content .af-image").style.backgroundImage : "";
  document.querySelector("#animation-preview-container .af-image").style.backgroundImage = bg_url;
}

function createFrameObject(key) {
  let index = animationFrames.findIndex(obj => obj.id === key);
  let newFrame;
  if (index !== -1) {
    newFrame = new AnimationFrame();
    animationFrames[index].addToFrames(newFrame, index);
  } else {
    newFrame = new AnimationFrame();
    if (!animationFrames[0]) {
      animationFrames.push(newFrame);
      updateAnimationFrames();
    } else {
      animationFrames[0].addToFrames(newFrame, -1);
    }
  }
  return newFrame;
}

function removeFrameObject(key) {
  let index = animationFrames.findIndex(obj => obj.id === key);
  if (index !== -1) {
    animationFrames[index].removeFromFrames(index)
  }
}

function pasteFrameObject(key) {
  let index = animationFrames.findIndex(obj => obj.id === key);
  if (index !== -1) {
    const frame = animationFrames[index];
    dataLayer.renderString(frame.data, true);
  }
}

function updateAnimationFrames() {
  const frames_container = document.getElementById('animation-frames');
  frames_container.querySelectorAll(".animation-frame").forEach(function(e) {
    e.remove();

  })
  animationFrames.forEach(obj => {
    frames_container.appendChild(obj.element);
  });
}

//------------------------------------
let isRunning = false;
let intervalId = null;
let targetFPS = 3;
let animationLoopTimeout;
w.setFlushInterval(1);

function animationLoop() {
  const frames_container = document.getElementById('animation-frames');
  const selected = frames_container.querySelector(".ani-hover.selected");
  const nextEl = selected ? selected.parentElement.nextElementSibling : null;
  const nextHover = nextEl ? nextEl.querySelector(".ani-hover") : frames_container.querySelector(".ani-hover");
  const index = nextHover ? Array.from(frames_container.children).indexOf(nextHover.parentElement) : null;


  if (index && document.querySelector("#previewCheckbox").checked) {
    const frame = animationFrames[index - 1];
    dataLayer.renderString(frame.data, true);
  }
  if (selected) {
    selected.classList.remove("selected");
  }
  if (nextHover) {
    nextHover.classList.add("selected");
  }
  setPreview();
  const interval = 1000 / targetFPS;
  clearTimeout(animationLoopTimeout);
  // Schedule the next iteration
  if (isRunning) {
    animationLoopTimeout = setTimeout(animationLoop, interval);
  }
}

function selectElementsAtFPS() {
  isRunning = !isRunning;
  if (isRunning) {
    const interval = 1000 / targetFPS;
    animationLoopTimeout = setTimeout(animationLoop, interval);
  } else {
    clearTimeout(animationLoopTimeout);
  }
}

document.querySelector("#animation-preview-container .ani-hover").addEventListener("click", function() {
  selectElementsAtFPS();
  document.querySelector('#animation-preview-container .ani-btn-txt').classList.toggle("pause");
})
document.querySelector("#settings").addEventListener("click", function(e) {
  document.querySelector("#settings-container").classList.toggle("active");

})
document.querySelector("#settings-list input[type=range]").addEventListener("change", function(e) {
  targetFPS = parseInt(e.target.value);
  document.querySelector("#settings-list input[type=range] + p").innerText = targetFPS;
})

function importFrames(jsonFrames) {
  const reversedJsonFrames = jsonFrames.reverse();
  reversedJsonFrames.forEach(jsonFrame => {
    const frame = createFrameObject();
    frame.data = jsonFrame.data;
    frame.src = jsonFrame.src;
    frame.updateImage();
  });

}

function exportFrames(fileName = "owot-animation-frames-" + Date.now()) {
  let exportFrames = [];
  animationFrames.forEach(obj => {
    exportFrames.push({
      data: obj.data,
      src: obj.src
    });
  });
  const jsonString = JSON.stringify(exportFrames); // The 'null, 2' argument adds indentation for readability
  const blob = new Blob([jsonString], {
    type: 'application/javascript'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.js`;
  link.click();
  URL.revokeObjectURL(url);
  return jsonString;
}

function readJsonFromFile() {
  // Create an input element of type 'file'
  const inputElement = document.createElement('input');
  inputElement.type = 'file';
  inputElement.accept = '.js'; // Specify that we only want JavaScript files

  // Set up an event listener to handle file selection
  inputElement.addEventListener('change', function(event) {
    const file = event.target.files[0];

    if (!file) {
      // No file selected
      return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const fileContent = e.target.result;
        // Extract JSON data from the JavaScript file content
        importFrames(JSON.parse(fileContent));
        const jsonData = fileContent //eval(fileContent);
      } catch (error) {
        console.error('Error reading JSON from file:', error);
      }
    };

    // Read the file as text
    reader.readAsText(file);
  });

  // Trigger the file input element's click event
  inputElement.click();
}
owot.addEventListener("dblclick", function(e) {
  const frame_container = document.querySelector("#animation-frames");
  const lastChild = frame_container.lastChild;
  const fc_width = frame_container.scrollWidth;
  if (lastChild) {

    if (lastChild.nodeName !== `#text`) {
      let frameElement = lastChild.closest('.animation-frame');
      if (!frameElement) {
        frameElement = document.querySelector('#add-zero-frame');
      }
      const frameKey = frameElement.querySelector(".ani-btn").getAttribute('data-frame-key');
      createFrameObject(frameKey);
      setTimeout(function() {
        frame_container.scrollTo({
          top: 0,
          left: fc_width,
          behavior: "smooth",
        });
      }, 10)
    } else {
      createFrameObject();
    }
  }
})

function copyToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

function createStandalone() {
  const interval = 1000 / targetFPS;
  const standAloneFrames = [];
  animationFrames.forEach(obj => {
    standAloneFrames.push(obj.data);
  });
  const SAF = `
(function(){
w.setFlushInterval(1);
let animationLoop;
if(!cursorCoords){
alert("you need to click on a tile before running this;")
return;
}

const currentCoords = cursorCoords;
function handleCursorMove(){
if(cursorCoords){
if(currentCoords[0] !== cursorCoords[0] || currentCoords[1] !== cursorCoords[1] ){
clearInterval(animationLoop);
}
}
else{
clearInterval(animationLoop);
}
}
w.on("cursorMove", handleCursorMove);

function renderString(str) {
    var parser = textcode_parser(str, {
      tileX: 0,
      tileY: 0,
      charX: 0,
      charY: 0
    }, YourWorld.Color, YourWorld.BgColor);

    var renderChars = [];
    var lastProt = null;
    var lastLink = null;

    var maxX = 0;
    var maxY = 0;

    while (true) {
      var data = parser.nextItem();
      if (data == -1) break;

      if (data.type == "char") {
        if (!data.writable) continue;
        var char = data.char;
        var color = data.color;
        var bgColor = data.bgColor;
        var posX = data.tileX * 16 + data.charX;
        var posY = data.tileY * 8 + data.charY;
        if (posX > maxX) maxX = posX;
        if (posY > maxY) maxY = posY;

        renderChars.push([posX, posY, char, color, bgColor, lastProt, lastLink]);
        lastProt = null;
        lastLink = null;
      } else if (data.type == "protect") {
        lastProt = data.protType;
      } else if (data.type == "link") {
        lastLink = data;
      }
    }

    // pass 1: background colors
    for (var i = 0; i < renderChars.length; i++) {
      var cell = renderChars[i];

      var posX = cell[0];
      var posY = cell[1];
      var bgColor = cell[4];
      var prot = cell[5];

      if (prot == null) prot = state.worldModel.writability;

    // pass 2: text data
    var editArray = [];
    for (var i = 0; i < renderChars.length; i++) {
      var cell = renderChars[i];
      var posX = cell[0];
      var posY = cell[1];
      var char = cell[2];
      var color = cell[3];
      var bgColor = cell[4];
      var prot = cell[5];
      var link = cell[6];
      
      if (cursorCoords) {
        const [tileX, tileY] = cursorCoords;
				const charData = getCharInfo(tileX, tileY,posX,posY);
        if (prot == null) prot = state.worldModel.writability;
if(charData.char !== char || charData.color !== color || charData.bgColor !== bgColor)
{
        editArray = [tileY, tileX, posY, posX, getDate(), char, nextObjId, color, bgColor];
        tellEdit.push(editArray); // track local changes
        writeBuffer.push(editArray); // send edits to server
        nextObjId++;}
      }
    }
  }

}



let currentFrame = 0;
const standAloneFrames = ${JSON.stringify(standAloneFrames)};
animationLoop = setInterval(function(){
renderString(standAloneFrames[currentFrame]);
  currentFrame++;
    if(currentFrame > standAloneFrames.length-1){
currentFrame = 0;
        
    }
    
},${interval});
}
)();
`;
  copyToClipboard(SAF)
  alert("Standalone animation has been copied to your clipboard.")
}
