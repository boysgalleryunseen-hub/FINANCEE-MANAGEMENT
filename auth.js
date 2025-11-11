(function (window) {
	'use strict';
	const Auth = {
		ensureDefaultAdmin() {
			const users = Storage.getUsers();
			if (users.length === 0) {
				// default admin: admin / 1234 (ask to change)
				Utils.sha256Hex('1234').then(pinHash => {
					const admin = Models.makeUser({ name: 'Admin', pinHash, role: 'admin' });
					users.push(admin);
					Storage.setUsers(users);
					console.info('Created default Admin user with PIN 1234. Please change.');
				});
			}
		},
		async login(name, pin) {
			const users = Storage.getUsers();
			const u = users.find(x => x.name.toLowerCase() === String(name || '').trim().toLowerCase());
			if (!u) return null;
			const hash = await Utils.sha256Hex(String(pin || '').trim());
			if (hash !== u.pinHash) return null;
			const session = { userId: u.id, name: u.name, role: u.role, loginAt: Utils.nowIso() };
			Storage.setSession(session);
			return session;
		},
		logout() { Storage.clearSession(); },
		current() { return Storage.getSession(); },
		isAdmin() { const s = Storage.getSession(); return s && s.role === 'admin'; },
		upsertUser: async function (name, pin, role) {
			const users = Storage.getUsers();
			const existing = users.find(u => u.name.toLowerCase() === name.toLowerCase());
			const pinHash = await Utils.sha256Hex(pin);
			if (existing) {
				existing.pinHash = pinHash;
				existing.role = role;
			} else {
				users.push(Models.makeUser({ name, pinHash, role }));
			}
			Storage.setUsers(users);
			return users;
		},
		removeUser(id) {
			const users = Storage.getUsers().filter(u => u.id !== id);
			Storage.setUsers(users);
			return users;
		}
	};
	window.Auth = Auth;
})(window);


