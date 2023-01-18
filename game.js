import { readData, readDataWhere, writeData, updateData, changeListener } from './database.js'

let components, players, playerComponents, player, playerComponent
let name = localStorage.name || undefined

async function start() {
    gameArea.start()
    window.onkeydown = (event) => {
        gameArea.keys = (gameArea.keys || []);
        gameArea.keys[event.keyCode] = true
    }
    window.onkeyup = (event) => {
        gameArea.keys[event.keyCode] = false
    }
    window.onbeforeunload = () => {
        updateData('players/' + name, {
            online: false,
        })
    }
    gameArea.canvas.onmousedown = (event) => {
        gameArea.mouseX = event.clientX - gameArea.canvas.offsetLeft
        gameArea.mouseY = event.clientY - gameArea.canvas.offsetTop
    }
    gameArea.canvas.onmouseup = () => {
        gameArea.mouseX = undefined
        gameArea.mouseY = undefined
    }
    changeListener('players', (data) => {
        players = Object.values(data)
        if (!name) {
            do {
                name = prompt('Enter your name')
            }
            while (name == '' || !name);
            if (getPlayer(name)) {
                updateData('players/' + name, {
                    online: true,
                })
            } else {
                writeData('players/' + name, {
                    name,
                    x: 0,
                    y: 0,
                    online: true,
                })
            }
            localStorage.name = name
        } else {
            updateData('players/' + name, {
                online: true,
            })
        }
        components = []
        playerComponents = []
        players.map(player => {
            console.log(player);
            let component = new Player(player.name, 'rect', player.x, player.y, 30, 30, 'red', true)
            if (player.online) component.addComponent()
            if (player.name == name) playerComponent = component
        })
        player = getPlayer(name)
    })
    // playerComponent = new Player(name, 'rect', 0, 0, 30, 30, 'red', true)
    // playerComponent.addComponent()
}

