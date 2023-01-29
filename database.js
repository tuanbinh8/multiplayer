import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDMVQDpqQL1czpacdc4SPQKGHVFreDiJkg",
    authDomain: "multiplayer-f4ce8.firebaseapp.com",
    projectId: "multiplayer-f4ce8",
    storageBucket: "multiplayer-f4ce8.appspot.com",
    messagingSenderId: "165035571991",
    appId: "1:165035571991:web:71f3dd74ba6a950e23d552",
    measurementId: "G-84S5HWSEGH",
    databaseURL: "https://multiplayer-f4ce8-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);
let db = getDatabase()

function readData(path) {
    const _ref = ref(db, path);
    return new Promise((resolve, reject) => {
        ;
        onValue(_ref, (snapshot) => {
            resolve(snapshot.val())
        });
    })
}

async function readDataWhere(path, property, value) {
    let allData = await readData(path)
    let result
    for (let data in allData) {
        if (allData[data][property] == value) {
            result = allData[data]
            break
        }
    }
    return result
}

function writeData(path, data) {
    set(ref(db, path), data);
}

async function updateData(path, data) {
    await update(ref(db, path), data);
}

function changeListener(path, cb) {
    const _ref = ref(db, path);
    onValue(_ref, (snapshot) => {
        cb(snapshot.val())
    });
}

export { readData, readDataWhere, writeData, updateData, changeListener, serverTimestamp }