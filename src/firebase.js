import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyCLLcNqzE2KyePi0ssr2-OxAiYyHjoP9-g",
  authDomain: "id-share-room.firebaseapp.com",
  databaseURL: "https://id-share-room-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "id-share-room",
  storageBucket: "id-share-room.firebasestorage.app",
  messagingSenderId: "810738184730",
  appId: "1:810738184730:web:6a263b4730e0a53bf9d7a3"
}

const app = initializeApp(firebaseConfig)

export const database = getDatabase(app)