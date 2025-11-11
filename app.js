(function (window) {
	'use strict';
	function showView(id) {
		document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
		document.getElementById(id).classList.remove('hidden');
	}
	function setActiveRoute(route) {
		let id = 'view-loans';
		if (route === 'dashboard') id = 'view-loans';
		if (route === 'loans') id = 'view-loans';
		if (route === 'settings') id = 'view-settings';
		showView(id);
		if (id === 'view-loans') Loans.renderTable();
		if (id === 'view-settings') renderSettingsUI();
	}
	function renderSettingsUI() {
		const s = Storage.getSettings();
		document.getElementById('orgNameInput').value = s.orgName || '';
		document.getElementById('defaultInterestInput').value = s.defaultInterestPct || 0;
		document.getElementById('alertDaysInput').value = s.alertDays || 3;
		document.getElementById('autoBackupCheckbox').checked = !!s.autoBackupWeekly;
		document.getElementById('orgNameHeader').textContent = s.orgName || 'Finance Manager';
		// users
		const users = Storage.getUsers();
		const tbody = document.getElementById('usersTbody');
		tbody.innerHTML = '';
		for (const u of users) {
			const tr = document.createElement('tr');
			tr.innerHTML = `<td>${u.name}</td><td>${u.role}</td>
				<td><button class="btn small secondary" data-remove-user="${u.id}"><i class="fa-solid fa-trash"></i></button></td>`;
			tbody.appendChild(tr);
		}
	}
	function applySessionUI() {
		const s = Storage.getSession();
		const overlay = document.getElementById('loginOverlay');
		if (!s) {
			overlay.classList.remove('hidden');
			showView('view-loans');
			document.getElementById('currentUserLabel').textContent = '';
		} else {
			overlay.classList.add('hidden');
			document.getElementById('currentUserLabel').textContent = `${s.name} (${s.role})`;
		}
	}
	function routeFromHash() {
		const r = (location.hash || '').replace('#', '') || 'loans';
		setActiveRoute(r);
	}

	function attachEvents() {
		document.querySelectorAll('.nav-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				const r = btn.getAttribute('data-route');
				location.hash = r;
			});
		});
		window.addEventListener('hashchange', routeFromHash);
		document.getElementById('toggleThemeBtn').addEventListener('click', () => {
			const s = Storage.getSettings();
			const next = (s.theme === 'light') ? 'dark' : 'light';
			Settings.save({ theme: next });
			Settings.applyTheme(next);
		});
		document.getElementById('logoutBtn').addEventListener('click', () => {
			Auth.logout();
			applySessionUI();
			routeFromHash();
		});
		// Login
		document.getElementById('loginBtn').addEventListener('click', async () => {
			const name = document.getElementById('loginNameInput').value.trim();
			const pin = document.getElementById('loginPinInput').value.trim();
			const sess = await Auth.login(name, pin);
			if (!sess) {
				Swal.fire('Invalid credentials', '', 'error');
				return;
			}
			applySessionUI();
			routeFromHash();
			Notifications.ensurePermission();
		});
		// Settings
		document.getElementById('saveSettingsBtn').addEventListener('click', () => {
			const next = {
				orgName: document.getElementById('orgNameInput').value.trim(),
				defaultInterestPct: Number(document.getElementById('defaultInterestInput').value || 0),
				alertDays: Number(document.getElementById('alertDaysInput').value || 3),
				autoBackupWeekly: document.getElementById('autoBackupCheckbox').checked,
			};
			const s = Settings.save(next);
			document.getElementById('orgNameHeader').textContent = s.orgName || 'Finance Manager';
			Swal.fire('Saved', '', 'success');
		});
		document.getElementById('backupNowBtn').addEventListener('click', () => {
			ImportExport.backupWeeklyIfEnabled();
			Swal.fire('Backup saved locally', '', 'success');
		});
		document.getElementById('addUserBtn').addEventListener('click', async () => {
			const name = document.getElementById('userNameInput').value.trim();
			const pin = document.getElementById('userPinInput').value.trim();
			const role = document.getElementById('userRoleInput').value;
			if (!name || pin.length !== 4) {
				Swal.fire('Enter name and 4-digit PIN', '', 'warning'); return;
			}
			await Auth.upsertUser(name, pin, role);
			renderSettingsUI();
			Swal.fire('User saved', '', 'success');
		});
		document.getElementById('usersTbody').addEventListener('click', (e) => {
			const btn = e.target.closest('[data-remove-user]');
			if (!btn) return;
			const id = btn.getAttribute('data-remove-user');
			Auth.removeUser(id);
			renderSettingsUI();
		});
		// Import/Export
		document.getElementById('exportJsonBtn').addEventListener('click', () => ImportExport.exportJSON());
		document.getElementById('exportCsvBtn').addEventListener('click', () => ImportExport.exportCSV());
		document.getElementById('importFile').addEventListener('change', async (e) => {
			const file = e.target.files?.[0];
			if (!file) return;
			const text = await file.text();
			if (file.name.endsWith('.json')) {
				const { isConfirmed, isDenied } = await Swal.fire({
					title: 'Import JSON',
					text: 'Merge into existing data? Choose No to replace.',
					icon: 'question',
					showDenyButton: true,
					showCancelButton: true,
					confirmButtonText: 'Merge',
					denyButtonText: 'Replace'
				});
				if (!isConfirmed && !isDenied) return;
				const ok = ImportExport.importJSON(text, isDenied ? 'replace' : 'merge');
				ok ? Swal.fire('Imported', '', 'success') : Swal.fire('Import failed', '', 'error');
			} else if (file.name.endsWith('.csv')) {
				const ok = ImportExport.importCSV(text);
				ok ? Swal.fire('Imported', '', 'success') : Swal.fire('Import failed', '', 'error');
			}
			Loans.renderTable();
		});
		document.getElementById('restoreFile').addEventListener('change', async (e) => {
			const file = e.target.files?.[0];
			if (!file) return;
			const text = await file.text();
			const ok = ImportExport.importJSON(text, 'replace');
			ok ? Swal.fire('Restored', '', 'success') : Swal.fire('Restore failed', '', 'error');
			Loans.renderTable();
		});
	}

	function updateOrgHeader() {
		const s = Storage.getSettings();
		document.getElementById('orgNameHeader').textContent = s.orgName || 'Finance Manager';
	}

	function initialSetup() {
		Storage.init();
		Auth.ensureDefaultAdmin();
		const settings = Storage.getSettings();
		Settings.applyTheme(settings.theme || 'dark');
		updateOrgHeader();
		Loans.initEvents();
		Notifications.ensurePermission();
		ImportExport.backupWeeklyIfEnabled();
	}

	window.addEventListener('DOMContentLoaded', () => {
		initialSetup();
		attachEvents();
		applySessionUI();
		routeFromHash();
		// Notification scan at load
		Notifications.scheduleDueAlerts(Storage.getLoans());
	});
})(window);


