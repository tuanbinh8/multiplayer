import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { readData, writeData, updateData, changeListener } from './database.js'

let canvas = document.getElementById('canvas')
let scene = new THREE.Scene()
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
let renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, })
let keys = []

let players, playerComponents = [], player, playerComponent
let name = localStorage.name || undefined
let chatLength
let hasStarted = false
let timer
let mouseChangeX

async function start() {
    let colorInput = document.getElementById('color')
    let chatInput = document.getElementById('chat-input')
    let chatList = document.getElementById('chat-list')
    let chatButton = document.getElementById('chat-button')
    let movingButtons = Array.from(document.querySelectorAll('#moving-buttons button'))
    let logOutButton = document.getElementById('log-out')
    let playersList = document.getElementById('players-list')

    let ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(200, 500, 300);
    scene.add(dirLight);
    scene.background = getColor('lightblue')
    camera.position.set(0, 200, 200);
    camera.lookAt(0, 100, 0);
    let planeGeometry = new THREE.PlaneGeometry(5000, 5000, 5000);
    let planeMaterial = new THREE.MeshBasicMaterial({ color: getColor('rgb(106, 193, 116)') });
    let planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    planeMesh.rotateX(- Math.PI / 2);
    scene.add(planeMesh)
    setInterval(updateGameArea)

    window.onkeydown = (event) => {
        let key = event.key
        if (!keys.includes(key))
            keys.push(key)
        if ((key == 't' || key == 'T') && chatInput.style.display == 'none') {
            event.preventDefault()
            chatInput.style.display = 'block'
            chatInput.focus()
            chatButton.innerText = 'Close'
        }
        if (key == 'Escape') {
            chatInput.style.display = 'none'
            chatInput.value = ''
            canvas.focus()
            chatButton.innerText = 'Chat'
        }
        if (key == 'Tab') {
            event.preventDefault()
            playersList.style.display = 'block'
        }
    }

    window.onkeyup = (event) => {
        let key = event.key
        keys.splice(keys.indexOf(key), 1)
        if (key == 'Tab') {
            playersList.style.display = 'none'
        }
    }

    window.onunload = () => {
        if (name) {
            updateData('players/' + name, {
                online: false,
            })
        }
    }

    window.onmousemove = (event) => {
        mouseChangeX = event.movementX
        clearTimeout(timer);
        timer = setTimeout(() => {
            mouseChangeX = 0
        });
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
            } else {
                updateData('players/' + name, {
                    online: false,
                })
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

    changeListener('players', async (data) => {
        players = data ? Object.values(data) : []
        if (!hasStarted) {
            hasStarted = true
            if (!name) {
                let password
                askName()
                localStorage.name = name
                function askName() {
                    do {
                        name = prompt('Enter your name')
                        if (name) name = name.trim()
                        if (getPlayer(name) && getPlayer(name).online) {
                            alert('Someone else is using this account')
                            name = undefined
                        }
                    } while (name == '' || !name);
                    askPassword()
                }
                function askPassword() {
                    password = null
                    if (getPlayer(name)) {
                        password = prompt('Enter your password')
                        if (password) password = password.trim()
                        if (!password) {
                            askName()
                            return
                        }
                        if (getPlayer(name).password !== password) {
                            alert('Invalid password')
                            askPassword()
                            return
                        } else {
                            updateData('players/' + name, {
                                online: true,
                            })
                        }
                    } else {
                        password = prompt('New account. Create a password')
                        if (password) password = password.trim()
                        if (password == '') {
                            askPassword()
                            return
                        }
                        if (!password) {
                            askName()
                            return
                        }
                        writeData('players/' + name, {
                            name,
                            password,
                            color: '#ff0000',
                            position: {
                                x: 0,
                                y: 0,
                                z: 0,
                            },
                            rotation: {
                                x: 0,
                                y: 0,
                                z: 0,
                            },
                            online: true,
                        })
                    }
                }
            } else {
                if (getPlayer(name)) {
                    updateData('players/' + name, {
                        online: true,
                    })
                } else {
                    localStorage.removeItem('name')
                    location.reload()
                }
            }
            let loaderContainer = document.getElementById('loader-container')
            loaderContainer.remove()
        }
        player = getPlayer(name)
        playersList.innerHTML = `<li id='players-number'>Players: ${players.length}</li>`
        players.map(player => {
            let componentList = playerComponents.filter(component => component.name == player.name)
            if (player.online) {
                let component
                if (componentList.length) {
                    component = componentList[0]
                    component.color = player.color
                    component.position = player.position
                    component.rotation = player.rotation
                } else {
                    component = new Player(player.name, player.color, 50, player.position, player.rotation)
                    component.addComponent()
                    if (player.name == name) playerComponent = component
                    playersList.innerHTML += `<li><span style='background:${component.color};'></span> ${component.name}</li>`
                }
                playersList.innerHTML += `<li><span style='background:${component.color};'></span> ${component.name}</li>`
            } else {
                if (componentList.length) {
                    scene.remove(componentList[0].cube);
                    playerComponents.splice(playerComponents.indexOf(componentList[0]), 1)
                }
            }
        })
        colorInput.value = player.color
    })

    changeListener('players/' + name + '/online', (online) => {
        if (hasStarted) {
            if (online) chatLog(name + ' joined')
            else chatLog(name + ' disconnected')
        }
    })

    if (!/Android|webOS|iPhone|iPad|Macintosh|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        let movingButtonsContainer = document.getElementById('moving-buttons')
        movingButtonsContainer.remove()
        chatButton.remove()
    }
    canvas.onclick = () => canvas.requestPointerLock()
}

class Player {
    constructor(name, color, width, position, rotation) {
        this.name = name
        this.color = color
        this.width = width
        this.position = position
        this.rotation = rotation
        this.speedX = 0
        this.speedY = 0
        this.speedZ = 0
        let geometry = new THREE.BoxGeometry(width, width, width);
        let material = new THREE.MeshLambertMaterial({ color: getColor(this.color) });
        this.cube = new THREE.Mesh(geometry, material);
        scene.add(this.cube);
    }
    update() {
        if (this.name == name) {
            this.position.x += this.speedX;
            this.position.y += this.speedY;
            this.position.z += this.speedZ;
            let positionDisplayer = document.getElementById('position-displayer')
            positionDisplayer.innerHTML = `
            <b>Position</b>
            <li>x: ${Math.round(this.position.x)}</li>
            <li>y: ${Math.round(this.position.y)}</li>
            <li>z: ${Math.round(this.position.z)}</li>
            <b>Rotation</b>
            <li>x: ${Math.round(this.rotation.x)}</li>
            <li>y: ${Math.round(this.rotation.y)}</li>
            <li>z: ${Math.round(this.rotation.z)}</li>`

            playerComponent.rotation.y -= mouseChangeX ? mouseChangeX / 100 : 0
            playerComponent.rotation.y = playerComponent.rotation.y % (2 * Math.PI)
            let radius = 200
            let angle = this.rotation.y
            camera.position.x = radius * Math.sin(angle)
            camera.position.z = radius * Math.cos(angle)

            updateData('players/' + name, {
                position: this.position,
                rotation: this.rotation,
            })
        }
        this.cube.position.set(this.position.x - player.position.x, this.position.y + this.width / 2, this.position.z - player.position.z);
        this.cube.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z)
        this.cube.material.color = getColor(this.color)
    }
    moveUp(speed) {
        this.speedZ = -speed;
    }
    moveDown(speed) {
        this.speedZ = speed;
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
            playerComponents.splice(playerComponents.indexOf(this), 1)
        }
    }
    touchWith(otherPlayer, thisPlayer = this) {
        if (otherPlayer.name !== thisPlayer.name && otherPlayer.isComponent() && (thisPlayer == this ? thisPlayer.isComponent() : true)) {
            let touch = false;
            let myleft = thisPlayer.position.x;
            let myright = thisPlayer.position.x + thisPlayer.width;
            let mytop = thisPlayer.position.y;
            let mybottom = thisPlayer.position.y + thisPlayer.height;
            let otherleft = otherPlayer.position.x;
            let otherright = otherPlayer.position.x + otherPlayer.width;
            let othertop = otherPlayer.position.y;
            let otherbottom = otherPlayer.position.y + otherPlayer.height;
            if ((mybottom >= othertop) &&
                (mytop <= otherbottom) &&
                (myright >= otherleft) &&
                (myleft <= otherright)) {
                touch = true
            }
            return touch;
        } else return false
    }
}

function updateGameArea() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight)
    playerComponent.speedX = 0;
    playerComponent.speedY = 0;
    playerComponent.speedZ = 0;
    camera.lookAt(0, 100, 0);
    if (keys.includes('ArrowLeft')) playerComponent.moveLeft(1)
    if (keys.includes('ArrowRight')) playerComponent.moveRight(1)
    if (keys.includes('ArrowUp')) playerComponent.moveUp(1)
    if (keys.includes('ArrowDown')) playerComponent.moveDown(1)
    playerComponents.map(component => component.update())
    renderer.render(scene, camera);
}

function getPlayer(name) {
    return players.filter(player => player.name == name)[0]
}

function chatLog(text) {
    if (text == '' || !text) return
    writeData('chat/' + chatLength, {
        text,
    })
    writeData('chat/length', chatLength + 1)
}

function getColor(color) {
    return new THREE.Color(color)
}

start()