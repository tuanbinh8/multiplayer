import { readData, readDataWhere, writeData, updateData, changeListener, serverTimestamp } from './database.js'

let components, players, playerComponents, player, playerComponent
let name = localStorage.name || undefined
let chatLength
let hasStarted = false

let loaderContainer = document.getElementById('loader-container')
let xDisplayer = document.getElementById('x')
let yDisplayer = document.getElementById('y')
let colorInput = document.getElementById('color')
let chatInput = document.getElementById('chat-input')
let chatList = document.getElementById('chat-list')
let chatButton = document.getElementById('chat-button')
let movingButtonsContainer = document.getElementById('moving-buttons')
let movingButtons = Array.from(document.querySelectorAll('#moving-buttons button'))
let logOutButton = document.getElementById('log-out')

async function start() {
    console.log(serverTimestamp());
    gameArea.start()
    window.onkeydown = (event) => {
        gameArea.keys = gameArea.keys || []
        gameArea.keys[event.key] = true
        if ((event.key == 't' || event.key == 'T') && chatInput.style.display == 'none') {
            event.preventDefault()
            chatInput.style.display = 'block'
            chatInput.focus()
            chatButton.innerText = 'Close'
        }
        if (event.key == 'Escape') {
            chatInput.style.display = 'none'
            chatInput.value = ''
            gameArea.canvas.focus()
            chatButton.innerText = 'Chat'
        }
    }

    window.onkeyup = (event) => {
        gameArea.keys[event.key] = false
    }

    window.onbeforeunload = () => {
        updateData('players/' + name, {
            online: false,
        })
        chatLog(name + ' disconnected')
    }

    gameArea.canvas.onmousedown = (event) => {
        gameArea.mouseX = event.clientX - gameArea.canvas.offsetLeft
        gameArea.mouseY = event.clientY - gameArea.canvas.offsetTop
    }

    gameArea.canvas.onmouseup = () => {
        gameArea.mouseX = undefined
        gameArea.mouseY = undefined
    }

    chatInput.onkeydown = async (event) => {
        let key = event.key
        if (key == 'Enter') {
            chatInput.value = chatInput.value.trim()
            if (chatInput.value == '') return
            writeData('chat/' + chatLength, {
                name,
                text: chatInput.value,
            })
            writeData('chat/length', chatLength + 1)
            chatInput.value = ''
        }
    }
    
    chatInput.onblur = () => {
        window.dispatchEvent(new KeyboardEvent('keydown', {
            'key': 'Escape'
        }));
    }

    colorInput.onchange = () => {
        writeData('players/' + name + '/color', colorInput.value)
    }

    chatButton.onclick = () => {
        if (chatButton.innerText == 'Chat') {
            window.dispatchEvent(new KeyboardEvent('keydown', {
                'key': 't'
            }));
        } else {
            window.dispatchEvent(new KeyboardEvent('keydown', {
                'key': 'Escape'
            }));
        }
    }

    movingButtons.map(button => {
        button.ontouchstart = () => {
            window.dispatchEvent(new KeyboardEvent('keydown', {
                'key': button.dataset.key
            }));
            button.style.backgroundColor = 'white'
        }
        button.ontouchend = () => {
            window.dispatchEvent(new KeyboardEvent('keyup', {
                'key': button.dataset.key
            }));
            button.style.backgroundColor = 'transparent'
        }
    })

    logOutButton.onclick = () => {
        localStorage.removeItem('name')
        location.reload()
    }

    changeListener('.info/connected', (online) => {
        if (getPlayer(name)) {
            if (online) {
                updateData('players/' + name, {
                    online: true,
                })
                chatLog(name + ' joined')
            } else {
                updateData('players/' + name, {
                    online: false,
                })
                chatLog(name + ' disconnected')
            }
        }
    })

    changeListener('chat', async (data) => {
        chatList.innerHTML = ''
        Object.values(data).map(chat => {
            if (typeof chat == 'object') {
                if (chat.name)
                    chatList.innerHTML += `<li><b>${chat.name}:</b> ${chat.text}</li>`
                else
                    chatList.innerHTML += `<li>${chat.text}</li>`
            }
        })
        chatLength = await readData('chat/length')
        chatList.style.clipPath = `polygon(0% ${chatList.offsetHeight - 210}px, 100% ${chatList.offsetHeight - 210}px, 100% 100%, 0% 100%)`
    })

    changeListener('players', (data) => {
        players = Object.values(data)
        if (!hasStarted) {
            if (!name) {
                do {
                    name = prompt('Enter your name')
                    if (getPlayer(name) && getPlayer(name).online) {
                        alert('Someone else is using this account')
                        name = undefined
                    }
                } while (name == '' || !name);
                if (getPlayer(name)) {
                    updateData('players/' + name, {
                        online: true,
                    })
                } else {
                    writeData('players/' + name, {
                        name,
                        x: Math.round(gameArea.canvas.width / 2),
                        y: Math.round(gameArea.canvas.height / 2),
                        color: '#ff0000',
                        online: true,
                    })
                }
                localStorage.name = name
                chatLog(name + ' joined')
            } else {
                if (getPlayer(name)) {
                    updateData('players/' + name, {
                        online: true,
                    })
                    chatLog(name + ' joined')
                } else {
                    localStorage.removeItem('name')
                    location.reload()
                }
            }
            loaderContainer.remove()
            hasStarted = true
        }
        components = []
        playerComponents = []
        players.map(player => {
            let component = new Player(player.name, player.x, player.y, 50, player.color)
            if (player.online) component.addComponent()
            if (player.name == name) playerComponent = component
        })
        player = getPlayer(name)
        colorInput.value = player.color
    })
    if (!/Android|webOS|iPhone|iPad|Macintosh|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        movingButtonsContainer.remove()
        chatButton.remove()
    }
}

