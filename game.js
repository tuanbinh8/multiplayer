import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader'
import { readData, writeData, updateData, changeListener } from './database.js'

let canvas = document.getElementById('canvas')
let scene = new THREE.Scene()
scene.background = getColor('lightblue')
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000)
let cameraLookAtY = 0
let renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, })
let keys = []

let players = [], playerComponents = [], player, playerComponent
let name = localStorage.name || undefined

let authForm = document.getElementById('auth')
let colorInput = document.getElementById('color')
if (!name) {
    let nameInput = authForm.name
    let passLabel = document.getElementById('pass-label')
    let passInput = authForm.pass
    let button = authForm.button
    nameInput.oninput = async () => {
        button.style.display = nameInput.value.length && passInput.value.length ? 'block' : 'none'
        if (await readData('players/' + nameInput.value)) {
            passLabel.innerHTML = 'Password:'
            button.innerHTML = 'Log in'
        } else {
            passLabel.innerHTML = '(New account) Password:'
            button.innerHTML = 'Sign up'
        }
    }
    passInput.oninput = async () => {
        button.style.display = nameInput.value.length && passInput.value.length ? 'block' : 'none'
        if (await readData('players/' + nameInput.value)) {
            passLabel.innerHTML = 'Password:'
            button.innerHTML = 'Log in'
        } else {
            passLabel.innerHTML = '(New account) Password:'
            button.innerHTML = 'Sign up'
        }
    }
    button.onclick = async (event) => {
        event.preventDefault()
        let name = nameInput.value
        let password = passInput.value
        if (await readData('players/' + name)) {
            writeData('players/' + name + '/online', true)
        } else {
            writeData('players/' + name, {
                name,
                password,
                color: '#ff0000',
                position: {
                    x: 0,
                    y: 0,
                    z: 500,
                },
                rotation: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                online: true,
            })
        }
        localStorage.name = name
        location.reload()
    }
} else {
    (async function () {
        authForm.remove()
        let authContainer = document.getElementById('auth-container')
        authContainer.remove()
        let player = await readData('players/' + name)
        if (player) {
            updateData('players/' + name, {
                online: true,
            })
            start()
            colorInput.value = player.color
        } else {
            localStorage.removeItem('name')
            location.reload()
        }
    })()
}

async function start() {
    let loaderContainer = document.getElementById('loader-container')
    loaderContainer.remove()

    let ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(200, 500, 300);
    scene.add(dirLight);

    let grass = new THREE.TextureLoader().load("https://upload.wikimedia.org/wikipedia/commons/4/4c/Grass_Texture.png")
    grass.anisotropy = 200
    grass.repeat.set(100, 100)
    grass.wrapT = THREE.RepeatWrapping
    grass.wrapS = THREE.RepeatWrapping
    let planeGeometry = new THREE.PlaneGeometry(10000, 10000, 10000);
    let planeMaterial = new THREE.MeshLambertMaterial({ map: grass });
    let planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    planeMesh.rotateX(- Math.PI / 2);
    scene.add(planeMesh)

    let loader = new GLTFLoader();
    loader.load(
        'image/model.glb',
        (gltf) => {
            const root = gltf.scene;
            root.position.set(0, 50, 0)
            root.scale.set(100, 100, 100)
            scene.add(root);
        }
    );

    let pauseContainer = document.getElementById('pause-container')
    pauseContainer.style.display = 'flex'
    let playersList = document.getElementById('players-list')
    window.onkeydown = (event) => {
        let key = event.key
        if (!keys.includes(key))
            keys.push(key)
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

    window.onwheel = (event) => { }

    canvas.onmousemove = (event) => {
        if (!playerComponent) return
        playerComponent.rotation.y -= event.movementX / 100
        playerComponent.rotation.y %= 2 * Math.PI
        let angle = playerComponent.rotation.y
        camera.position.x = playerComponent.position.x + 200 * Math.sin(angle)
        camera.position.y = playerComponent.position.y + 200
        camera.position.z = playerComponent.position.z + 200 * Math.cos(angle)
        cameraLookAtY -= event.movementY
    }

    document.addEventListener("pointerlockchange", () => {
        if (document.pointerLockElement === canvas) {
            pauseContainer.style.display = 'none'
        } else {
            pauseContainer.style.display = 'flex'
        }
    });

    let playButton = document.getElementById('play')
    playButton.onclick = () => canvas.requestPointerLock()

    colorInput.onchange = () => writeData('players/' + name + '/color', colorInput.value)

    let logOutButton = document.getElementById('log-out')
    logOutButton.onclick = () => {
        localStorage.removeItem('name')
        location.reload()
    }

    changeListener('players', async (data) => {
        players = data ? Object.values(data) : []
        player = getPlayer(name)
        playersList.innerHTML = `<li id='players-number'>Players: ${players.filter(player => player.online).length}</li>`
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
                }
                playersList.innerHTML += `<li><span style='background:${component.color};'></span> ${component.name}</li>`
            } else {
                if (componentList.length) {
                    scene.remove(componentList[0].cube);
                    playerComponents.splice(playerComponents.indexOf(componentList[0]), 1)
                }
            }
        })
    })

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

    requestAnimationFrame(updateGameArea)
}

