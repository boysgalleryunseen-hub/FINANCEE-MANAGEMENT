(function (window) {
	'use strict';
	const Notifications = {
		async ensurePermission() {
			if (!('Notification' in window)) return false;
			if (Notification.permission === 'granted') return true;
			if (Notification.permission !== 'denied') {
				const res = await Notification.requestPermission();
				return res === 'granted';
			}
			return false;
		},
		async notify(title, body) {
			if (!('Notification' in window)) return;
			if (Notification.permission !== 'granted') return;
			new Notification(title, { body });
			// optional sound
			try {
				const audioEl = document.getElementById('alert-audio');
				if (audioEl) { audioEl.currentTime = 0; await audioEl.play(); }
			} catch (_) {}
		},
		async scheduleDueAlerts(loans) {
			const settings = Storage.getSettings();
			const alertDays = Number(settings.alertDays || 3);
			const today = new Date();
			for (const loan of loans) {
				const due = new Date(loan.dueDate);
				const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
				if (diffDays < 0) {
					await this.notify('Loan Overdue', `${loan.customerName} is overdue by ${Math.abs(diffDays)} day(s).`);
				} else if (diffDays <= alertDays) {
					await this.notify('Loan Due Soon', `${loan.customerName} is due in ${diffDays} day(s).`);
				}
			}
		}
	};
	window.Notifications = Notifications;
})(window);


