// Initialize Lucide Icons with safety check
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
} else {
    console.error("Lucide icons library not loaded!");
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Aplicativo iniciando...");

    // --- THEME TOGGLE (LIGHT / DARK) ---
    const THEME_KEY = 'condo_theme';
    const themeToggleBtn = document.getElementById('theme-toggle');
    const getPreferredTheme = () => {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    };

    const applyTheme = (theme) => {
        document.body.setAttribute('data-theme', theme);
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = `<i data-lucide="${theme === 'light' ? 'sun' : 'moon'}"></i>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    };

    let currentTheme = getPreferredTheme();
    applyTheme(currentTheme);

    themeToggleBtn?.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, currentTheme);
        applyTheme(currentTheme);
    });

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
    const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='60' fill='%23e2e8f0'/%3E%3Ccircle cx='60' cy='46' r='22' fill='%2394a3b8'/%3E%3Cpath d='M24 98c6-18 20-28 36-28s30 10 36 28' fill='%2394a3b8'/%3E%3C/svg%3E";
    const photoStorageKey = user ? `condo_user_photo_${user.id}` : 'condo_user_photo_guest';
    const savedPhoto = localStorage.getItem(photoStorageKey);
    const updateAvatars = (url) => {
        document.querySelectorAll('.user-avatar-img').forEach(img => {
            img.src = url;
            console.log("Avatar atualizado:", url);
        });
    };
    updateAvatars(savedPhoto || DEFAULT_AVATAR);

    console.log("Vinculando listener de Alterar Foto...");
    const btnChangePhoto = document.getElementById('btn-change-photo');
    if (btnChangePhoto) {
        btnChangePhoto.onclick = async () => {
            console.log("Evento onclick disparado em Alterar Foto");
            const result = await openFormModal({
                title: 'Alterar Foto de Perfil',
                submitLabel: 'Salvar',
                fields: [
                    { name: 'url', label: 'URL da Imagem (JPG/PNG)', type: 'text', value: savedPhoto || DEFAULT_AVATAR, required: true }
                ]
            });
            if (result?.url && result.url.trim() !== '') {
                localStorage.setItem(photoStorageKey, result.url.trim());
                updateAvatars(result.url.trim());
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
                    if (targetId === 'residents') loadResidents();
                    if (targetId === 'dashboard') loadDashboardStats();
                    if (targetId === 'maintenance') loadMaintenance();
                    if (targetId === 'packages') loadPackages();
                    if (targetId === 'org') loadOrg();
                    if (targetId === 'portal') loadPortalSim();
                    if (targetId === 'users') loadUsers();
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
    let currentParcels = [];
    let currentVehicleResidentId = '';
    let currentVehicles = [];
    let editingResidentId = '';
    let editingVehicleId = '';
    let packagePhotoDataUrl = '';

    const genericFormModal = document.getElementById('generic-form-modal');
    const genericFormTitle = document.getElementById('generic-form-title');
    const genericFormFields = document.getElementById('generic-form-fields');
    const genericFormCancel = document.getElementById('generic-form-cancel');
    const genericFormSave = document.getElementById('generic-form-save');
    const USER_ROLE_OPTIONS = [
        { value: 'Administrador', label: 'Administrador' },
        { value: 'Síndico', label: 'Síndico' },
        { value: 'Porteiro', label: 'Porteiro' },
        { value: 'Zelador', label: 'Zelador' },
        { value: 'Financeiro', label: 'Financeiro' },
        { value: 'Operador', label: 'Operador' }
    ];

    function escapeHtml(value = '') {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function openFormModal({ title, submitLabel = 'Salvar', fields = [] }) {
        return new Promise((resolve) => {
            genericFormTitle.textContent = title;
            genericFormSave.textContent = submitLabel;

            genericFormFields.innerHTML = fields.map((field) => {
                const required = field.required ? 'required' : '';
                const label = field.label ? `<label style="display:block; font-size:0.8rem; color:var(--text-muted); margin-bottom:5px;">${escapeHtml(field.label)}</label>` : '';
                if (field.type === 'select') {
                    const options = (field.options || []).map(opt => `<option value="${escapeHtml(opt.value)}" ${String(opt.value) === String(field.value ?? '') ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('');
                    return `<div>${label}<select data-field="${escapeHtml(field.name)}" ${required}>${options}</select></div>`;
                }
                if (field.type === 'textarea') {
                    return `<div>${label}<textarea data-field="${escapeHtml(field.name)}" placeholder="${escapeHtml(field.placeholder || '')}" ${required}>${escapeHtml(field.value || '')}</textarea></div>`;
                }
                return `<div>${label}<input type="${escapeHtml(field.type || 'text')}" data-field="${escapeHtml(field.name)}" value="${escapeHtml(field.value || '')}" placeholder="${escapeHtml(field.placeholder || '')}" ${required}></div>`;
            }).join('');

            const close = (result = null) => {
                genericFormModal.style.display = 'none';
                genericFormCancel.onclick = null;
                genericFormSave.onclick = null;
                genericFormModal.onclick = null;
                resolve(result);
            };

            genericFormCancel.onclick = () => close(null);
            genericFormModal.onclick = (e) => {
                if (e.target === genericFormModal) close(null);
            };
            genericFormSave.onclick = () => {
                const values = {};
                const invalidField = fields.find((field) => {
                    const el = genericFormFields.querySelector(`[data-field="${field.name}"]`);
                    if (!el) return false;
                    values[field.name] = el.value;
                    return field.required && !String(el.value || '').trim();
                });
                if (invalidField) {
                    alert(`Preencha o campo obrigatório: ${invalidField.label || invalidField.name}`);
                    return;
                }
                close(values);
            };

            genericFormModal.style.display = 'flex';
        });
    }

    function formatPhoneForWhatsApp(phone = '') {
        return String(phone).replace(/\D/g, '');
    }

    function buildParcelWhatsAppMessage(parcel) {
        const parts = [
            `Olá, ${parcel.residentName.split(' ')[0]}!`,
            `Sua encomenda chegou na administração do condomínio.`,
            `Unidade: ${parcel.unitDisplay}`,
            `Recebimento: ${parcel.receivedAtLabel}`
        ];

        if (parcel.carrier) parts.push(`Origem/transportadora: ${parcel.carrier}`);
        if (parcel.trackingCode) parts.push(`Referência: ${parcel.trackingCode}`);
        if (parcel.notes) parts.push(`Observações: ${parcel.notes}`);

        parts.push('Quando puder, passe na administração para retirar.');
        return parts.join('\n');
    }

    function setPackageFeedback(message, type = 'info') {
        const feedback = document.getElementById('package-form-feedback');
        if (!feedback) return;

        feedback.style.display = 'block';
        feedback.style.color = type === 'error' ? 'var(--danger)' : (type === 'success' ? 'var(--success)' : 'var(--text-muted)');
        feedback.textContent = message;
    }

    function resetPackageForm() {
        const residentSelect = document.getElementById('package-resident-id');
        const carrierInput = document.getElementById('package-carrier');
        const codeInput = document.getElementById('package-code');
        const notesInput = document.getElementById('package-notes');
        const photoInput = document.getElementById('package-photo');
        const previewWrap = document.getElementById('package-photo-preview-wrap');
        const previewImage = document.getElementById('package-photo-preview');

        if (residentSelect) residentSelect.value = '';
        if (carrierInput) carrierInput.value = '';
        if (codeInput) codeInput.value = '';
        if (notesInput) notesInput.value = '';
        if (photoInput) photoInput.value = '';
        if (previewWrap) previewWrap.style.display = 'none';
        if (previewImage) previewImage.src = '';

        packagePhotoDataUrl = '';
        setPackageFeedback('', 'info');
        if (document.getElementById('package-form-feedback')) {
            document.getElementById('package-form-feedback').style.display = 'none';
        }
    }

    function readImageAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
            reader.readAsDataURL(file);
        });
    }

    function resizeImage(dataUrl, maxWidth = 960, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                const ratio = image.width > maxWidth ? maxWidth / image.width : 1;
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(image.width * ratio);
                canvas.height = Math.round(image.height * ratio);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            image.onerror = () => reject(new Error('Não foi possível processar a foto.'));
            image.src = dataUrl;
        });
    }

    // Load Dashboard Stats & Notices
    async function loadDashboardStats() {
        try {
            const stats = await API.getStats();
            document.getElementById('stat-units').textContent = stats.totalUnits;
            document.getElementById('stat-occupancy').textContent = stats.occupancy;
            document.getElementById('stat-residents').textContent = stats.activeResidents;
            document.getElementById('stat-opencalls').textContent = stats.openCalls;

            const packagesBadge = document.getElementById('packages-summary-badge');
            if (packagesBadge) packagesBadge.textContent = `${stats.pendingParcels || 0} aguardando retirada`;

            // Load Admin Notices
            const notices = await API.getNotices();
            const noticesList = document.getElementById('admin-notices-list');
            if (noticesList) {
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
                    if (confirm("Excluir este aviso? Ele sumirá dos portais de todos os moradores.")) {
                        await API.deleteNotice(id);
                        loadDashboardStats();
                    }
                }));
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

        blocksBody.innerHTML = '<tr><td colspan="2">Carregando...</td></tr>';
        unitsBody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';

        try {
            const blocks = await API.getBlocks();
            currentUnits = await API.getUnits();

            blocksBody.innerHTML = blocks.map(b => `
                <tr>
                    <td>${b.name}</td>
                    <td>
                        <button class="btn btn-outline btn-gen-unit" data-id="${b.id}" style="padding: 4px 8px; color: var(--warning); border-color: rgba(245, 158, 11, 0.3);" title="Gerar 96 Unidades"><i data-lucide="wand" style="width: 14px;"></i></button>
                        <button class="btn btn-outline btn-edit-block" data-id="${b.id}" data-name="${b.name}" style="padding: 4px 8px;"><i data-lucide="edit" style="width: 14px;"></i></button>
                        <button class="btn btn-outline btn-del-block" data-id="${b.id}" style="padding: 4px 8px; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);"><i data-lucide="trash-2" style="width: 14px;"></i></button>
                    </td>
                </tr>
            `).join('') || `<tr><td colspan="2">Sem blocos</td></tr>`;

            renderUnits(currentUnits);
            lucide.createIcons();

            // Block Handlers
            document.querySelectorAll('.btn-edit-block').forEach(btn => btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const oldName = e.currentTarget.getAttribute('data-name');
                const result = await openFormModal({
                    title: 'Editar Bloco',
                    submitLabel: 'Salvar',
                    fields: [{ name: 'name', label: 'Nome do Bloco', type: 'text', value: oldName, required: true }]
                });
                const newName = result?.name?.trim();
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
                if (!result.success) {
                    alert(result.message);
                } else {
                    alert(`Sucesso! ${result.count} novas unidades foram erguidas no servidor para este bloco.`);
                }
                loadOrg(); loadDashboardStats();
            }));

        } catch (e) {
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
            const result = await openFormModal({
                title: 'Editar Unidade',
                submitLabel: 'Salvar',
                fields: [
                    {
                        name: 'blockId',
                        label: 'Bloco',
                        type: 'select',
                        value: e.currentTarget.getAttribute('data-block'),
                        required: true,
                        options: blocks.map(b => ({ value: b.id, label: b.name }))
                    },
                    {
                        name: 'number',
                        label: 'Número da Unidade',
                        type: 'text',
                        value: e.currentTarget.getAttribute('data-num'),
                        required: true
                    }
                ]
            });
            if (result) {
                await API.updateUnit(id, { blockId: result.blockId, number: parseInt(result.number, 10) });
                loadOrg(); loadDashboardStats();
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
        const result = await openFormModal({
            title: 'Novo Bloco',
            submitLabel: 'Criar',
            fields: [{ name: 'name', label: 'Nome do Bloco', type: 'text', placeholder: 'Ex: Bloco C', required: true }]
        });
        const name = result?.name?.trim();
        if (name) {
            await API.addBlock(name);
            loadOrg();
            loadDashboardStats();
        }
    });

    document.getElementById('btn-add-unit')?.addEventListener('click', async () => {
        const blocks = await API.getBlocks();
        if (blocks.length === 0) return alert("Crie um bloco primeiro!");

        const result = await openFormModal({
            title: 'Nova Unidade',
            submitLabel: 'Criar',
            fields: [
                { name: 'blockId', label: 'Bloco', type: 'select', required: true, options: blocks.map(b => ({ value: b.id, label: b.name })) },
                { name: 'number', label: 'Número da Unidade', type: 'text', placeholder: 'Ex: 405', required: true }
            ]
        });
        if (result?.blockId && result?.number) {
            await API.addUnit(result.blockId, result.number);
            loadOrg();
            loadDashboardStats();
        }
    });

    // Load Residents
    async function loadResidents() {
        const tbody = document.getElementById('residents-tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando residentes...</td></tr>';

        try {
            currentResidents = await API.getResidents();
            renderResidents(currentResidents);
            await populateVehicleResidentSelect(currentVehicleResidentId);
            if (currentVehicleResidentId) {
                await loadVehiclesByResident(currentVehicleResidentId);
            } else {
                renderVehiclesTable([]);
            }
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
                <td>${res.vehiclesCount || 0}</td>
                <td>
                    <button class="btn btn-outline btn-open-vehicles" data-id="${res.id}" style="padding: 4px 8px;" title="Gerenciar veículos">
                        <i data-lucide="car" style="width: 16px;"></i>
                    </button>
                    <button class="btn btn-outline btn-edit-resident" data-id="${res.id}" data-name="${res.name}" data-phone="${res.phone || ''}" data-unit-id="${res.unitId || ''}" style="padding: 4px 8px;">
                        <i data-lucide="edit" style="width: 16px;"></i>
                    </button>
                    <button class="btn btn-outline btn-delete" data-id="${res.id}" style="padding: 4px 8px; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">
                        <i data-lucide="trash-2" style="width: 16px;"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();

        document.querySelectorAll('.btn-edit-resident').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const oldName = e.currentTarget.getAttribute('data-name') || '';
                const oldPhone = e.currentTarget.getAttribute('data-phone') || '';
                const oldUnitId = e.currentTarget.getAttribute('data-unit-id') || '';
                await openEditResidentModal({ id, name: oldName, phone: oldPhone, unitId: oldUnitId });
            });
        });

        document.querySelectorAll('.btn-open-vehicles').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const residentId = e.currentTarget.getAttribute('data-id');
                const vehicleResidentSelect = document.getElementById('vehicle-resident-select');
                if (!vehicleResidentSelect) return;
                vehicleResidentSelect.value = residentId;
                currentVehicleResidentId = residentId;
                const addVehicleBtn = document.getElementById('btn-add-vehicle');
                if (addVehicleBtn) addVehicleBtn.disabled = false;
                await loadVehiclesByResident(residentId);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Tem certeza que deseja remover este morador?')) {
                    e.currentTarget.innerHTML = '...';
                    await API.deleteResident(id);
                    if (currentVehicleResidentId === id) {
                        currentVehicleResidentId = '';
                        currentVehicles = [];
                    }
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
        if (currentResidents.length === 0) return alert('Não há moradores para exportar.');

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "ID,Nome,Unidade/Bloco,Telefone,Veiculos\n";

        currentResidents.forEach(res => {
            let row = `${res.id},"${res.name}","${res.unitDisplay}","${res.phone}","${res.vehiclesCount || 0}"`;
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
        if (confirm('Você está prestes a apagar TODOS os seus dados salvos localmente. Tem certeza ABSOLUTA disso?')) {
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
                if (call.status === 'open') {
                    controls = `<button class="btn-move" data-id="${call.id}" data-to="progress" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px;"><i data-lucide="arrow-right-circle" style="width: 16px;"></i></button>`;
                } else if (call.status === 'progress') {
                    controls = `
                    <div style="display:flex; gap: 8px;">
                        <button class="btn-move" data-id="${call.id}" data-to="open" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px;"><i data-lucide="arrow-left-circle" style="width: 16px;"></i></button>
                        <button class="btn-move" data-id="${call.id}" data-to="done" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px;"><i data-lucide="check-circle" style="width: 16px;"></i></button>
                    </div>`;
                } else if (call.status === 'done') {
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
                if (call.status === 'open') { htmlOpen += itemHtml; countOpen++; }
                if (call.status === 'progress') { htmlProgress += itemHtml; countProgress++; }
                if (call.status === 'done') { htmlDone += itemHtml; countDone++; }
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

            [...iconElements, ...progressIcons, ...doneIcons].forEach(el => lucide.createIcons({ name: el.getAttribute('data-lucide') }));
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

    async function loadPackages() {
        const residentSelect = document.getElementById('package-resident-id');
        const pendingList = document.getElementById('packages-pending-list');
        const deliveredList = document.getElementById('packages-delivered-list');

        if (pendingList) pendingList.innerHTML = '<div class="notice-item" style="opacity:0.5; border:none;">Carregando...</div>';
        if (deliveredList) deliveredList.innerHTML = '<div class="notice-item" style="opacity:0.5; border:none;">Carregando...</div>';

        try {
            const [residents, parcels] = await Promise.all([
                API.getResidents(),
                API.getParcels()
            ]);

            currentParcels = parcels;

            if (residentSelect) {
                const currentValue = residentSelect.value;
                residentSelect.innerHTML = '<option value="">Selecione o morador...</option>' +
                    residents.map(res => `<option value="${res.id}">${res.name} (${res.unitDisplay})</option>`).join('');
                residentSelect.value = currentValue || '';
            }

            const pending = parcels.filter(parcel => parcel.status === 'pending');
            const delivered = parcels.filter(parcel => parcel.status === 'delivered');

            document.getElementById('packages-pending-count').textContent = pending.length;
            document.getElementById('packages-delivered-count').textContent = delivered.length;
            const summaryBadge = document.getElementById('packages-summary-badge');
            if (summaryBadge) summaryBadge.textContent = `${pending.length} aguardando retirada`;

            if (pendingList) {
                pendingList.innerHTML = pending.map(parcel => `
                    <div class="notice-item" style="border-left-color: var(--warning);">
                        <div style="display:flex; gap:12px; align-items:flex-start;">
                            ${parcel.photoDataUrl ? `<img src="${parcel.photoDataUrl}" alt="Encomenda de ${parcel.residentName}" style="width:72px; height:72px; object-fit:cover; border-radius:12px; border:1px solid var(--surface-border);">` : ''}
                            <div style="flex:1;">
                                <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;">
                                    <div>
                                        <div class="notice-title">${parcel.residentName}</div>
                                        <span style="font-size:0.75rem; color: var(--text-muted);">${parcel.unitDisplay} • Recebida em ${parcel.receivedAtLabel}</span>
                                    </div>
                                    <span class="badge" style="position:static; width:auto; height:auto; border-radius:999px; padding:4px 10px; background:${parcel.notificationStatus === 'sent' ? 'rgba(34,197,94,0.18)' : 'rgba(245,158,11,0.18)'}; color:${parcel.notificationStatus === 'sent' ? 'var(--success)' : 'var(--warning)'};">
                                        ${parcel.notificationStatus === 'sent' ? 'WhatsApp enviado' : 'Notificação pendente'}
                                    </span>
                                </div>
                                <div style="font-size:0.84rem; color:#ddd; margin-top:6px;">
                                    ${parcel.carrier ? `<div>Transportadora: ${parcel.carrier}</div>` : ''}
                                    ${parcel.trackingCode ? `<div>Referência: ${parcel.trackingCode}</div>` : ''}
                                    ${parcel.notes ? `<div>Obs.: ${parcel.notes}</div>` : ''}
                                </div>
                                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
                                    <button class="btn btn-outline btn-parcel-whatsapp" data-id="${parcel.id}" style="padding:6px 10px; font-size:0.8rem;"><i data-lucide="message-circle" style="width:14px;"></i> WhatsApp</button>
                                    <button class="btn btn-outline btn-parcel-deliver" data-id="${parcel.id}" style="padding:6px 10px; font-size:0.8rem; color:var(--success); border-color: rgba(34,197,94,0.35);"><i data-lucide="check-circle" style="width:14px;"></i> Dar baixa</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('') || '<div class="notice-item" style="opacity:0.5; border:none;">Nenhuma encomenda pendente.</div>';
            }

            if (deliveredList) {
                deliveredList.innerHTML = delivered.map(parcel => `
                    <div class="notice-item" style="border-left-color: var(--success);">
                        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap;">
                            <div>
                                <div class="notice-title">${parcel.residentName}</div>
                                <span style="font-size:0.75rem; color: var(--text-muted);">${parcel.unitDisplay}</span>
                                <div style="font-size:0.84rem; color:#ddd; margin-top:6px;">
                                    Recebida em ${parcel.receivedAtLabel}<br>
                                    Entregue em ${parcel.deliveredAtLabel || 'Data não informada'}
                                </div>
                            </div>
                            <span class="badge" style="position:static; width:auto; height:auto; border-radius:999px; padding:4px 10px; background:rgba(34,197,94,0.18); color:var(--success);">
                                Baixada por ${parcel.deliveredBy || 'funcionário'}
                            </span>
                        </div>
                    </div>
                `).join('') || '<div class="notice-item" style="opacity:0.5; border:none;">Nenhuma encomenda entregue ainda.</div>';
            }

            lucide.createIcons();

            document.querySelectorAll('.btn-parcel-whatsapp').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const parcelId = e.currentTarget.getAttribute('data-id');
                    const parcel = currentParcels.find(item => item.id === parcelId);
                    if (!parcel) return;

                    const phone = formatPhoneForWhatsApp(parcel.residentPhone);
                    if (!phone) {
                        alert('Este morador não possui telefone cadastrado.');
                        return;
                    }

                    const message = encodeURIComponent(buildParcelWhatsAppMessage(parcel));
                    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                    await API.markParcelNotified(parcelId);
                    loadPackages();
                    refreshNotifications();
                });
            });

            document.querySelectorAll('.btn-parcel-deliver').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const parcelId = e.currentTarget.getAttribute('data-id');
                    const sessionUser = API.checkSession();
                    if (!confirm('Confirmar a baixa desta encomenda como entregue ao morador?')) return;

                    await API.markParcelDelivered(parcelId, sessionUser?.name || 'Funcionário');
                    loadPackages();
                    loadDashboardStats();
                    const selectedResident = document.getElementById('sim-resident-select')?.value;
                    if (selectedResident) {
                        document.getElementById('sim-resident-select').dispatchEvent(new Event('change'));
                    }
                    refreshNotifications();
                });
            });
        } catch (error) {
            console.error('Erro ao carregar encomendas:', error);
            if (pendingList) pendingList.innerHTML = '<div class="notice-item" style="opacity:0.5; border:none;">Erro ao carregar encomendas.</div>';
            if (deliveredList) deliveredList.innerHTML = '<div class="notice-item" style="opacity:0.5; border:none;">Erro ao carregar histórico.</div>';
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
        } catch (e) {
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
        if (!name || !unitId) return alert("Nome e Unidade são campos obrigatórios");

        btnSave.textContent = "Salvando...";
        await API.addResident({ name, unitId, phone });

        clearForm();
        modal.style.display = 'none';
        btnSave.textContent = "Salvar";

        loadResidents();
        loadDashboardStats();
    });

    document.getElementById('package-photo')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        const previewWrap = document.getElementById('package-photo-preview-wrap');
        const previewImage = document.getElementById('package-photo-preview');

        if (!file) {
            packagePhotoDataUrl = '';
            if (previewWrap) previewWrap.style.display = 'none';
            return;
        }

        try {
            const rawDataUrl = await readImageAsDataUrl(file);
            packagePhotoDataUrl = await resizeImage(rawDataUrl);
            if (previewImage) previewImage.src = packagePhotoDataUrl;
            if (previewWrap) previewWrap.style.display = 'block';
            setPackageFeedback('Foto pronta para salvar junto com a encomenda.', 'success');
        } catch (error) {
            console.error('Erro ao preparar foto da encomenda:', error);
            packagePhotoDataUrl = '';
            setPackageFeedback('Não foi possível processar a foto selecionada.', 'error');
        }
    });

    document.getElementById('btn-clear-package-form')?.addEventListener('click', () => {
        resetPackageForm();
    });

    document.getElementById('btn-save-package')?.addEventListener('click', async (e) => {
        const residentId = document.getElementById('package-resident-id')?.value;
        const carrier = document.getElementById('package-carrier')?.value.trim();
        const trackingCode = document.getElementById('package-code')?.value.trim();
        const notes = document.getElementById('package-notes')?.value.trim();
        const sessionUser = API.checkSession();
        const button = e.currentTarget;

        if (!residentId) {
            setPackageFeedback('Selecione o morador para vincular a encomenda.', 'error');
            return;
        }

        if (!packagePhotoDataUrl) {
            setPackageFeedback('Tire ou selecione uma foto da encomenda antes de salvar.', 'error');
            return;
        }

        button.disabled = true;
        button.textContent = 'Salvando...';

        try {
            await API.addParcel({
                residentId,
                carrier,
                trackingCode,
                notes,
                photoDataUrl: packagePhotoDataUrl,
                receivedBy: sessionUser?.name || 'Portaria'
            });

            resetPackageForm();
            setPackageFeedback('Encomenda registrada com sucesso. Abra o WhatsApp para avisar o morador.', 'success');
            await loadPackages();
            loadDashboardStats();
            loadPortalSim(true);
            refreshNotifications();
        } catch (error) {
            console.error('Erro ao salvar encomenda:', error);
            setPackageFeedback('Erro ao registrar encomenda. Tente novamente.', 'error');
        }

        button.disabled = false;
        button.innerHTML = '<i data-lucide="plus" style="width:18px;"></i> Registrar Encomenda';
        lucide.createIcons();
    });

    // --- PORTAL DO MORADOR LOGIC --- //
    async function loadPortalSim(forceReload = false) {
        const select = document.getElementById('sim-resident-select');
        try {
            const res = await API.getResidents();
            const currentValue = select.value;
            if (forceReload || select.options.length <= 1) { // Só carregar se tiver vazio
                select.innerHTML = '<option value="">Entrar como morador...</option>' +
                    res.map(r => `<option value="${r.id}">${r.name} (${r.unitDisplay})</option>`).join('');
                if (currentValue && res.some(r => r.id === currentValue)) {
                    select.value = currentValue;
                }
            }
        } catch (e) { }
    }

    document.getElementById('sim-resident-select')?.addEventListener('change', async (e) => {
        const portalContent = document.getElementById('portal-content');
        const portalLocked = document.getElementById('portal-locked');
        const id = e.target.value;

        if (!id) {
            portalContent.style.display = 'none';
            portalLocked.style.display = 'block';
            return;
        }

        try {
            const me = await API.getResidentData(id);
            const notices = await API.getNotices();
            const maint = await API.getMaintenance();
            const parcels = await API.getResidentParcels(id);

            // Switch UI
            portalLocked.style.display = 'none';
            portalContent.style.display = 'block';

            // Populate Info
            document.getElementById('portal-welcome').textContent = `Olá, ${me.name.split(' ')[0]}!`;
            document.getElementById('portal-unit').textContent = `${me.unitDisplay} | Veículos Cadastrados: ${me.vehiclesCount || 0}`;

            // Populate Notices
            document.getElementById('portal-notices').innerHTML = notices.map(n => `
                <div class="notice-item" style="border-left-color: var(--${n.type === 'warning' ? 'warning' : 'info'});">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${n.date}</span>
                    <div class="notice-title" style="margin-top:4px; font-size:1.05rem;">${n.title}</div>
                    <div style="font-size:0.9rem; color: var(--text-muted); margin-top:5px;">${n.content}</div>
                </div>
            `).join('') || `<p style="color:var(--text-muted)">Sem novos comunicados.</p>`;

            // Populate My Calls (Simulating filtering by unitId in location, or just show all for demo context? We'll filter string match)
            // Para simplicidade didática do mock, se a localização do chamado contiver o "id" ou o nome do apto, é dele.
            const myCalls = maint.filter(m => m.location.includes(me.unitDisplay) || m.location === String(me.id));
            document.getElementById('portal-my-calls').innerHTML = myCalls.map(c => `
                <div class="notice-item" style="border-left-color: ${c.status === 'done' ? 'var(--success)' : c.status === 'progress' ? 'var(--warning)' : 'var(--text-muted)'}; padding: 10px;">
                    <div style="display:flex; justify-content:space-between;">
                        <b style="font-size:0.85rem">${c.title}</b>
                        <span class="badge" style="background:transparent; border:1px solid #555;">${c.status}</span>
                    </div>
                </div>
            `).join('') || `<p style="font-size:0.85rem; color:#888;">Sem chamados abertos.</p>`;

            document.getElementById('portal-my-packages').innerHTML = parcels.map(parcel => `
                <div class="notice-item" style="border-left-color: ${parcel.status === 'pending' ? 'var(--warning)' : 'var(--success)'}; padding: 10px;">
                    ${parcel.photoDataUrl ? `<img src="${parcel.photoDataUrl}" alt="Encomenda" style="width:100%; max-height:160px; object-fit:cover; border-radius:12px; margin-bottom:10px; border:1px solid var(--surface-border);">` : ''}
                    <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
                        <b style="font-size:0.85rem">${parcel.carrier || 'Encomenda recebida'}</b>
                        <span class="badge" style="position:static; width:auto; height:auto; border-radius:999px; padding:4px 10px; background:${parcel.status === 'pending' ? 'rgba(245,158,11,0.18)' : 'rgba(34,197,94,0.18)'}; color:${parcel.status === 'pending' ? 'var(--warning)' : 'var(--success)'};">
                            ${parcel.status === 'pending' ? 'Aguardando retirada' : 'Já entregue'}
                        </span>
                    </div>
                    <div style="font-size:0.82rem; color:#ddd; margin-top:8px;">
                        <div>Recebida em ${parcel.receivedAtLabel}</div>
                        ${parcel.trackingCode ? `<div>Referência: ${parcel.trackingCode}</div>` : ''}
                        ${parcel.notes ? `<div>Obs.: ${parcel.notes}</div>` : ''}
                        ${parcel.status === 'delivered' ? `<div>Retirada registrada em ${parcel.deliveredAtLabel || '-'}</div>` : ''}
                    </div>
                </div>
            `).join('') || `<p style="font-size:0.85rem; color:#888;">Nenhuma encomenda vinculada no momento.</p>`;

        } catch (e) {
            console.error(e);
        }
    });

    document.getElementById('btn-portal-open-call')?.addEventListener('click', async () => {
        const id = document.getElementById('sim-resident-select').value;
        if (!id) return alert("Selecione um morador no simulador primeiro.");

        const result = await openFormModal({
            title: 'Abrir Chamado',
            submitLabel: 'Enviar',
            fields: [
                { name: 'title', label: 'Descrição do problema', type: 'textarea', required: true },
                { name: 'urgency', label: 'Urgência', type: 'select', value: 'Normal', options: [{ value: 'Normal', label: 'Normal' }, { value: 'Alta', label: 'Urgente' }] }
            ]
        });
        if (!result?.title) return;
        const title = result.title.trim();
        const urgency = result.urgency || 'Normal';

        try {
            const me = await API.getResidentData(id);
            // Assinatura correta: addMaintenance(title, urgency, desc, location)
            await API.addMaintenance(title, urgency, "", me.unitDisplay);
            alert("✅ Chamado aberto com sucesso! O síndico foi notificado.");
            // Refresh portal e dashboard
            document.getElementById('sim-resident-select').dispatchEvent(new Event('change'));
            loadDashboardStats();
            loadMaintenance();
        } catch (err) {
            console.error("Erro ao abrir chamado:", err);
            alert("Erro ao registrar chamado. Tente novamente.");
        }
    });

    function validateVehicleData(vehicleData) {
        const type = (vehicleData.type || '').toLowerCase();
        if (!['carro', 'moto', 'autopropelido'].includes(type)) {
            return 'Tipo inválido. Use Carro, Moto ou Autopropelido.';
        }
        if (!vehicleData.brandModel || !vehicleData.brandModel.trim()) {
            return 'Marca e modelo são obrigatórios.';
        }
        const plateRequired = type === 'carro' || type === 'moto';
        if (plateRequired && (!vehicleData.plate || !vehicleData.plate.trim())) {
            return 'Placa é obrigatória para Carro ou Moto.';
        }
        return '';
    }

    async function populateVehicleResidentSelect(preferredId = '') {
        const select = document.getElementById('vehicle-resident-select');
        if (!select) return;
        const previous = preferredId || select.value || '';
        select.innerHTML = '<option value="">Selecione um morador...</option>' +
            currentResidents.map(r => `<option value="${r.id}">${r.name} (${r.unitDisplay})</option>`).join('');
        const hasPrevious = previous && currentResidents.some(r => r.id === previous);
        select.value = hasPrevious ? previous : '';
        currentVehicleResidentId = select.value;
        const addVehicleBtn = document.getElementById('btn-add-vehicle');
        if (addVehicleBtn) addVehicleBtn.disabled = !select.value;
    }

    function renderVehiclesTable(vehicles) {
        const tbody = document.getElementById('vehicles-tbody');
        if (!tbody) return;
        if (!currentVehicleResidentId) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">Selecione um morador para gerenciar os veículos.</td></tr>';
            return;
        }
        if (!vehicles.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">Nenhum veículo cadastrado para este morador.</td></tr>';
            return;
        }

        tbody.innerHTML = vehicles.map(v => `
            <tr>
                <td>${v.type}</td>
                <td>${v.brandModel}</td>
                <td>${v.color || '-'}</td>
                <td>${v.plate || '-'}</td>
                <td>${v.tag || '-'}</td>
                <td>
                    <button class="btn btn-outline btn-edit-vehicle" data-id="${v.id}" style="padding:4px 8px;"><i data-lucide="edit" style="width:14px;"></i></button>
                    <button class="btn btn-outline btn-del-vehicle" data-id="${v.id}" style="padding:4px 8px; color: var(--danger); border-color: rgba(239, 68, 68, 0.3);"><i data-lucide="trash-2" style="width:14px;"></i></button>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();

        document.querySelectorAll('.btn-edit-vehicle').forEach(btn => btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const vehicle = currentVehicles.find(v => v.id === id);
            if (!vehicle) return;
            openVehicleModal('edit', vehicle);
        }));

        document.querySelectorAll('.btn-del-vehicle').forEach(btn => btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (!confirm('Deseja remover este veículo?')) return;
            await API.deleteVehicle(id);
            await loadVehiclesByResident(currentVehicleResidentId);
            await loadResidents();
        }));
    }

    async function loadVehiclesByResident(residentId) {
        const tbody = document.getElementById('vehicles-tbody');
        if (!tbody) return;
        if (!residentId) {
            currentVehicles = [];
            renderVehiclesTable([]);
            return;
        }
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carregando veículos...</td></tr>';
        currentVehicles = await API.getVehiclesByResident(residentId);
        renderVehiclesTable(currentVehicles);
    }

    document.getElementById('vehicle-resident-select')?.addEventListener('change', async (e) => {
        currentVehicleResidentId = e.target.value || '';
        const addVehicleBtn = document.getElementById('btn-add-vehicle');
        if (addVehicleBtn) addVehicleBtn.disabled = !currentVehicleResidentId;
        await loadVehiclesByResident(currentVehicleResidentId);
    });

    document.getElementById('btn-add-vehicle')?.addEventListener('click', async () => {
        if (!currentVehicleResidentId) return alert('Selecione um morador.');
        if (currentVehicles.length >= 3) return alert('Limite atingido: cada morador pode cadastrar até 3 veículos.');
        openVehicleModal('create');
    });

    const editResidentModal = document.getElementById('edit-resident-modal');
    const editResidentName = document.getElementById('edit-res-name');
    const editResidentPhone = document.getElementById('edit-res-phone');
    const editResidentUnit = document.getElementById('edit-res-unit-id');

    async function openEditResidentModal(resident) {
        editingResidentId = resident.id;
        editResidentName.value = resident.name || '';
        editResidentPhone.value = resident.phone || '';
        editResidentUnit.innerHTML = '<option value="">Carregando...</option>';
        editResidentModal.style.display = 'flex';

        const units = await API.getUnits();
        editResidentUnit.innerHTML = '<option value="">Selecione a Unidade associada...</option>' +
            units.map(u => `<option value="${u.id}">${u.blockName} - ${u.number}</option>`).join('');
        editResidentUnit.value = resident.unitId || '';
    }

    function closeEditResidentModal() {
        editingResidentId = '';
        editResidentModal.style.display = 'none';
    }

    document.getElementById('cancel-edit-resident')?.addEventListener('click', closeEditResidentModal);
    editResidentModal?.addEventListener('click', (e) => {
        if (e.target === editResidentModal) closeEditResidentModal();
    });

    document.getElementById('save-edit-resident')?.addEventListener('click', async () => {
        if (!editingResidentId) return;
        const name = editResidentName.value.trim();
        const phone = editResidentPhone.value.trim();
        const unitId = editResidentUnit.value;
        if (!name || !unitId) return alert('Nome e Unidade são campos obrigatórios.');

        await API.updateResident(editingResidentId, { name, phone, unitId });
        closeEditResidentModal();
        await loadResidents();
        loadDashboardStats();
    });

    const vehicleModal = document.getElementById('vehicle-modal');
    const vehicleModalTitle = document.getElementById('vehicle-modal-title');
    const vehicleTypeInput = document.getElementById('vehicle-type');
    const vehicleBrandModelInput = document.getElementById('vehicle-brand-model');
    const vehicleColorInput = document.getElementById('vehicle-color');
    const vehiclePlateInput = document.getElementById('vehicle-plate');
    const vehicleTagInput = document.getElementById('vehicle-tag');

    function openVehicleModal(mode = 'create', vehicle = null) {
        editingVehicleId = mode === 'edit' && vehicle ? vehicle.id : '';
        vehicleModalTitle.textContent = mode === 'edit' ? 'Editar Veículo' : 'Novo Veículo';
        vehicleTypeInput.value = vehicle?.type || 'Carro';
        vehicleBrandModelInput.value = vehicle?.brandModel || '';
        vehicleColorInput.value = vehicle?.color || '';
        vehiclePlateInput.value = vehicle?.plate || '';
        vehicleTagInput.value = vehicle?.tag || '';
        vehicleModal.style.display = 'flex';
    }

    function closeVehicleModal() {
        editingVehicleId = '';
        vehicleModal.style.display = 'none';
    }

    document.getElementById('cancel-vehicle-modal')?.addEventListener('click', closeVehicleModal);
    vehicleModal?.addEventListener('click', (e) => {
        if (e.target === vehicleModal) closeVehicleModal();
    });

    document.getElementById('save-vehicle-modal')?.addEventListener('click', async () => {
        if (!currentVehicleResidentId) return alert('Selecione um morador.');
        const payload = {
            residentId: currentVehicleResidentId,
            type: vehicleTypeInput.value.trim(),
            brandModel: vehicleBrandModelInput.value.trim(),
            color: vehicleColorInput.value.trim(),
            plate: vehiclePlateInput.value.trim().toUpperCase(),
            tag: vehicleTagInput.value.trim()
        };
        const validationError = validateVehicleData(payload);
        if (validationError) return alert(validationError);

        if (editingVehicleId) {
            await API.updateVehicle(editingVehicleId, payload);
        } else {
            if (currentVehicles.length >= 3) return alert('Limite atingido: cada morador pode cadastrar até 3 veículos.');
            await API.addVehicle(payload);
        }

        closeVehicleModal();
        await loadVehiclesByResident(currentVehicleResidentId);
        await loadResidents();
    });

    function clearForm() {
        document.getElementById('res-name').value = '';
        selectUnit.value = '';
        document.getElementById('res-phone').value = '';
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
            const displayUsers = users.filter(u => u.username !== 'admin');
            const tbody = document.getElementById('users-tbody');
            if (tbody) {
                tbody.innerHTML = displayUsers.map(u => `
                    <tr>
                        <td><b>${u.name}</b></td>
                        <td><code>${u.username}</code></td>
                        <td><span style="display:inline-flex; align-items:center; border-radius:999px; padding:4px 10px; font-size:0.75rem; background:rgba(139, 92, 246, 0.1); color:var(--primary);">${u.role}</span></td>
                        <td style="font-size:0.8rem; color:var(--text-muted);">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                            <button class="btn btn-outline btn-edit-user" data-id="${u.id}" data-name="${u.name}" data-username="${u.username}" data-role="${u.role || 'Operador'}" style="padding:4px 8px;"><i data-lucide="edit" style="width:14px;"></i></button>
                            <button class="btn btn-outline btn-del-user" data-id="${u.id}" style="color:var(--danger);"><i data-lucide="trash-2" style="width:14px;"></i></button>
                        </td>
                    </tr>
                `).join('');

                lucide.createIcons();
                document.querySelectorAll('.btn-edit-user').forEach(btn => btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const oldName = e.currentTarget.getAttribute('data-name') || '';
                    const oldUsername = e.currentTarget.getAttribute('data-username') || '';
                    const oldRole = e.currentTarget.getAttribute('data-role') || 'Operador';
                    const result = await openFormModal({
                        title: 'Editar Usuário',
                        submitLabel: 'Salvar',
                        fields: [
                            { name: 'name', label: 'Nome completo', type: 'text', value: oldName, required: true },
                            { name: 'username', label: 'Usuário (login)', type: 'text', value: oldUsername, required: true },
                            { name: 'role', label: 'Cargo', type: 'select', value: oldRole, required: true, options: USER_ROLE_OPTIONS },
                            { name: 'password', label: 'Nova senha (opcional)', type: 'password', value: '' }
                        ]
                    });
                    if (!result) return;

                    const payload = {
                        name: result.name.trim(),
                        username: result.username.trim().toLowerCase(),
                        role: result.role.trim() || 'Operador'
                    };
                    if (result.password && result.password.trim()) payload.password = result.password.trim();

                    await API.updateUserProfile(id, payload);
                    loadUsers();
                }));
                document.querySelectorAll('.btn-del-user').forEach(btn => btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    if (confirm("Deseja remover este usuário?")) {
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
        const result = await openFormModal({
            title: 'Novo Usuário',
            submitLabel: 'Criar',
            fields: [
                { name: 'name', label: 'Nome completo', type: 'text', required: true },
                { name: 'username', label: 'Usuário (login)', type: 'text', required: true },
                { name: 'password', label: 'Senha', type: 'password', required: true },
                { name: 'role', label: 'Cargo', type: 'select', value: 'Operador', required: true, options: USER_ROLE_OPTIONS }
            ]
        });
        if (!result) return;

        await API.addUser({
            name: result.name.trim(),
            username: result.username.trim().toLowerCase(),
            password: result.password,
            role: result.role.trim() || 'Operador'
        });
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
            const parcels = await API.getParcels();
            const readIds = JSON.parse(localStorage.getItem('condo_read_notifs') || '[]');

            // Combine and format
            let allNotifs = [
                ...notices.map(n => ({ id: `notice_${n.id}`, title: n.title, text: n.content, date: n.date, icon: 'info', color: 'purple', target: 'dashboard' })),
                ...maintenance.filter(m => m.status === 'open').map(m => ({ id: `maint_${m.id}`, title: 'Chamado Aberto', text: `${m.title} na ${m.location}`, date: m.displayDate, icon: 'alert-circle', color: 'orange', target: 'maintenance' })),
                ...parcels.filter(p => p.status === 'pending').map(p => ({ id: `parcel_${p.id}`, title: 'Encomenda aguardando retirada', text: `${p.residentName} • ${p.unitDisplay}`, date: p.receivedAtLabel, icon: 'package', color: 'orange', target: 'packages' }))
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
        const parcels = await API.getParcels();
        const readIds = JSON.parse(localStorage.getItem('condo_read_notifs') || '[]');

        const currentIds = [
            ...notices.map(n => `notice_${n.id}`),
            ...maintenance.map(m => `maint_${m.id}`),
            ...parcels.map(p => `parcel_${p.id}`)
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
