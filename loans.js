(function (window) {
	'use strict';
	let currentSort = { key: 'createdAt', dir: 'desc' };
	let searchQuery = '';

	function computeStatus(loan) {
		const alertDays = Number(Storage.getSettings().alertDays || 3);
		const due = new Date(loan.dueDate);
		const today = new Date();
		const inDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
		if (inDays < 0) return 'overdue';
		if (inDays <= alertDays) return 'due-soon';
		return 'active';
	}

	function applyStatusColor(tr, status) {
		tr.classList.remove('status-active', 'status-due-soon', 'status-overdue');
		if (status === 'active') tr.classList.add('status-active');
		if (status === 'due-soon') tr.classList.add('status-due-soon');
		if (status === 'overdue') tr.classList.add('status-overdue');
	}

	function scopeLoans(loans) {
		const session = Storage.getSession();
		const scopeSelect = document.getElementById('filterScope');
		const wantAll = scopeSelect && scopeSelect.value === 'all';
		if (session && (session.role === 'admin' || wantAll)) return loans;
		if (!session) return [];
		return loans.filter(l => l.givenByUserId === session.userId);
	}

	function filteredAndSorted(loans) {
		const q = searchQuery.toLowerCase();
		let arr = scopeLoans(loans).filter(l => {
			if (!q) return true;
			return (l.customerName || '').toLowerCase().includes(q)
				|| (l.documents || '').toLowerCase().includes(q)
				|| (l.givenByName || '').toLowerCase().includes(q);
		});
		arr.forEach(l => l.status = computeStatus(l));
		arr.sort((a, b) => {
			const dir = currentSort.dir === 'asc' ? 1 : -1;
			const ka = a[currentSort.key];
			const kb = b[currentSort.key];
			if (ka < kb) return -1 * dir;
			if (ka > kb) return 1 * dir;
			return 0;
		});
		return arr;
	}

function computePlan(principal, ratePct, docPct, months) {
	const interestPerMonth = Number(principal) * (Number(ratePct) / 100);
	const totalInterest = interestPerMonth * Number(months);
	const documentChargeAmount = Number(principal) * (Number(docPct) / 100);
	const totalPayable = Number(principal) + totalInterest + documentChargeAmount;
	return { interestPerMonth, totalInterest, documentChargeAmount, totalPayable };
}

function renderRow(l) {
		const tr = document.createElement('tr');
		applyStatusColor(tr, l.status);
		const statusPillClass = l.status === 'active' ? 'pill-active' : (l.status === 'due-soon' ? 'pill-due-soon' : 'pill-overdue');
	const months = l.numberOfMonths || 10;
	const docPct = l.documentChargePct ?? 5;
	const { interestPerMonth, totalInterest, documentChargeAmount } = computePlan(l.principalAmount || 0, l.interestPct || 0, docPct, months);
		const currentMonthKey = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2,'0');
	const monthPaid = Storage.getPayments().some(p => p.loanId === l.id && p.month === currentMonthKey && p.is_paid);
	const pendingMonthly = monthPaid ? 0 : interestPerMonth;
		const statusText = monthPaid ? 'Paid' : 'Pending';
		tr.innerHTML = `
			<td>${l.customerName}</td>
			<td>${Utils.formatMoney(l.principalAmount)}</td>
			<td>${l.interestPct}</td>
		<td>${Utils.formatMoney(interestPerMonth)}</td>
		<td>${Utils.formatMoney(totalInterest)}</td>
		<td>${Utils.formatMoney(documentChargeAmount)}</td>
			<td>${Utils.formatMoney(pendingMonthly)}</td>
		<td>${months}</td>
			<td><span class="status-pill ${statusPillClass}">${statusText}</span></td>
			<td>
				<button class="btn small" data-action="payments" data-id="${l.id}">Payments</button>
				<button class="btn small secondary" data-action="edit" data-id="${l.id}">Edit</button>
				<button class="btn small secondary" data-action="download" data-id="${l.id}">Download</button>
				<button class="btn small secondary" data-action="delete" data-id="${l.id}">Delete</button>
			</td>
		`;
		return tr;
	}

	const Loans = {
	openAddModal() {
			const s = Storage.getSettings();
			document.getElementById('loanModalTitle').textContent = 'Add Loan';
			document.getElementById('loanCustomerInput').value = '';
			document.getElementById('loanPhoneInput').value = '';
			document.getElementById('loanAmountInput').value = '';
			document.getElementById('loanInterestInput').value = s.defaultInterestPct || 0;
		document.getElementById('loanDocChargeInput').value = 5;
		document.getElementById('loanMonthsInput').value = 10;
			document.getElementById('loanDueDateInput').value = Utils.toDateInputValue(new Date());
			document.getElementById('loanDocsInput').value = '';
			document.getElementById('loanModal').dataset.editId = '';
			document.getElementById('loanModal').classList.remove('hidden');
		this.updateCalcPreview();
		},
	openEditModal(id) {
			const loans = Storage.getLoans();
			const l = loans.find(x => x.id === id);
			if (!l) return;
			document.getElementById('loanModalTitle').textContent = 'Edit Loan';
			document.getElementById('loanCustomerInput').value = l.customerName;
			document.getElementById('loanPhoneInput').value = l.phoneNumber || '';
			document.getElementById('loanAmountInput').value = l.principalAmount;
			document.getElementById('loanInterestInput').value = l.interestPct;
		document.getElementById('loanDocChargeInput').value = l.documentChargePct ?? 5;
		document.getElementById('loanMonthsInput').value = l.numberOfMonths ?? 10;
			document.getElementById('loanDueDateInput').value = Utils.toDateInputValue(l.dueDate);
			document.getElementById('loanDocsInput').value = l.documents || '';
			document.getElementById('loanModal').dataset.editId = l.id;
			document.getElementById('loanModal').classList.remove('hidden');
		this.updateCalcPreview();
		},
	updateCalcPreview() {
		const principal = Number(document.getElementById('loanAmountInput').value || 0);
		const rate = Number(document.getElementById('loanInterestInput').value || 0);
		const doc = Number(document.getElementById('loanDocChargeInput').value || 0);
		const months = Number(document.getElementById('loanMonthsInput').value || 0);
		const calc = computePlan(principal, rate, doc, months);
		const el = document.getElementById('loanCalcSummary');
		if (el) el.textContent = `Interest/Month: ${Utils.formatMoney(calc.interestPerMonth)} | Total Interest: ${Utils.formatMoney(calc.totalInterest)} | Document Charge: ${Utils.formatMoney(calc.documentChargeAmount)} | Total Payable: ${Utils.formatMoney(calc.totalPayable)}`;
	},
		saveFromModal() {
			const customerName = document.getElementById('loanCustomerInput').value.trim();
			const phoneNumber = document.getElementById('loanPhoneInput').value.trim();
			const principalAmount = Number(document.getElementById('loanAmountInput').value || 0);
			const interestPct = Number(document.getElementById('loanInterestInput').value || 0);
		const documentChargePct = Number(document.getElementById('loanDocChargeInput').value || 0);
		const numberOfMonths = Number(document.getElementById('loanMonthsInput').value || 0);
			const dueDate = Utils.parseDateInput(document.getElementById('loanDueDateInput').value);
			const documents = document.getElementById('loanDocsInput').value.trim();
			if (!customerName || !(principalAmount > 0)) {
				Swal.fire('Please enter valid customer & amount', '', 'warning');
				return;
			}
			const session = Storage.getSession();
			const loans = Storage.getLoans();
			const editId = document.getElementById('loanModal').dataset.editId;
			if (editId) {
				const l = loans.find(x => x.id === editId);
				l.customerName = customerName;
				l.phoneNumber = phoneNumber;
				l.principalAmount = principalAmount;
				l.interestPct = interestPct;
			l.documentChargePct = documentChargePct;
			l.numberOfMonths = numberOfMonths;
			l.calculations = computePlan(principalAmount, interestPct, documentChargePct, numberOfMonths);
				l.dueDate = dueDate;
				l.documents = documents;
				Storage.setLoans(loans);
			} else {
				const loan = Models.makeLoan({
					customerName,
					phoneNumber,
					principalAmount,
					interestPct,
				documentChargePct,
				numberOfMonths,
					documents,
					givenByUserId: session.userId,
					givenByName: session.name,
					dueDate,
				});
				loans.push(loan);
				Storage.setLoans(loans);
			}
			this.closeModal();
			this.renderTable();
			// schedule notifications
			Notifications.scheduleDueAlerts(Storage.getLoans());
		},
		closeModal() {
			document.getElementById('loanModal').classList.add('hidden');
		},
		delete(id) {
			Swal.fire({
				title: 'Delete loan?',
				text: 'This will remove the loan and its payments.',
				icon: 'warning',
				showCancelButton: true
			}).then(res => {
				if (!res.isConfirmed) return;
				const loans = Storage.getLoans().filter(l => l.id !== id);
				const payments = Storage.getPayments().filter(p => p.loanId !== id);
				Storage.setLoans(loans);
				Storage.setPayments(payments);
				this.renderTable();
			});
		},
		renderTable() {
			const loans = Storage.getLoans();
			const arr = filteredAndSorted(loans);
			const tbody = document.getElementById('loansTbody');
			tbody.innerHTML = '';
			for (const l of arr) {
				const tr = renderRow(l);
				tbody.appendChild(tr);
			}
		},
		initEvents() {
			document.getElementById('addLoanBtn').addEventListener('click', () => this.openAddModal());
			document.getElementById('loanSaveBtn').addEventListener('click', () => this.saveFromModal());
			document.querySelectorAll('[data-close-modal]').forEach(btn => {
				btn.addEventListener('click', () => {
					const id = btn.getAttribute('data-close-modal');
					document.getElementById(id).classList.add('hidden');
				});
			});
			document.getElementById('searchInput').addEventListener('input', Utils.debounce((e) => {
				searchQuery = e.target.value || '';
				this.renderTable();
			}, 200));
			document.getElementById('filterScope').addEventListener('change', () => this.renderTable());
			['loanAmountInput','loanInterestInput','loanDocChargeInput','loanMonthsInput'].forEach(id => {
				const el = document.getElementById(id);
				el && el.addEventListener('input', () => this.updateCalcPreview());
			});
			document.getElementById('loansTable').addEventListener('click', (e) => {
				const btn = e.target.closest('button');
				const row = e.target.closest('tr');
				if (!btn && row) {
					// clicking row opens payments
					const id = row.querySelector('button[data-id]')?.getAttribute('data-id');
					if (id) Payments.open(id);
					return;
				}
				if (btn) {
					const id = btn.getAttribute('data-id');
					const action = btn.getAttribute('data-action');
					if (action === 'payments') Payments.open(id);
					if (action === 'edit') this.openEditModal(id);
					if (action === 'delete') this.delete(id);
					if (action === 'download') {
						Payments.downloadHistoryPdf(id);
					}
				}
			});
			document.querySelectorAll('#loansTable thead th[data-sort]').forEach(th => {
				th.addEventListener('click', () => {
					const key = th.getAttribute('data-sort');
					if (currentSort.key === key) currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
					else { currentSort.key = key; currentSort.dir = 'asc'; }
					this.renderTable();
				});
			});
			// Payments modal buttons
			document.getElementById('downloadHistoryPdfBtn').addEventListener('click', () => Payments.downloadHistoryPdf());
			document.getElementById('tabHistoryBtn').addEventListener('click', () => Payments.showTab('history'));
			document.getElementById('tabDocumentsBtn').addEventListener('click', () => {
				Payments.showTab('docs');
				if (window.currentLoanIdForDocs) {
					Payments.renderDocuments(window.currentLoanIdForDocs);
				}
			});
			document.getElementById('uploadDocBtn').addEventListener('click', () => {
				if (window.currentLoanIdForDocs) Payments.uploadDocument(window.currentLoanIdForDocs);
			});
			// Phone number edit handlers
			document.getElementById('docPhoneEditBtn').addEventListener('click', () => {
				const display = document.getElementById('docPhoneDisplay');
				const editBtn = document.getElementById('docPhoneEditBtn');
				const input = document.getElementById('docPhoneInput');
				const save = document.getElementById('docPhoneSaveBtn');
				const cancel = document.getElementById('docPhoneCancelBtn');
				display.style.display = 'none';
				editBtn.style.display = 'none';
				input.style.display = 'inline-block';
				save.style.display = 'inline-block';
				cancel.style.display = 'inline-block';
				input.focus();
			});
			document.getElementById('docPhoneSaveBtn').addEventListener('click', () => {
				const loanId = window.currentLoanIdForDocs;
				if (!loanId) return;
				const newPhone = document.getElementById('docPhoneInput').value.trim();
				const loans = Storage.getLoans();
				const loan = loans.find(l => l.id === loanId);
				if (loan) {
					loan.phoneNumber = newPhone;
					Storage.setLoans(loans);
					Payments.renderDocuments(loanId);
				}
			});
			document.getElementById('docPhoneCancelBtn').addEventListener('click', () => {
				const loanId = window.currentLoanIdForDocs;
				if (loanId) {
					Payments.renderDocuments(loanId);
				} else {
					// Just hide edit mode
					const display = document.getElementById('docPhoneDisplay');
					const editBtn = document.getElementById('docPhoneEditBtn');
					const input = document.getElementById('docPhoneInput');
					const save = document.getElementById('docPhoneSaveBtn');
					const cancel = document.getElementById('docPhoneCancelBtn');
					display.style.display = 'inline';
					editBtn.style.display = 'inline-block';
					input.style.display = 'none';
					save.style.display = 'none';
					cancel.style.display = 'none';
				}
			});
		}
	};
	window.Loans = Loans;
})(window);