let gameArea = {
    canvas: document.getElementById('canvas'),
    start: function () {
        this.ctx = this.canvas.getContext('2d')
        this.interval = setInterval(updateGameArea)
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
        if (this.isComponent() && otherobj.isComponent()) {
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

class Player {
    constructor(name, x, y, width, color) {
        this.ctx = gameArea.ctx
        this.name = name
        this.x = x
        this.y = y
        this.width = width
        this.height = width
        this.color = color
        this.speedX = 0
        this.speedY = 0
    }
    draw() {
        this.ctx.strokeStyle = this.color
        this.ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = this.name == name ? 'green' : this.color;
        this.ctx.textAlign = 'center';
        // this.ctx.textBaseline = 'center'
        this.ctx.fillText(this.name, this.x, this.y - this.height / 2 - 10);
    }
    newPos() {
        let moveX = true
        let moveY = true
        playerComponents.map(component => {
            if (this.touchWith(component) == 'top' && this.speedY < 0) {
                moveY = false
            }
            if (this.touchWith(component) == 'bottom' && this.speedY > 0) {
                moveY = false
            }
            if (this.touchWith(component) == 'right' && this.speedX > 0) {
                moveX = false
            }
            if (this.touchWith(component) == 'left' && this.speedX < 0) {
                moveX = false
            }
        })
        if (moveX) this.x += this.speedX;
        if (moveY) this.y += this.speedY;
        updateData('players/' + this.name, {
            x: this.x,
            y: this.y,
        })
        xDisplayer.innerText = 'x: ' + this.x
        yDisplayer.innerText = 'y: ' + this.y
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
    touchWith(otherPlayer) {
        if (this.isComponent() && otherPlayer.isComponent() && otherPlayer.name !== this.name) {
            let touch = false;
            let myleft = this.x;
            let myright = this.x + this.width;
            let mytop = this.y;
            let mybottom = this.y + this.height;
            let otherleft = otherPlayer.x;
            let otherright = otherPlayer.x + otherPlayer.width;
            let othertop = otherPlayer.y;
            let otherbottom = otherPlayer.y + otherPlayer.height;
            if ((mybottom >= othertop) &&
                (mytop <= otherbottom) &&
                (myright >= otherleft) &&
                (myleft <= otherright)) {
                touch = true;
            }
            if ((mybottom > othertop) &&
                (mytop == otherbottom + 1) &&
                (myright > otherleft) &&
                (myleft < otherright)) {
                touch = 'top';
            }
            if ((mybottom == othertop - 1) &&
                (mytop < otherbottom) &&
                (myright > otherleft) &&
                (myleft < otherright)) {
                touch = 'bottom';
            }
            if ((mybottom > othertop) &&
                (mytop < otherbottom) &&
                (myright == otherleft - 1) &&
                (myleft < otherright)) {
                touch = 'right';
            }
            if ((mybottom > othertop) &&
                (mytop < otherbottom) &&
                (myright > otherleft) &&
                (myleft == otherright + 1)) {
                touch = 'left';
            }
            return touch;
        } else return false
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
    gameArea.canvas.width = window.innerWidth
    gameArea.canvas.height = window.innerHeight
    gameArea.clear();
    playerComponent.speedX = 0;
    playerComponent.speedY = 0;
    if (keyDown('ArrowLeft')) playerComponent.moveLeft(1)
    if (keyDown('ArrowRight')) playerComponent.moveRight(1)
    if (keyDown('ArrowUp')) playerComponent.moveUp(1)
    if (keyDown('ArrowDown')) playerComponent.moveDown(1)
    drawBackground('rect', 'lightblue')
    components.map(component => {
        component.draw()
    })
    playerComponents.map(component => {
        component.draw()
    })
    playerComponent.newPos()
}

function keyDown(key) {
    if (gameArea.keys && gameArea.keys[key] && chatInput !== document.activeElement) return true
    return false
}

function chatLog(text) {
    if (text == '' || !text) return
    writeData('chat/' + chatLength, {
        text,
    })
    writeData('chat/length', chatLength + 1)
}

start()