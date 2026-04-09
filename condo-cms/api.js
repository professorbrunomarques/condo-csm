/**
 * api.js (CLOUD NATIVE - FIREBASE EDITION)
 */
console.log("🔥 api.js carregando...");

const firebaseConfig = {
    apiKey: "AIzaSyB9IXCCd_TuznYiEsDnXu2hiKmM48bzRKI",
    authDomain: "condomanager-844b3.firebaseapp.com",
    projectId: "condomanager-844b3",
    storageBucket: "condomanager-844b3.firebasestorage.app",
    messagingSenderId: "198486523552",
    appId: "1:198486523552:web:605686e035102a442593c5"
  };

  // Inicializa a Nuvem apenas uma vez
  if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.firestore();

  // --- Caching para economizar Leituras no Firebase (Free Tier) ---
  let unitsCache = null;
  let blocksCache = null;
  let cacheExpiry = 10000; // 10 segundos
  let lastUnitsFetch = 0;
  let lastBlocksFetch = 0;
  
  window.BackendAPI = {
      
      // --- BLOCOS ---
      getBlocks: async () => {
          if (blocksCache && (Date.now() - lastBlocksFetch < cacheExpiry)) return blocksCache;
          const snapshot = await db.collection("blocks").orderBy("name").get();
          const blocks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          blocksCache = blocks;
          lastBlocksFetch = Date.now();
          return blocks;
      },
  
      addBlock: async (name) => {
          const docRef = await db.collection("blocks").add({ name });
          blocksCache = null; // invalida
          
          // Magia: Gerar 96 unidades inteiras no Firebase automaticamente via Batch!
          const batch = db.batch();
          const floors = 8;
          const unitsPerFloor = 12;
          
          for(let f=1; f<=floors; f++) {
              for(let u=1; u<=unitsPerFloor; u++) {
                  const numStr = u < 10 ? `0${u}` : `${u}`;
                  const number = parseInt(`${f}${numStr}`); // 101, 812
                  const newUnitRef = db.collection("units").doc();
                  batch.set(newUnitRef, {
                      blockId: docRef.id,
                      number: number,
                      status: "Vazia",
                      createdAt: new Date().getTime()
                  });
              }
          }
          await batch.commit();
          unitsCache = null;
          return { id: docRef.id, name };
      },
  
      deleteBlock: async (id) => {
          await db.collection("blocks").doc(id).delete();
          blocksCache = null;
      },
  
      // --- UNIDADES ---
      getUnits: async () => {
          if (unitsCache && (Date.now() - lastUnitsFetch < cacheExpiry)) return unitsCache;
          const blocks = await window.BackendAPI.getBlocks();
          const snapshot = await db.collection("units").orderBy("number").get();
          const units = snapshot.docs.map(doc => {
              const data = doc.data();
              const block = blocks.find(b => b.id === data.blockId);
              return { 
                  id: doc.id, 
                  ...data,
                  blockName: block ? block.name : "Desconhecido"
              };
          });
          unitsCache = units;
          lastUnitsFetch = Date.now();
          return units;
      },
  
      updateUnit: async (id, data) => {
          await db.collection("units").doc(id).update(data);
          unitsCache = null; // força limpeza do cache
      },
  
      getUnitById: async (id) => {
          const doc = await db.collection("units").doc(id).get();
          return doc.exists ? { id: doc.id, ...doc.data() } : null;
      },
  
      // --- MORADORES ---
      getResidents: async () => {
          const snapshot = await db.collection("residents").get();
          const units = await window.BackendAPI.getUnits();
          return snapshot.docs.map(doc => {
              const data = doc.data();
              const unit = units.find(u => u.id === data.unitId);
              return {
                  id: doc.id,
                  ...data,
                  unitDisplay: unit ? `${unit.blockName} - ${unit.number}` : "S/ Unidade"
              };
          });
      },
  
      addResident: async (residentData) => {
          const docRef = await db.collection("residents").add({
              ...residentData,
              joinedIn: new Date().toISOString()
          });
          // Status da Unidade para Ocupado
          if(residentData.unitId) {
              await window.BackendAPI.updateUnit(residentData.unitId, { status: "Ocupada" });
          }
          return { id: docRef.id, ...residentData };
      },
  
      deleteResident: async (id) => {
          const res = await db.collection("residents").doc(id).get();
          if(res.exists) {
              const data = res.data();
              if(data.unitId) {
                  // Desocupa a unidade
                  await window.BackendAPI.updateUnit(data.unitId, { status: "Vazia" });
              }
              await db.collection("residents").doc(id).delete();
          }
      },
      
      getResidentById: async (id) => {
          const doc = await db.collection("residents").doc(id).get();
          return doc.exists ? { id: doc.id, ...doc.data() } : null;
      },
  
      // --- MANUTENÇÕES (CHAMADOS) ---
      getMaintenance: async () => {
          const snapshot = await db.collection("maintenance").orderBy("date", "desc").get();
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },
  
      addMaintenance: async (title, urgency, desc, location) => {
          const msDate = new Date();
          const dateStr = msDate.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
          const docRef = await db.collection("maintenance").add({
              date: msDate.toISOString(),
              displayDate: dateStr,
              title,
              urgency,
              desc,
              location,
              status: "open"
          });
          return { id: docRef.id };
      },
  
      updateMaintenanceStatus: async (id, status) => {
          await db.collection("maintenance").doc(id).update({ status });
      },
      
      // --- AVISOS (MURALS) ---
      getNotices: async () => {
          const snapshot = await db.collection("notices").orderBy("timestamp", "desc").get();
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },
      
      addNotice: async (title, content, type) => { // Alterado 'desc' para 'content' para bater com o app.js
          const dt = new Date();
          const dateStr = dt.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
          const docRef = await db.collection("notices").add({
              date: dateStr,
              timestamp: dt.getTime(),
              title,
              content,
              type
          });
          return { id: docRef.id };
      },

      deleteNotice: async (id) => {
          await db.collection("notices").doc(id).delete();
      },

      // --- STATS / DASHBOARD ---
      getStats: async () => {
          const units = await window.BackendAPI.getUnits();
          const residents = await window.BackendAPI.getResidents();
          const maintenance = await window.BackendAPI.getMaintenance();
          
          const occupied = units.filter(u => u.status === 'Ocupada').length;
          const openCalls = maintenance.filter(m => m.status === 'open').length;

          return {
              totalUnits: units.length,
              activeResidents: residents.length,
              occupancy: `${occupied} Unidades`,
              openCalls: openCalls,
              noticesCount: residents.length > 0 ? 12 : 0 // Exemplo de contagem
          };
      },

      // --- COMPATIBILIDADE EXTRA ---
      updateBlock: async (id, name) => {
          await db.collection("blocks").doc(id).update({ name });
          blocksCache = null;
      },

      addUnit: async (blockId, number) => {
          await db.collection("units").add({
              blockId,
              number: parseInt(number),
              status: "Vazia",
              createdAt: new Date().getTime()
          });
          unitsCache = null;
      },

      deleteUnit: async (id) => {
          await db.collection("units").doc(id).delete();
          unitsCache = null;
      },

      generateUnitsForBlock: async (blockId) => {
          const batch = db.batch();
          const floors = 8;
          const unitsPerFloor = 12;
          let count = 0;
          
          for(let f=1; f<=floors; f++) {
              for(let u=1; u<=unitsPerFloor; u++) {
                  const numStr = u < 10 ? `0${u}` : `${u}`;
                  const number = parseInt(`${f}${numStr}`);
                  const newUnitRef = db.collection("units").doc();
                  batch.set(newUnitRef, {
                      blockId: blockId,
                      number: number,
                      status: "Vazia",
                      createdAt: new Date().getTime()
                  });
                  count++;
              }
          }
          await batch.commit();
          unitsCache = null;
          return { success: true, count };
      },

      getResidentData: async (id) => { // De-alias para o app.js
          const res = await window.BackendAPI.getResidentById(id);
          if(!res) return null;

          // Hydrate unit display
          const units = await window.BackendAPI.getUnits();
          const blocks = await window.BackendAPI.getBlocks();
          const unit = units.find(u => u.id === res.unitId);
          const block = unit ? blocks.find(b => b.id === unit.blockId) : null;
          
          return {
              ...res,
              unitDisplay: unit ? `${block ? block.name : '?' } - ${unit.number}` : 'N/A'
          };
      },

      // --- USUÁRIOS DO SISTEMA (AUTH) ---
      getUsers: async () => {
          const snapshot = await db.collection("users").orderBy("name").get();
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      },

      addUser: async (userData) => {
          const docRef = await db.collection("users").add({
              ...userData,
              createdAt: new Date().toISOString()
          });
          return { id: docRef.id };
      },

      deleteUser: async (id) => {
          // Impedir deleção se for o último admin? (Melhor tratar no frontend)
          await db.collection("users").doc(id).delete();
      },

        login: async (username, password) => {
            console.log("Tentativa de login para:", username);
            try {
                const snapshot = await db.collection("users")
                    .where("username", "==", username.toLowerCase())
                    .get();
                
                if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data();
                    if (userData.password === password) {
                        const user = { id: snapshot.docs[0].id, ...userData };
                        delete user.password; 
                        localStorage.setItem("condo_admin_user", JSON.stringify(user));
                        console.log("Login validado com sucesso.");
                        return user;
                    } else {
                        console.warn("Senha incorreta.");
                    }
                } else {
                    console.warn("Usuário não encontrado no Firestore.");
                }
            } catch (err) {
                console.error("Erro ao consultar Firestore no Login:", err);
                throw err;
            }
            return null;
        },

      logout: () => {
          localStorage.removeItem("condo_admin_user");
          window.location.reload();
      },

      checkSession: () => {
          const user = localStorage.getItem("condo_admin_user");
          return user ? JSON.parse(user) : null;
      },

      // --- CONFIGURAÇÕES GLOBAIS ---
      getSettings: async () => {
          const doc = await db.collection("settings").doc("condo").get();
          if (doc.exists) return doc.data();
          // Fallback padrão se não houver dados no banco
          return {
              name: "Residencial Torre Central",
              cnpj: "12.345.678/0001-99",
              city: "São Paulo / SP"
          };
      },

      saveSettings: async (data) => {
          await db.collection("settings").doc("condo").set(data, { merge: true });
          return { success: true };
      }
  };
  
    // Script rápido para gerar blocos e admin de demonstração caso o BD esteja zerado.
    setTimeout(async () => {
        const bSnapshot = await db.collection("blocks").limit(1).get();
        if(bSnapshot.empty) {
            console.log("Banco Firestore Vazio: Auto-Populando Torre Central...");
            await window.BackendAPI.addBlock("Torre Central");
        }

        const uSnapshot = await db.collection("users").limit(1).get();
        if(uSnapshot.empty) {
            console.log("Criando usuário administrador padrão (admin/admin123)...");
            await window.BackendAPI.addUser({
                name: "Administrador Master",
                username: "admin",
                password: "admin123",
                role: "Administrador"
            });
        }
    }, 500);

console.log("✅ api.js carregado com BackendAPI disponível.");