class Player {
    constructor(name, color, width, position, rotation) {
        this.name = name
        this.color = color
        this.width = width
        this.position = position
        this.rotation = rotation
        this.speed = {
            x: 0,
            y: 0,
            z: 0,
        }
        this.isJumping = false
        let geometry = new THREE.BoxGeometry(width, width, width);
        let textureLoader = new THREE.TextureLoader();
        let face = textureLoader.load('image/face.png');
        let material = [
            new THREE.MeshLambertMaterial({ color: getColor(this.color) }),
            new THREE.MeshLambertMaterial({ color: getColor(this.color) }),
            new THREE.MeshLambertMaterial({ color: getColor(this.color) }),
            new THREE.MeshLambertMaterial({ color: getColor(this.color) }),
            new THREE.MeshLambertMaterial({ color: getColor(this.color) }),
            new THREE.MeshLambertMaterial({ map: face }),
        ];
        this.cube = new THREE.Mesh(geometry, material);
        scene.add(this.cube);
    }
    update() {
        if (this.name == name) {
            this.position.x += this.speed.x
            this.position.y += this.speed.y
            this.position.z += this.speed.z

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

            updateData('players/' + name, {
                position: this.position,
                rotation: this.rotation,
            })
        }
        this.cube.position.set(this.position.x, this.position.y + this.width / 2, this.position.z);
        this.cube.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z)
        this.cube.material.color = getColor(this.color)
    }
    moveUp(speed) {
        let angle = this.rotation.y
        this.speed.x = -speed * Math.sin(angle);
        this.speed.z = -speed * Math.cos(angle);
    }
    moveDown(speed) {
        let angle = this.rotation.y + Math.PI
        this.speed.x = -speed * Math.sin(angle);
        this.speed.z = -speed * Math.cos(angle);
    }
    moveLeft(speed) {
        let angle = this.rotation.y + Math.PI / 2
        this.speed.x = -speed * Math.sin(angle);
        this.speed.z = -speed * Math.cos(angle);
    }
    moveRight(speed) {
        let angle = this.rotation.y - Math.PI / 2
        this.position.x -= speed * Math.sin(angle);
        this.speed.z = -speed * Math.cos(angle);
    }
    jump(speed) {
        if (!this.isJumping) {
            this.isJumping = true
            playerComponent.speed.y = speed
        }
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
    try {
        let windowSize = 1
        camera.aspect = (window.innerWidth * windowSize) / (window.innerHeight * windowSize);
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth * windowSize, window.innerHeight * windowSize)
        playerComponent.speed.x = 0
        playerComponent.speed.z = 0
        if (playerComponent.position.y > 0) playerComponent.speed.y -= 1
        else {
            playerComponent.speed.y = 0
            playerComponent.position.y = 0
            playerComponent.isJumping = false
        }
        if (keys.includes('w') || keys.includes('W')) playerComponent.moveUp(10)
        if (keys.includes('a') || keys.includes('A')) playerComponent.moveLeft(10)
        if (keys.includes('d') || keys.includes('D')) playerComponent.moveRight(10)
        if (keys.includes('s') || keys.includes('S')) playerComponent.moveDown(10)
        if (keys.includes(' ')) playerComponent.jump(20)
        playerComponents.map(component => component.update())
        let angle = player.rotation.y
        camera.position.x = player.position.x + 200 * Math.sin(angle)
        camera.position.y = player.position.y + 200
        camera.position.z = player.position.z + 200 * Math.cos(angle)
        if (cameraLookAtY > 500) cameraLookAtY = 500
        if (cameraLookAtY < -500) cameraLookAtY = -500
        camera.lookAt(player.position.x, player.position.y + 100 + cameraLookAtY, player.position.z);
        renderer.render(scene, camera);
    } catch (error) {
        console.log(error);
    }
    requestAnimationFrame(updateGameArea)
}

function getPlayer(name) {
    return name ? players.filter(player => player.name == name)[0] : null
}

function getColor(color) {
    return new THREE.Color(color)
}