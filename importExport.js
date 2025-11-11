(function (window) {
	'use strict';
	const ImportExport = {
		exportJSON() {
			const data = {
				schema: 1,
				exportedAt: Utils.nowIso(),
				users: Storage.getUsers(),
				settings: Storage.getSettings(),
				loans: Storage.getLoans(),
				payments: Storage.getPayments(),
			};
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
			saveAs(blob, `finance_backup_${Date.now()}.json`);
		},
		exportCSV() {
			const loans = Storage.getLoans();
			const payments = Storage.getPayments();
			const flat = [];
			for (const loan of loans) {
				const ps = payments.filter(p => p.loanId === loan.id);
				if (ps.length === 0) {
					flat.push({
						loanId: loan.id,
						customerName: loan.customerName,
						principalAmount: loan.principalAmount,
						interestPct: loan.interestPct,
						documents: loan.documents,
						givenByName: loan.givenByName,
						givenByUserId: loan.givenByUserId,
						createdAt: loan.createdAt,
						dueDate: loan.dueDate,
						paymentId: '',
						paymentAmount: '',
						paymentDate: '',
					});
				} else {
					for (const p of ps) {
						flat.push({
							loanId: loan.id,
							customerName: loan.customerName,
							principalAmount: loan.principalAmount,
							interestPct: loan.interestPct,
							documents: loan.documents,
							givenByName: loan.givenByName,
							givenByUserId: loan.givenByUserId,
							createdAt: loan.createdAt,
							dueDate: loan.dueDate,
							paymentId: p.id,
							paymentAmount: p.amount,
							paymentDate: p.date,
						});
					}
				}
			}
			const csv = Papa.unparse(flat);
			const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
			saveAs(blob, `finance_export_${Date.now()}.csv`);
		},
		exportLoanJSON(loanId) {
			const loans = Storage.getLoans();
			const payments = Storage.getPayments();
			const loan = loans.find(l => l.id === loanId);
			if (!loan) return;
			const ps = payments.filter(p => p.loanId === loan.id);
			const data = { loan, payments: ps, exportedAt: Utils.nowIso(), schema: 1 };
			const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
			const name = loan.customerName?.replace(/\s+/g, '_') || 'customer';
			saveAs(blob, `finance_${name}_${loan.id}.json`);
		},
		exportLoanCSV(loanId) {
			const loans = Storage.getLoans();
			const payments = Storage.getPayments();
			const loan = loans.find(l => l.id === loanId);
			if (!loan) return;
			const ps = payments.filter(p => p.loanId === loan.id);
			const rows = (ps.length ? ps : [null]).map(p => ({
				loanId: loan.id,
				customerName: loan.customerName,
				principalAmount: loan.principalAmount,
				interestPct: loan.interestPct,
				documents: loan.documents,
				givenByName: loan.givenByName,
				givenByUserId: loan.givenByUserId,
				createdAt: loan.createdAt,
				dueDate: loan.dueDate,
				totalPaid: loan.totals?.totalPaid ?? '',
				remaining: loan.totals?.remaining ?? '',
				paymentId: p ? p.id : '',
				paymentAmount: p ? p.amount : '',
				paymentDate: p ? p.date : '',
			}));
			const csv = Papa.unparse(rows);
			const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
			const name = loan.customerName?.replace(/\s+/g, '_') || 'customer';
			saveAs(blob, `finance_${name}_${loan.id}.csv`);
		},
		importJSON(text, mode) {
			try {
				const data = JSON.parse(text);
				if (!Array.isArray(data.loans) || !Array.isArray(data.payments)) throw new Error('Invalid JSON file');
				if (mode === 'replace') {
					Storage.setLoans(data.loans || []);
					Storage.setPayments(data.payments || []);
					if (data.settings) Storage.setSettings(Object.assign(Storage.getSettings(), data.settings));
					if (Array.isArray(data.users)) Storage.setUsers(data.users);
				} else {
					// merge
					const loans = Storage.getLoans();
					const payments = Storage.getPayments();
					Storage.setLoans(loans.concat(data.loans || []));
					Storage.setPayments(payments.concat(data.payments || []));
				}
				return true;
			} catch (e) {
				console.error(e);
				return false;
			}
		},
		importCSV(csvText) {
			const res = Papa.parse(csvText, { header: true, skipEmptyLines: true });
			if (res.errors && res.errors.length) {
				console.error(res.errors);
				return false;
			}
			const rows = res.data || [];
			const loans = Storage.getLoans();
			const payments = Storage.getPayments();
			const loanMap = new Map(loans.map(l => [l.id, l]));
			for (const r of rows) {
				if (!loanMap.has(r.loanId)) {
					loanMap.set(r.loanId, {
						id: r.loanId || Utils.genId('loan'),
						customerName: r.customerName,
						principalAmount: Number(r.principalAmount || 0),
						interestPct: Number(r.interestPct || 0),
						documents: r.documents || '',
						givenByName: r.givenByName || '',
						givenByUserId: r.givenByUserId || '',
						createdAt: r.createdAt || Utils.nowIso(),
						dueDate: r.dueDate || Utils.nowIso(),
						status: 'active',
						totals: { totalPaid: 0, remaining: Number(r.principalAmount || 0) },
					});
				}
				if (r.paymentId && r.paymentAmount) {
					payments.push({
						id: r.paymentId || Utils.genId('payment'),
						loanId: r.loanId,
						amount: Number(r.paymentAmount),
						date: r.paymentDate || Utils.nowIso(),
						createdAt: Utils.nowIso(),
					});
				}
			}
			Storage.setLoans(Array.from(loanMap.values()));
			Storage.setPayments(payments);
			return true;
		},
		backupWeeklyIfEnabled() {
			const s = Storage.getSettings();
			if (!s.autoBackupWeekly) return;
			const snapshot = {
				exportedAt: Utils.nowIso(),
				users: Storage.getUsers(),
				settings: Storage.getSettings(),
				loans: Storage.getLoans(),
				payments: Storage.getPayments(),
			};
			Storage.addBackup(snapshot);
		}
	};
	window.ImportExport = ImportExport;
})(window);


