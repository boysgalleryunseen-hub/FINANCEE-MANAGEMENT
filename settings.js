(function (window) {
	'use strict';
	const Settings = {
		get() { return Storage.getSettings(); },
		save(next) {
			const s = Object.assign({}, Storage.getSettings(), next);
			Storage.setSettings(s);
			return s;
		},
		applyTheme(theme) {
			const t = theme || Storage.getSettings().theme || 'dark';
			if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
			else document.documentElement.removeAttribute('data-theme');
		},
	};
	window.Settings = Settings;
})(window);