let gameArea = {
    canvas: document.getElementById('canvas'),
    start: function () {
        this.ctx = this.canvas.getContext('2d')
        this.interval = setInterval(updateGameArea, 10);
    },
    clear: function () {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    stop: function () {
        clearInterval(this.interval);
        clearInterval(this.timeInterval);
    },
}

class Component {
    constructor(type, x, y, width, height, color, fill, textAlign, textBaseline) {
        this.ctx = gameArea.ctx
        this.type = type
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.color = color
        this.fill = fill
        this.textAlign = textAlign
        this.textBaseline = textBaseline
    }
    draw() {
        if (this.type == 'rect') {
            this.ctx.strokeStyle = this.color
            this.ctx.strokeRect(this.x, this.y, this.width, this.height);
            if (this.fill) {
                this.ctx.fillStyle = this.color;
                this.ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }
        if (this.type == 'image') {
            let image = new Image()
            image.src = `image/${this.color}`
            if (this.width !== undefined && this.height !== undefined) {
                image.onload = () => {
                    this.ctx.drawImage(image, this.x, this.y, this.width, this.height);
                }
            } else {
                image.onload = () => {
                    this.ctx.drawImage(image, this.x, this.y);
                }
            }
        }
        if (this.type == 'text') {
            this.ctx.font = this.width + " " + this.height;
            this.ctx.fillStyle = this.color;
            if (this.textAlign)
                this.ctx.textAlign = this.textAlign
            if (this.textBaseline)
                this.ctx.textBaseline = this.textBaseline
            this.ctx.fillText(this.text, this.x, this.y);
        }
        if (this.type == 'circle') {
            this.ctx.beginPath();
            this.ctx.arc(this.x, this.y, this.width, 0, 2 * Math.PI);
            this.height = this.width
            this.ctx.strokeStyle = this.color
            this.ctx.stroke();
            if (this.fill) {
                this.ctx.fillStyle = this.color
                this.ctx.fill();
            }
        }
    }
    clicked() {
        if (components.indexOf(this) > -1) {
            let myleft = this.x;
            let myright = this.x + (this.width);
            let mytop = this.y;
            let mybottom = this.y + (this.height);
            let clicked = false;
            if ((mybottom >= gameArea.mouseY) || (mytop <= gameArea.mouseY) || (myright >= gameArea.mouseX) || (myleft <= gameArea.mouseX)) {
                clicked = true;
            }
            return clicked;
        } else return false
    }
    touchWith(otherobj) {
        if (components.indexOf(this) > -1 && components.indexOf(otherobj) > -1) {
            let touch = true;
            let myleft = this.x;
            let myright = this.x + (this.width);
            let mytop = this.y;
            let mybottom = this.y + (this.height);
            let otherleft = otherobj.x;
            let otherright = otherobj.x + (otherobj.width);
            let othertop = otherobj.y;
            let otherbottom = otherobj.y + (otherobj.height);
            if ((mybottom < othertop) ||
                (mytop > otherbottom) ||
                (myright < otherleft) ||
                (myleft > otherright)) {
                touch = false;
            }
            return touch;
        } else return false
    }
    addComponent() {
        if (!this.isComponent()) components.push(this)
    }
    isComponent() {
        if (components.includes(this)) return true
        else return false
    }
    deleteComponent() {
        if (this.isComponent())
            components.splice(components.indexOf(this), 1)
    }
}

class Player extends Component {
    constructor(name, x, y, width, height, color, fill, textAlign, textBaseline) {
        super(x, y, width, height, color, fill, textAlign, textBaseline)
        this.name = name
        this.type = 'rect'
        this.ctx = gameArea.ctx
        this.speedX = 0
        this.speedY = 0
        this.gravitySpeed = 0;
    }
    newPos() {
        this.gravitySpeed += this.gravity;
        this.x += this.speedX;
        this.y += this.speedY;
        updateData('players/' + name, {
            x: this.x,
            y: this.y,
        })
    }
    moveUp(speed) {
        this.speedY = -speed;
    }
    moveDown(speed) {
        this.speedY = speed;
    }
    moveLeft(speed) {
        this.speedX = -speed;
    }
    moveRight(speed) {
        this.speedX = speed;
    }
    isComponent() {
        if (playerComponents.filter(component => component.name == this.name).length) return true
        else return false
    }
    addComponent() {
        if (!this.isComponent()) {
            playerComponents.push(this)
        }
    }
    deleteComponent() {
        if (this.isComponent()) {
            components.splice(components.indexOf(this), 1)
            playerComponents.splice(playerComponents.indexOf(this), 1)
        }
    }
}

class Sound {
    constructor(src, volume, loop) {
        this.audio = new Audio('sound/' + src)
        this.volume = volume
        this.loop = loop
    }
    play() {
        this.audio.volume = this.volume / 100
        this.audio.loop = this.loop
        this.audio.play()
    }
    pause() {
        this.audio.pause()
    }
}

function getPlayer(name) {
    return players.filter(player => player.name == name)[0]
}

function drawBackground(type, color) {
    let background = new Component(type, 0, 0, gameArea.canvas.width, gameArea.canvas.height, color, true)
    background.draw()
}

function updateGameArea() {
    gameArea.clear();
    playerComponent.speedX = 0;
    playerComponent.speedY = 0;
    if (keyDown(37)) {
        playerComponent.moveLeft(5)
    }
    if (keyDown(39)) {
        playerComponent.moveRight(5)
    }
    if (keyDown(38)) {
        playerComponent.moveUp(5)
    }
    if (keyDown(40)) {
        playerComponent.moveDown(5)
    }
    drawBackground('rect', 'lightblue')
    components.map(component => {
        component.draw()
    })
    playerComponents.map(component => {
        component.draw()
        component.newPos()
    })
}

function keyDown(keyCode) {
    if (gameArea.keys && gameArea.keys[keyCode]) return true
    return false
}

start()