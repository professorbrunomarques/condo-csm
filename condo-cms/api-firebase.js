/**
 * api-firebase.js (TEMPLATE)
 * Substituirá o 'api.js' assim que as credenciais reais forem inseridas.
 */

// 1. O SDK do Firebase será importado no HTML via CDN (firebase-app-compat e firebase-firestore-compat)

const firebaseConfig = {
    apiKey: "COLE_SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

// Inicializa a Nuvem
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// API Compatível com nossa arquitetura SPA atual:
window.BackendAPI = {
    // --- ORGANIZATIONAL ENDPOINTS (BLOCKS) ---
    getBlocks: async () => {
        const snapshot = await db.collection("blocks").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    
    addBlock: async (name) => {
        // ... Lógica para adicionar e gerar 96 docs de unidades no firebase ...
        // Será codificada assim que integrarmos!
    },

    // A SER PREENCHIDO COM O CÓDIGO FINAL ASSIM QUE RECEBER AS CHAVES.
};
