// Initialize Lucide Icons with safety check
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
} else {
    console.error("Lucide icons library not loaded!");
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Aplicativo iniciando...");
    
    // --- AUTH GUARD ---
    const API = window.BackendAPI;
    if (!API) {
        console.error("❌ Erro Crítico: API de Backend (BackendAPI) não encontrada no window!");
        return;
    }

    let user = null;
    try {
        user = await API.checkSession();
    } catch (e) {
        console.error("Erro ao verificar sessão:", e);
    }
    const loginOverlay = document.getElementById('login-overlay');

    if (!user) {
        document.body.classList.add('auth-locked');
    } else {
        document.body.classList.remove('auth-locked');
        document.getElementById('login-overlay').style.display = 'none';
        
        // Preencher nome no header
        const adminNameEl = document.querySelector('.admin-name');
        if (adminNameEl) adminNameEl.textContent = user.name;

        // Preencher campos da página de Perfil com dados reais da sessão
        const profileName = document.getElementById('profile-name');
        const profileUsername = document.getElementById('profile-username');
        const profileRole = document.getElementById('profile-role');
        if (profileName) profileName.value = user.name || '';
        if (profileUsername) profileUsername.value = user.username || '';
        if (profileRole) profileRole.textContent = user.role || 'Operador';
    }

    // --- PROFILE PHOTO LOGIC (Priority Attachment) ---
    const savedPhoto = localStorage.getItem('condo_user_photo');
    const updateAvatars = (url) => {
        document.querySelectorAll('.user-avatar-img').forEach(img => {
            img.src = url;
            console.log("Avatar atualizado:", url);
        });
    };
    if (savedPhoto) updateAvatars(savedPhoto);

    console.log("Vinculando listener de Alterar Foto...");
    const btnChangePhoto = document.getElementById('btn-change-photo');
    if (btnChangePhoto) {
        btnChangePhoto.onclick = () => {
            console.log("Evento onclick disparado em Alterar Foto");
            const newUrl = prompt("Insira a URL da imagem (JPG/PNG):", savedPhoto || "https://i.pravatar.cc/150?u=admin");
            if (newUrl && newUrl.trim() !== '') {
                localStorage.setItem('condo_user_photo', newUrl.trim());
                updateAvatars(newUrl.trim());
            }
        };
    } else {
        console.warn("Aviso: Botão #btn-change-photo não encontrado no DOM inicial.");
    }

    // Login logic
    document.getElementById('btn-login-submit')?.addEventListener('click', async () => {
        const uField = document.getElementById('login-user');
        const pField = document.getElementById('login-pass');
        const btn = document.getElementById('btn-login-submit');
        const error = document.getElementById('login-error');
        
        const u = uField.value.trim();
        const p = pField.value.trim();

        if (!u || !p) return;

        console.log("Processando login...");
        btn.textContent = "Verificando...";
        btn.disabled = true;
        
        try {
            const authenticated = await API.login(u, p);
            if (authenticated) {
                console.log("Login bem-sucedido!");
                window.location.reload();
            } else {
                console.warn("Falha na autenticação: Credenciais incorretas.");
                error.style.display = 'block';
                btn.textContent = "Entrar no Sistema";
                btn.disabled = false;
            }
        } catch (err) {
            console.error("Erro crítico no login:", err);
            btn.textContent = "Erro no Servidor";
            btn.disabled = false;
        }
    });

    const navItems = document.querySelectorAll('.nav-item, .profile-link');
    const pageViews = document.querySelectorAll('.page-view');

    // --- NAVIGATION LOGIC ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // If it's a profile link, close any open dropdown
            if (item.classList.contains('profile-link')) {
                document.querySelectorAll('.dropdown-menu').forEach(dm => dm.classList.remove('active'));
            }

            // Sync active state for sidebar menu
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            if (item.classList.contains('nav-item')) {
                item.classList.add('active');
            } else {
                // If clicked from dropdown, find and highlight the sidebar match
                const targetRef = item.getAttribute('data-target');
                document.querySelector(`.nav-item[data-target="${targetRef}"]`)?.classList.add('active');
            }

            const targetId = item.getAttribute('data-target');
            if (targetId === 'settings') loadSettings();
            // Profile page: re-populate from session in case it was cleared
            if (targetId === 'profile') {
                const sessionUser = API.checkSession();
                if (sessionUser) {
                    const pName = document.getElementById('profile-name');
                    const pUser = document.getElementById('profile-username');
                    const pRole = document.getElementById('profile-role');
                    if (pName) pName.value = sessionUser.name || '';
                    if (pUser) pUser.value = sessionUser.username || '';
                    if (pRole) pRole.textContent = sessionUser.role || 'Operador';
                }
            }

            pageViews.forEach(view => {
                view.classList.remove('active');
                if (view.id === targetId) {
                    view.classList.add('active');
                    if(targetId === 'residents') loadResidents();
                    if(targetId === 'dashboard') loadDashboardStats();
                    if(targetId === 'maintenance') loadMaintenance();
                    if(targetId === 'org') loadOrg();
                    if(targetId === 'portal') loadPortalSim();
                    if(targetId === 'users') loadUsers();
                }
            });

            // Close mobile sidebar after navigation
            document.querySelector('.sidebar').classList.remove('mobile-active');
        });
    });

    // Mobile Menu Toggle
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('mobile-active');
    });

    // --- API INTEGRATION LOGIC ---
    let currentResidents = []; // Cache for filtering & exporting
    let currentUnits = []; // Cache for unit filtering

    // Load Dashboard Stats & Notices
    async function loadDashboardStats() {
        try {
            const stats = await API.getStats();
            document.getElementById('stat-units').textContent = stats.totalUnits;
            document.getElementById('stat-occupancy').textContent = stats.occupancy;
            document.getElementById('stat-residents').textContent = stats.activeResidents;
            document.getElementById('stat-opencalls').textContent = stats.openCalls;
            document.getElementById('stat-notices-count').textContent = stats.noticesCount;

            // Load Admin Notices
            const notices = await API.getNotices();
            const noticesList = document.getElementById('admin-notices-list');
            if(noticesList) {
                noticesList.innerHTML = notices.map(n => `
                    <div class="notice-item" style="display:flex; justify-content:space-between; align-items:center; border-left-color: var(--${n.type === 'warning' ? 'warning' : 'info'});">
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${n.date}</span>
                            <div class="notice-title" style="margin-top:4px; font-weight:bold;">${n.title}</div>
                            <div style="font-size:0.85rem; color: #ccc; margin-top:5px;">${n.content}</div>
                        </div>
                        <button class="btn btn-outline btn-del-notice" data-id="${n.id}" style="padding:4px 8px; color:var(--danger); border-color: rgba(239,68,68,0.3);"><i data-lucide="trash-2" style="width:14px;"></i></button>
                    </div>
                `).join('') || `<p style="color:var(--text-muted)">Nenhum aviso publicado.</p>`;

                lucide.createIcons();
                document.querySelectorAll('.btn-del-notice').forEach(btn => btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if(confirm("Excluir este aviso? Ele sumirá dos portais de todos os moradores.")) {
                        await API.deleteNotice(id);
                        loadDashboardStats();
                    }
                }));
            }

            // Popular Mural de Avisos (card lateral do dashboard)
            const muralList = document.getElementById('dashboard-mural-notices');
            if (muralList) {
                muralList.innerHTML = notices.map(n => `
                    <div class="notice-item" style="border-left-color: var(--${n.type === 'warning' ? 'warning' : 'info'});">
                        <div class="notice-date">${n.date}</div>
                        <div class="notice-title">${n.title}</div>
                        <div class="notice-desc">${n.content}</div>
                    </div>
                `).join('') || `<p style="color:var(--text-muted); font-size:0.85rem;">Nenhum aviso publicado ainda.</p>`;
            }
        } catch (error) {
            console.error("Erro ao carregar estatísticas:", error);
        }
        refreshNotifications();
    }

    // --- NOTICE MODAL LOGIC ---
    const noticeModal = document.getElementById('add-notice-modal');

    function openNoticeModal() {
        console.log("🔔 Abrindo modal de novo aviso...");
        // Limpar campos
        document.getElementById('notice-title').value = '';
        document.getElementById('notice-content').value = '';
        document.querySelector('input[name="notice-type"][value="info"]').checked = true;
        noticeModal.style.display = 'flex';
        // Renderizar ícones do modal
        lucide.createIcons();
        // Focar no título
        setTimeout(() => document.getElementById('notice-title').focus(), 100);
    }

    function closeNoticeModal() {
        noticeModal.style.display = 'none';
    }

    // Cancelar
    document.getElementById('cancel-notice')?.addEventListener('click', closeNoticeModal);

    // Fechar clicando fora do modal
    noticeModal?.addEventListener('click', (e) => {
        if (e.target === noticeModal) closeNoticeModal();
    });

    // Salvar aviso
    document.getElementById('save-notice')?.addEventListener('click', async () => {
        const title = document.getElementById('notice-title').value.trim();
        const content = document.getElementById('notice-content').value.trim();
        const type = document.querySelector('input[name="notice-type"]:checked')?.value || 'info';

        if (!title) return alert("Digite o título do aviso.");
        if (!content) return alert("Digite a mensagem do aviso.");

        const btn = document.getElementById('save-notice');
        btn.textContent = "Publicando...";
        btn.disabled = true;

        try {
            await API.addNotice(title, content, type);
            console.log("✅ Aviso criado com sucesso.");
            closeNoticeModal();
            loadDashboardStats();
        } catch (err) {
            console.error("Erro ao criar aviso:", err);
            alert("Erro ao salvar o aviso no banco de dados.");
        }

        btn.textContent = "Publicar Aviso";
        btn.disabled = false;
    });

    console.log("Vinculando botões de aviso...");
    const btnNotice1 = document.getElementById('btn-add-notice');
    const btnNotice2 = document.getElementById('btn-add-notice-top');

    if (btnNotice1) btnNotice1.addEventListener('click', openNoticeModal);
    if (btnNotice2) btnNotice2.addEventListener('click', openNoticeModal);

    if (!btnNotice1 && !btnNotice2) {
        console.warn("⚠️ Aviso: Nenhum botão de aviso encontrado no DOM atual.");
    }

    document.querySelectorAll('.btn-mock').forEach(btn => btn.addEventListener('click', () => {
        alert("Este módulo será ativado futuramente quando integrarmos o PIX e APIs Bancárias, por ora é apenas um mock visual.");
    }));

    // Load Organizational Data (Blocks and Units)
    async function loadOrg() {
        const blocksBody = document.getElementById('blocks-tbody');
        const unitsBody = document.getElementById('units-tbody');
        
        blocksBody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
        unitsBody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>';
        
        try {
            const blocks = await API.getBlocks();
            currentUnits = await API.getUnits();
            
            blocksBody.innerHTML = blocks.map(b => `
                <tr>
                    <td>${b.id}</td>
                    <td>${b.name}</td>
                    <td>
                        <button class="btn btn-outline btn-gen-unit" data-id="${b.id}" style="padding: 4px 8px; color: var(--warning); border-color: rgba(245, 158, 11, 0.3);" title="Gerar 96 Unidades"><i data-lucide="wand" style="width: 14px;"></i></button>
                        <button class="btn btn-outline btn-edit-block" data-id="${b.id}" data-name="${b.name}" style="padding: 4px 8px;"><i data-lucide="edit" style="width: 14px;"></i></button>
                        <button class="btn btn-outline btn-del-block" data-id="${b.id}" style="padding: 4px 8px; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);"><i data-lucide="trash-2" style="width: 14px;"></i></button>
                    </td>
                </tr>
            `).join('') || `<tr><td colspan="3">Sem blocos</td></tr>`;
            
            renderUnits(currentUnits);
            lucide.createIcons();

            // Block Handlers
            document.querySelectorAll('.btn-edit-block').forEach(btn => btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const oldName = e.currentTarget.getAttribute('data-name');
                const newName = prompt("Editar nome do bloco:", oldName);
                if (newName && newName !== oldName) {
                    await API.updateBlock(id, newName);
                    loadOrg(); loadDashboardStats();
                }
            }));
            document.querySelectorAll('.btn-del-block').forEach(btn => btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Atenção: Apagar o bloco apagará todas as unidades dele, e desvinculará todos os moradores relacionados. Deseja continuar?')) {
                    await API.deleteBlock(id);
                    loadOrg(); loadDashboardStats();
                }
            }));
            document.querySelectorAll('.btn-gen-unit').forEach(btn => btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                btn.innerHTML = `<span style="font-size:10px;">...</span>`;
                const result = await API.generateUnitsForBlock(id);
                if(!result.success) {
                    alert(result.message);
                } else {
                    alert(`Sucesso! ${result.count} novas unidades foram erguidas no servidor para este bloco.`);
                }
                loadOrg(); loadDashboardStats();
            }));

        } catch(e) {
            console.error(e);
        }
    }

    let selectedUnitIds = new Set();

    function updateBulkDeleteButton() {
        const btn = document.getElementById('btn-delete-selected-units');
        const count = document.getElementById('selected-units-count');
        if (btn && count) {
            count.textContent = selectedUnitIds.size;
            btn.style.display = selectedUnitIds.size > 0 ? 'flex' : 'none';
        }
    }

    function renderUnits(unitsArray) {
        const unitsBody = document.getElementById('units-tbody');
        selectedUnitIds.clear();
        updateBulkDeleteButton();

        // Reset select-all checkbox
        const selectAll = document.getElementById('select-all-units');
        if (selectAll) selectAll.checked = false;

        unitsBody.innerHTML = unitsArray.map(u => `
            <tr>
                <td><input type="checkbox" class="unit-checkbox" data-id="${u.id}" style="width:auto; cursor:pointer;"></td>
                <td>${u.blockName}</td>
                <td>${u.number}</td>
                <td>
                    <button class="btn btn-outline btn-edit-unit" data-id="${u.id}" data-block="${u.blockId}" data-num="${u.number}" style="padding: 4px 8px;"><i data-lucide="edit" style="width: 14px;"></i></button>
                    <button class="btn btn-outline btn-del-unit" data-id="${u.id}" style="padding: 4px 8px; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);"><i data-lucide="trash-2" style="width: 14px;"></i></button>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="4">Nenhuma unidade compatível</td></tr>`;
        
        lucide.createIcons();

        // Checkbox selection handlers
        document.querySelectorAll('.unit-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                if (e.target.checked) {
                    selectedUnitIds.add(id);
                } else {
                    selectedUnitIds.delete(id);
                }
                updateBulkDeleteButton();

                // Sync select-all state
                const allBoxes = document.querySelectorAll('.unit-checkbox');
                const allChecked = [...allBoxes].every(c => c.checked);
                if (selectAll) selectAll.checked = allBoxes.length > 0 && allChecked;
            });
        });

        // Unit Handlers
        document.querySelectorAll('.btn-edit-unit').forEach(btn => btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const blocks = await API.getBlocks();
            let blockStr = blocks.map(b => `${b.id} - ${b.name}`).join("\\n");
            
            const newBlock = prompt(`Novo ID do Bloco:\\n${blockStr}`, e.currentTarget.getAttribute('data-block'));
            if (newBlock) {
                const newNum = prompt("Novo número da unidade:", e.currentTarget.getAttribute('data-num'));
                if (newNum) {
                    await API.updateUnit(id, newBlock, newNum);
                    loadOrg(); loadDashboardStats();
                }
            }
        }));
        document.querySelectorAll('.btn-del-unit').forEach(btn => btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm('Apagar esta unidade deixará seus moradores órfãos (Sem unidade). Continuar?')) {
                await API.deleteUnit(id);
                loadOrg(); loadDashboardStats();
            }
        }));
    }

    // Select All / Deselect All
    document.getElementById('select-all-units')?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.unit-checkbox').forEach(cb => {
            cb.checked = checked;
            const id = cb.getAttribute('data-id');
            if (checked) {
                selectedUnitIds.add(id);
            } else {
                selectedUnitIds.delete(id);
            }
        });
        updateBulkDeleteButton();
    });

    // Bulk Delete
    document.getElementById('btn-delete-selected-units')?.addEventListener('click', async () => {
        const count = selectedUnitIds.size;
        if (count === 0) return;

        if (!confirm(`Tem certeza que deseja remover ${count} unidade(s)? Moradores vinculados ficarão sem unidade.`)) return;

        const btn = document.getElementById('btn-delete-selected-units');
        btn.innerHTML = '<span style="font-size:0.8rem;">Removendo...</span>';
        btn.disabled = true;

        try {
            await API.deleteUnits([...selectedUnitIds]);
            selectedUnitIds.clear();
            updateBulkDeleteButton();
            loadOrg();
            loadDashboardStats();
        } catch (err) {
            console.error("Erro ao remover unidades em lote:", err);
            alert("Erro ao remover unidades. Tente novamente.");
        }

        btn.disabled = false;
    });

    // Units Filter
    document.getElementById('unit-search-input')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = currentUnits.filter(u => 
            String(u.number).toLowerCase().includes(term) || 
            String(u.blockName).toLowerCase().includes(term)
        );
        renderUnits(filtered);
    });

    document.getElementById('btn-add-block')?.addEventListener('click', async () => {
        const name = prompt("Digite o nome do novo Bloco (ex: Bloco C):");
        if(name) {
            await API.addBlock(name);
            loadOrg();
            loadDashboardStats();
        }
    });

    document.getElementById('btn-add-unit')?.addEventListener('click', async () => {
        const blocks = await API.getBlocks();
        if(blocks.length === 0) return alert("Crie um bloco primeiro!");
        
        let blockStr = blocks.map(b => `${b.id} - ${b.name}`).join("\n");
        const blockId = prompt(`Digite o ID do Bloco a qual a unidade pertence:\n${blockStr}`);
        if(blockId) {
            const number = prompt("Digite o número da unidade (ex: 405):");
            if(number) {
                await API.addUnit(blockId, number);
                loadOrg();
                loadDashboardStats();
            }
        }
    });

    // Load Residents
    async function loadResidents() {
        const tbody = document.getElementById('residents-tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando residentes...</td></tr>';
        
        try {
            currentResidents = await API.getResidents();
            renderResidents(currentResidents);
        } catch (error) {
            console.error("Erro ao carregar moradores:", error);
        }
    }

    // Render Residents Table
    function renderResidents(residentsArray) {
        const tbody = document.getElementById('residents-tbody');
        tbody.innerHTML = '';
        
        if (residentsArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">Nenhum morador encontrado.</td></tr>';
            return;
        }

        residentsArray.forEach(res => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${res.name}</td>
                <td>${res.unitDisplay}</td>
                <td>${res.phone}</td>
                <td>${res.vehicles}</td>
                <td>
                    <button class="btn btn-outline btn-delete" data-id="${res.id}" style="padding: 4px 8px; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">
                        <i data-lucide="trash-2" style="width: 16px;"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if(confirm('Tem certeza que deseja remover este morador?')) {
                    e.currentTarget.innerHTML = '...';
                    await API.deleteResident(id);
                    loadResidents();
                    loadDashboardStats();
                }
            });
        });
    }

    // --- SEARCH / FILTERS LOGIC ---
    function handleSearch(e) {
        const term = e.target.value.toLowerCase();
        const filtered = currentResidents.filter(r => 
            r.name.toLowerCase().includes(term) || 
            r.unitDisplay.toLowerCase().includes(term)
        );
        
        // Se a busca for global e aba não for moradores, navegar pra moradores
        if (e.target.id === 'global-search-input' && term.length > 0) {
            const residentsNav = Array.from(navItems).find(n => n.getAttribute('data-target') === 'residents');
            if (!residentsNav.classList.contains('active')) residentsNav.click();
            document.getElementById('resident-search-input').value = term;
        }

        renderResidents(filtered);
    }
    
    document.getElementById('global-search-input')?.addEventListener('input', handleSearch);
    document.getElementById('resident-search-input')?.addEventListener('input', handleSearch);

    // --- EXPORT TO CSV LOGIC --- //
    document.getElementById('btn-export-residents')?.addEventListener('click', () => {
        if(currentResidents.length === 0) return alert('Não há moradores para exportar.');
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID,Nome,Unidade/Bloco,Telefone,Veiculos\n";
        
        currentResidents.forEach(res => {
            let row = `${res.id},"${res.name}","${res.unitDisplay}","${res.phone}","${res.vehicles}"`;
            csvContent += row + "\r\n";
        });
        
        var encodedUri = encodeURI(csvContent);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "moradores_condominio.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- SETTINGS / DANGER ZONE LOGIC --- //
    document.getElementById('btn-reset-db')?.addEventListener('click', () => {
        if(confirm('Você está prestes a apagar TODOS os seus dados salvos localmente. Tem certeza ABSOLUTA disso?')) {
            localStorage.removeItem('condo_cms_db_v2'); // Hardcoded API constant
            alert('Banco de dados excluído. A aplicação será recarregada.');
            window.location.reload();
        }
    });

    // Load Maintenance
    async function loadMaintenance() {
        const maintOpen = document.getElementById('maint-open');
        const maintProgress = document.getElementById('maint-progress');
        const maintDone = document.getElementById('maint-done');
        
        maintOpen.innerHTML = '<div style="opacity:0.5; font-size: 0.8rem;">Carregando...</div>';
        maintProgress.innerHTML = '<div style="opacity:0.5; font-size: 0.8rem;">Carregando...</div>';
        maintDone.innerHTML = '<div style="opacity:0.5; font-size: 0.8rem;">Carregando...</div>';

        try {
            const calls = await API.getMaintenance();
            let htmlOpen = '', htmlProgress = '', htmlDone = '';
            let countOpen = 0, countProgress = 0, countDone = 0;

            calls.forEach(call => {
                let controls = '';
                if(call.status === 'open') {
                    controls = `<button class="btn-move" data-id="${call.id}" data-to="progress" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px;"><i data-lucide="arrow-right-circle" style="width: 16px;"></i></button>`;
                } else if(call.status === 'progress') {
                    controls = `
                    <div style="display:flex; gap: 8px;">
                        <button class="btn-move" data-id="${call.id}" data-to="open" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px;"><i data-lucide="arrow-left-circle" style="width: 16px;"></i></button>
                        <button class="btn-move" data-id="${call.id}" data-to="done" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px;"><i data-lucide="check-circle" style="width: 16px;"></i></button>
                    </div>`;
                } else if(call.status === 'done') {
                    controls = `<button class="btn-move" data-id="${call.id}" data-to="progress" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px;"><i data-lucide="corner-down-left" style="width: 16px;"></i></button>`;
                }

                const itemHtml = `
                    <div class="notice-item" style="display:flex; justify-content: space-between; align-items:flex-end;">
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${call.location}</span>
                            <div class="notice-title" style="margin-top:4px;">${call.title}</div>
                        </div>
                        <div>${controls}</div>
                    </div>
                `;
                if(call.status === 'open') { htmlOpen += itemHtml; countOpen++; }
                if(call.status === 'progress') { htmlProgress += itemHtml; countProgress++; }
                if(call.status === 'done') { htmlDone += itemHtml; countDone++; }
            });

            maintOpen.innerHTML = htmlOpen || '<div class="notice-item" style="opacity:0.5; border:none;">Vazio</div>';
            maintProgress.innerHTML = htmlProgress || '<div class="notice-item" style="opacity:0.5; border:none;">Vazio</div>';
            maintDone.innerHTML = htmlDone || '<div class="notice-item" style="opacity:0.5; border:none;">Vazio</div>';

            document.getElementById('badge-open').textContent = countOpen;
            document.getElementById('badge-progress').textContent = countProgress;
            document.getElementById('badge-done').textContent = countDone;

            const iconElements = maintOpen.querySelectorAll('[data-lucide]');
            const progressIcons = maintProgress.querySelectorAll('[data-lucide]');
            const doneIcons = maintDone.querySelectorAll('[data-lucide]');
            
            [...iconElements, ...progressIcons, ...doneIcons].forEach(el => lucide.createIcons({name: el.getAttribute('data-lucide')}));
            lucide.createIcons(); 

            document.querySelectorAll('.btn-move').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const btnEl = e.currentTarget;
                    btnEl.style.opacity = 0.5;
                    const id = btnEl.getAttribute('data-id');
                    const to = btnEl.getAttribute('data-to');
                    await API.updateMaintenanceStatus(id, to);
                    loadMaintenance();
                    loadDashboardStats();
                });
            });

        } catch (error) {
            console.error("Erro ao carregar manutenções:", error);
        }
    }

    // --- MODAL LOGIC (RESIDENTS) ---
    const modal = document.getElementById('add-resident-modal');
    const btnOpenModal = document.getElementById('btn-open-add-resident');
    const btnCancel = document.getElementById('cancel-resident');
    const btnSave = document.getElementById('save-resident');
    const selectUnit = document.getElementById('res-unit-id');

    btnOpenModal.addEventListener('click', async () => {
        selectUnit.innerHTML = '<option value="">Carregando...</option>';
        modal.style.display = 'flex';
        
        try {
            const units = await API.getUnits();
            selectUnit.innerHTML = '<option value="">Selecione a Unidade associada...</option>' + 
                units.map(u => `<option value="${u.id}">${u.blockName} - ${u.number}</option>`).join('');
        } catch(e) {
            console.error(e);
        }
    });

    btnCancel.addEventListener('click', () => {
        modal.style.display = 'none';
        clearForm();
    });

    btnSave.addEventListener('click', async () => {
        const name = document.getElementById('res-name').value;
        const unitId = selectUnit.value;
        const phone = document.getElementById('res-phone').value;
        const vehicles = document.getElementById('res-vehicles').value;

        if(!name || !unitId) return alert("Nome e Unidade são campos obrigatórios");

        btnSave.textContent = "Salvando...";
        await API.addResident({ name, unitId, phone, vehicles });
        
        clearForm();
        modal.style.display = 'none';
        btnSave.textContent = "Salvar";
        
        loadResidents();
        loadDashboardStats();
    });

    // --- PORTAL DO MORADOR LOGIC --- //
    async function loadPortalSim() {
        const select = document.getElementById('sim-resident-select');
        try {
            const res = await API.getResidents();
            if(select.options.length <= 1) { // Só carregar se tiver vazio
                select.innerHTML = '<option value="">Entrar como morador...</option>' + 
                res.map(r => `<option value="${r.id}">${r.name} (${r.unitDisplay})</option>`).join('');
            }
        } catch(e) {}
    }

    document.getElementById('sim-resident-select')?.addEventListener('change', async (e) => {
        const portalContent = document.getElementById('portal-content');
        const portalLocked = document.getElementById('portal-locked');
        const id = e.target.value;

        if(!id) {
            portalContent.style.display = 'none';
            portalLocked.style.display = 'block';
            return;
        }

        try {
            const me = await API.getResidentData(id);
            const notices = await API.getNotices();
            const maint = await API.getMaintenance();
            
            // Switch UI
            portalLocked.style.display = 'none';
            portalContent.style.display = 'block';

            // Populate Info
            document.getElementById('portal-welcome').textContent = `Olá, ${me.name.split(' ')[0]}!`;
            document.getElementById('portal-unit').textContent = `${me.unitDisplay} | Veículos Cadastrados: ${me.vehicles}`;

            // Populate Notices
            document.getElementById('portal-notices').innerHTML = notices.map(n => `
                <div class="notice-item" style="border-left-color: var(--${n.type === 'warning' ? 'warning' : 'info'});">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${n.date}</span>
                    <div class="notice-title" style="margin-top:4px; font-size:1.05rem;">${n.title}</div>
                    <div style="font-size:0.9rem; color: #ddd; margin-top:5px;">${n.content}</div>
                </div>
            `).join('') || `<p style="color:var(--text-muted)">Sem novos comunicados.</p>`;

            // Populate My Calls (Simulating filtering by unitId in location, or just show all for demo context? We'll filter string match)
            // Para simplicidade didática do mock, se a localização do chamado contiver o "id" ou o nome do apto, é dele.
            const myCalls = maint.filter(m => m.location.includes(me.unitDisplay) || m.location === String(me.id));
            document.getElementById('portal-my-calls').innerHTML = myCalls.map(c => `
                <div class="notice-item" style="border-left-color: ${c.status==='done'?'var(--success)':c.status==='progress'?'var(--warning)':'var(--text-muted)'}; padding: 10px;">
                    <div style="display:flex; justify-content:space-between;">
                        <b style="font-size:0.85rem">${c.title}</b>
                        <span class="badge" style="background:transparent; border:1px solid #555;">${c.status}</span>
                    </div>
                </div>
            `).join('') || `<p style="font-size:0.85rem; color:#888;">Sem chamados abertos.</p>`;

        } catch(e) {
            console.error(e);
        }
    });

    document.getElementById('btn-portal-open-call')?.addEventListener('click', async () => {
        const id = document.getElementById('sim-resident-select').value;
        if(!id) return alert("Selecione um morador no simulador primeiro.");
        
        const title = prompt("Descreva o problema para o Síndico:");
        if(!title) return;
        
        const isUrgent = confirm("Este chamado é urgente?\n[OK] Sim - Urgente\n[Cancelar] Não - Normal");
        const urgency = isUrgent ? "Alta" : "Normal";
        
        try {
            const me = await API.getResidentData(id);
            // Assinatura correta: addMaintenance(title, urgency, desc, location)
            await API.addMaintenance(title, urgency, "", me.unitDisplay);
            alert("✅ Chamado aberto com sucesso! O síndico foi notificado.");
            // Refresh portal e dashboard
            document.getElementById('sim-resident-select').dispatchEvent(new Event('change'));
            loadDashboardStats();
            loadMaintenance();
        } catch(err) {
            console.error("Erro ao abrir chamado:", err);
            alert("Erro ao registrar chamado. Tente novamente.");
        }
    });

    function clearForm() {
        document.getElementById('res-name').value = '';
        selectUnit.value = '';
        document.getElementById('res-phone').value = '';
        document.getElementById('res-vehicles').value = '';
    }

    // --- LOGOUT LOGIC ---
    document.querySelector('.logout')?.addEventListener('click', (e) => {
        e.preventDefault();
        API.logout();
    });

    // --- USERS MANAGEMENT ---
    async function loadUsers() {
        try {
            const users = await API.getUsers();
            const tbody = document.getElementById('users-tbody');
            if (tbody) {
                tbody.innerHTML = users.map(u => `
                    <tr>
                        <td><b>${u.name}</b></td>
                        <td><code>${u.username}</code></td>
                        <td><span class="badge" style="background:rgba(139, 92, 246, 0.1); color:var(--primary);">${u.role}</span></td>
                        <td style="font-size:0.8rem; color:var(--text-muted);">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                            <button class="btn btn-outline btn-del-user" data-id="${u.id}" style="color:var(--danger); ${u.username === 'admin' ? 'display:none;' : ''}"><i data-lucide="trash-2" style="width:14px;"></i></button>
                        </td>
                    </tr>
                `).join('');
                
                lucide.createIcons();
                document.querySelectorAll('.btn-del-user').forEach(btn => btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if(confirm("Deseja remover este usuário?")) {
                        await API.deleteUser(id);
                        loadUsers();
                    }
                }));
            }
        } catch (e) {
            console.error("Erro ao carregar usuários:", e);
        }
    }

    // Code removed from here and moved to the top


    document.getElementById('btn-open-add-user')?.addEventListener('click', async () => {
        const name = prompt("Nome completo do usuário:");
        if(!name) return;
        const username = prompt("Nome de usuário (login):");
        if(!username) return;
        const password = prompt("Senha:");
        if(!password) return;
        const role = prompt("Cargo (Ex: Admin, Porteiro, Zelador):", "Operador");
        
        await API.addUser({ name, username, password, role });
        loadUsers();
    });

    // --- PROFILE SAVE LOGIC ---
    document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
        const sessionUser = API.checkSession();
        if (!sessionUser) return alert("Sessão expirada. Faça login novamente.");

        const newName = document.getElementById('profile-name').value.trim();
        const newUsername = document.getElementById('profile-username').value.trim();
        const feedback = document.getElementById('profile-save-feedback');

        if (!newName || !newUsername) return alert("Nome e Usuário não podem ficar vazios.");

        const btn = document.getElementById('btn-save-profile');
        btn.textContent = "Salvando...";
        btn.disabled = true;

        try {
            await API.updateUserProfile(sessionUser.id, { 
                name: newName, 
                username: newUsername.toLowerCase() 
            });

            // Atualizar nome no header
            const adminNameEl = document.querySelector('.admin-name');
            if (adminNameEl) adminNameEl.textContent = newName;

            feedback.style.display = 'block';
            feedback.style.color = 'var(--success)';
            feedback.textContent = '✅ Perfil atualizado com sucesso!';
            setTimeout(() => { feedback.style.display = 'none'; }, 3000);
        } catch (err) {
            console.error("Erro ao salvar perfil:", err);
            feedback.style.display = 'block';
            feedback.style.color = 'var(--danger)';
            feedback.textContent = '❌ Erro ao salvar. Tente novamente.';
        }

        btn.textContent = "Salvar Alterações";
        btn.disabled = false;
    });

    // --- PASSWORD CHANGE LOGIC ---
    document.getElementById('btn-change-password')?.addEventListener('click', async () => {
        const sessionUser = API.checkSession();
        if (!sessionUser) return alert("Sessão expirada. Faça login novamente.");

        const currentPwd = document.getElementById('profile-current-password').value;
        const newPwd = document.getElementById('profile-new-password').value;
        const confirmPwd = document.getElementById('profile-confirm-password').value;
        const feedback = document.getElementById('password-feedback');

        if (!currentPwd || !newPwd || !confirmPwd) {
            feedback.style.display = 'block';
            feedback.style.color = 'var(--danger)';
            feedback.textContent = '⚠️ Preencha todos os campos de senha.';
            return;
        }

        if (newPwd !== confirmPwd) {
            feedback.style.display = 'block';
            feedback.style.color = 'var(--danger)';
            feedback.textContent = '⚠️ A nova senha e a confirmação não coincidem.';
            return;
        }

        if (newPwd.length < 4) {
            feedback.style.display = 'block';
            feedback.style.color = 'var(--danger)';
            feedback.textContent = '⚠️ A nova senha deve ter pelo menos 4 caracteres.';
            return;
        }

        const btn = document.getElementById('btn-change-password');
        btn.textContent = "Alterando...";
        btn.disabled = true;

        try {
            const result = await API.changeUserPassword(sessionUser.id, currentPwd, newPwd);
            if (result.success) {
                feedback.style.display = 'block';
                feedback.style.color = 'var(--success)';
                feedback.textContent = '✅ Senha alterada com sucesso!';
                // Limpar campos
                document.getElementById('profile-current-password').value = '';
                document.getElementById('profile-new-password').value = '';
                document.getElementById('profile-confirm-password').value = '';
            } else {
                feedback.style.display = 'block';
                feedback.style.color = 'var(--danger)';
                feedback.textContent = `❌ ${result.message}`;
            }
        } catch (err) {
            console.error("Erro ao alterar senha:", err);
            feedback.style.display = 'block';
            feedback.style.color = 'var(--danger)';
            feedback.textContent = '❌ Erro no servidor. Tente novamente.';
        }

        btn.textContent = "Alterar Senha";
        btn.disabled = false;
        setTimeout(() => { feedback.style.display = 'none'; }, 5000);
    });

    console.log("✅ Sistema pronto e listeners anexados.");

    // Initial Load
    const currentUser = API.checkSession();
    if (currentUser) {
        loadDashboardStats();
        loadMaintenance();
    }

    // --- HEADER DROPDOWNS LOGIC ---
    const btnNotif = document.getElementById('btn-notifications');
    const btnProfile = document.getElementById('btn-profile');
    const dropdownNotif = document.getElementById('notifications-dropdown');
    const dropdownProfile = document.getElementById('profile-dropdown');

    const toggleDropdown = (dropdown) => {
        const isActive = dropdown.classList.contains('active');
        // Close all first
        document.querySelectorAll('.dropdown-menu').forEach(dm => dm.classList.remove('active'));
        if (!isActive) dropdown.classList.add('active');
    };

    btnNotif?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dropdownNotif);
    });

    btnProfile?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dropdownProfile);
    });

    // --- NOTIFICATION INTERACTIONS ---
    async function refreshNotifications() {
        const nList = document.getElementById('notifications-list');
        const nBadge = document.getElementById('notifications-badge');
        if (!nList) return;

        try {
            const notices = await API.getNotices();
            const maintenance = await API.getMaintenance();
            const readIds = JSON.parse(localStorage.getItem('condo_read_notifs') || '[]');

            // Combine and format
            let allNotifs = [
                ...notices.map(n => ({ id: `notice_${n.id}`, title: n.title, text: n.content, date: n.date, icon: 'info', color: 'purple', target: 'dashboard' })),
                ...maintenance.filter(m => m.status === 'open').map(m => ({ id: `maint_${m.id}`, title: 'Chamado Aberto', text: `${m.title} na ${m.location}`, date: m.displayDate, icon: 'alert-circle', color: 'orange', target: 'maintenance' }))
            ];

            // Filter unread
            const unreadNotifs = allNotifs.filter(n => !readIds.includes(n.id));

            // Update Badge
            if (unreadNotifs.length > 0) {
                nBadge.textContent = unreadNotifs.length;
                nBadge.style.display = 'flex';
            } else {
                nBadge.style.display = 'none';
            }

            // Render List (Show last 5 unread)
            if (unreadNotifs.length === 0) {
                nList.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:0.8rem;">Nenhuma notificação nova</div>';
            } else {
                nList.innerHTML = unreadNotifs.slice(0, 5).map(n => `
                    <div class="notif-item" data-id="${n.id}" data-target="${n.target}">
                        <div class="notif-icon ${n.color}"><i data-lucide="${n.icon}"></i></div>
                        <div class="notif-text">
                            <b>${n.title}</b>
                            <p>${n.text}</p>
                            <span>${n.date}</span>
                        </div>
                    </div>
                `).join('');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        } catch (error) {
            console.error("Erro ao atualizar notificações:", error);
        }
    }

    const markReadBtn = document.getElementById('btn-mark-all-read');
    markReadBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const notices = await API.getNotices();
        const maintenance = await API.getMaintenance();
        const readIds = JSON.parse(localStorage.getItem('condo_read_notifs') || '[]');
        
        const currentIds = [
            ...notices.map(n => `notice_${n.id}`),
            ...maintenance.map(m => `maint_${m.id}`)
        ];

        localStorage.setItem('condo_read_notifs', JSON.stringify([...new Set([...readIds, ...currentIds])]));
        refreshNotifications();
        console.log("Todas as notificações marcadas como lidas");
    });

    // Event Delegation for dynamic notifications
    document.getElementById('notifications-list')?.addEventListener('click', (e) => {
        const item = e.target.closest('.notif-item');
        if (item) {
            const target = item.getAttribute('data-target');
            const id = item.getAttribute('data-id');
            
            // Mark as read
            const readIds = JSON.parse(localStorage.getItem('condo_read_notifs') || '[]');
            readIds.push(id);
            localStorage.setItem('condo_read_notifs', JSON.stringify([...new Set(readIds)]));

            // Navigate
            document.querySelector(`.nav-item[data-target="${target}"]`)?.click();
            // Close dropdown
            document.querySelectorAll('.dropdown-menu').forEach(dm => dm.classList.remove('active'));
            refreshNotifications();
        }
    });

    // Close on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu').forEach(dm => dm.classList.remove('active'));
    });

    // Don't close when clicking inside the dropdown
    document.querySelectorAll('.dropdown-menu').forEach(dm => {
        dm.addEventListener('click', (e) => e.stopPropagation());
    });
    // --- CONDO SETTINGS LOGIC ---
    async function loadSettings() {
        try {
            const settings = await API.getSettings();
            
            // Populate inputs
            const nameInput = document.getElementById('settings-condo-name');
            const cnpjInput = document.getElementById('settings-condo-cnpj');
            const cityInput = document.getElementById('settings-condo-city');
            const sidebarName = document.getElementById('sidebar-condo-name');

            if (nameInput) nameInput.value = settings.name;
            if (cnpjInput) cnpjInput.value = settings.cnpj;
            if (cityInput) cityInput.value = settings.city;
            if (sidebarName) sidebarName.textContent = settings.name;
            
            console.log("Configurações do condomínio carregadas.");
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
        }
    }

    document.getElementById('btn-save-settings')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const originalText = btn.textContent;
        
        const name = document.getElementById('settings-condo-name').value;
        const cnpj = document.getElementById('settings-condo-cnpj').value;
        const city = document.getElementById('settings-condo-city').value;

        if (!name) return alert("O nome do condomínio é obrigatório.");

        btn.textContent = "Salvando...";
        btn.disabled = true;

        try {
            await API.saveSettings({ name, cnpj, city });
            
            // Success feedback
            btn.textContent = "Salvo com Sucesso!";
            btn.style.background = "var(--success)";
            
            // Update sidebar immediately
            const sidebarName = document.getElementById('sidebar-condo-name');
            if (sidebarName) sidebarName.textContent = name;

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = "";
                btn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error("Erro ao salvar configurações:", error);
            alert("Erro ao salvar no servidor.");
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    // Initial Load for Settings data (just for the sidebar)
    loadSettings();
    refreshNotifications();

    console.log("✅ Sistema pronto e listeners anexados.");
});
