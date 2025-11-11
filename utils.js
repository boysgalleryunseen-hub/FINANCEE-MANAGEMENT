/* Utils: ids, dates, currency, hashing, debounce */
(function (window) {
	'use strict';
	const Utils = {
		nowIso() { return new Date().toISOString(); },
		formatDDMMYYYY(date) {
			const d = new Date(date);
			const dd = String(d.getDate()).padStart(2, '0');
			const mm = String(d.getMonth() + 1).padStart(2, '0');
			const yyyy = d.getFullYear();
			return `${dd}/${mm}/${yyyy}`;
		},
		toDateInputValue(date) {
			const d = new Date(date);
			const yyyy = d.getFullYear();
			const mm = String(d.getMonth() + 1).padStart(2, '0');
			const dd = String(d.getDate()).padStart(2, '0');
			return `${yyyy}-${mm}-${dd}`;
		},
		parseDateInput(value) {
			return new Date(value).toISOString();
		},
		formatDate(date) {
			const d = new Date(date);
			return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		},
		formatShortDate(date) {
			const d = new Date(date);
			return d.toLocaleDateString();
		},
		formatMoney(n) {
			const num = Number(n || 0);
			return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(num);
		},
		genId(prefix) {
			return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
		},
		debounce(fn, delay) {
			let t;
			return (...args) => {
				clearTimeout(t);
				t = setTimeout(() => fn(...args), delay);
			};
		},
		async sha256Hex(str) {
			const enc = new TextEncoder();
			const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
			return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
		},
	};
	window.Utils = Utils;
})(window);


