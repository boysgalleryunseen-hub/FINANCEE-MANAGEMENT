(function (window) {
	'use strict';
	const NAMESPACE = 'offline-finance';
	const KEYS = {
		users: `${NAMESPACE}:users`,
		settings: `${NAMESPACE}:settings`,
		loans: `${NAMESPACE}:loans`,
		payments: `${NAMESPACE}:payments`,
		documents: `${NAMESPACE}:documents`,
		session: `${NAMESPACE}:session`,
		schema: `${NAMESPACE}:schema`,
		backups: `${NAMESPACE}:backups`,
	};
	const SCHEMA_VERSION = 1;

	function readJson(key, fallback) {
		try {
			const raw = localStorage.getItem(key);
			return raw ? JSON.parse(raw) : fallback;
		} catch (e) {
			console.error('storage read error', key, e);
			return fallback;
		}
	}
	function writeJson(key, value) {
		localStorage.setItem(key, JSON.stringify(value));
	}

	const Storage = {
		KEYS,
		init() {
			const v = readJson(KEYS.schema, 0);
			if (v < SCHEMA_VERSION) {
				// migrations placeholder
				writeJson(KEYS.schema, SCHEMA_VERSION);
			}
		},
		getUsers() { return readJson(KEYS.users, []); },
		setUsers(users) { writeJson(KEYS.users, users); },
		getSettings() {
			return readJson(KEYS.settings, {
				orgName: 'Finance Manager',
				defaultInterestPct: 0,
				alertDays: 3,
				theme: 'dark',
				autoBackupWeekly: false,
			});
		},
		setSettings(s) { writeJson(KEYS.settings, s); },
		getLoans() { return readJson(KEYS.loans, []); },
		setLoans(loans) { writeJson(KEYS.loans, loans); },
		getPayments() { return readJson(KEYS.payments, []); },
		setPayments(payments) { writeJson(KEYS.payments, payments); },
		getDocuments() { return readJson(KEYS.documents, []); },
		setDocuments(documents) { writeJson(KEYS.documents, documents); },
		getSession() { return readJson(KEYS.session, null); },
		setSession(sess) { writeJson(KEYS.session, sess); },
		clearSession() { localStorage.removeItem(KEYS.session); },
		addBackup(blob) {
			const backups = readJson(KEYS.backups, []);
			backups.push({ id: Utils.genId('backup'), createdAt: Utils.nowIso(), blob });
			writeJson(KEYS.backups, backups);
		},
		getBackups() { return readJson(KEYS.backups, []); },
	};
	window.Storage = Storage;
})(window);


