(function (window) {
	'use strict';
	let currentLoanId = null;

	function monthKey(d) {
		const dt = new Date(d);
		return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
	}
	function monthsBetween(startIso, endIso) {
		const start = new Date(startIso);
		const end = new Date(endIso);
		const out = [];
		const cur = new Date(start.getFullYear(), start.getMonth(), 1);
		const stop = new Date(end.getFullYear(), end.getMonth(), 1);
		while (cur <= stop) {
			out.push(cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0'));
			cur.setMonth(cur.getMonth() + 1);
		}
		return out;
	}
	function monthsFromStart(startIso, count) {
		const start = new Date(startIso);
		const out = [];
		const cur = new Date(start.getFullYear(), start.getMonth(), 1);
		for (let i = 0; i < Number(count || 0); i++) {
			out.push(cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0'));
			cur.setMonth(cur.getMonth() + 1);
		}
		return out;
	}

	function renderPayments(loan) {
		const payments = Storage.getPayments().filter(p => p.loanId === loan.id);
		const monthlyInterest = (Number(loan.principalAmount || 0) * Number(loan.interestPct || 0)) / 100;
		const months = monthsFromStart(loan.createdAt, loan.numberOfMonths || 10);
		const tbody = document.getElementById('paymentsTbody');
		tbody.innerHTML = '';
		let totalPaid = 0, paidCount = 0;
		for (const m of months) {
			const rec = payments.find(p => p.month === m);
			const isPaid = !!(rec && rec.is_paid);
			if (isPaid) { totalPaid += Number(rec.interest_amt || 0); paidCount += 1; }
			const remaining = Math.max(0, monthlyInterest - (isPaid ? Number(rec.interest_amt || 0) : 0));
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>${m}</td>
				<td>${Utils.formatMoney(monthlyInterest)}</td>
				<td>${isPaid ? 'Yes' : 'No'}</td>
				<td>${isPaid ? Utils.formatDDMMYYYY(rec.paid_date) : '-'}</td>
				<td>${Utils.formatMoney(remaining)}</td>
				<td>${isPaid ? '' : `<button class="btn small" data-pay-month="${m}">Pay Now</button>`}</td>
			`;
			tbody.appendChild(tr);
		}
		document.getElementById('paymentsSummary').textContent =
			`Monthly Interest: ${Utils.formatMoney(monthlyInterest)} | Total Months: ${months.length} | Paid Months: ${paidCount} | Pending Months: ${months.length - paidCount} | Total Interest: ${Utils.formatMoney(months.length * monthlyInterest)} | Total Paid: ${Utils.formatMoney(totalPaid)} | Pending: ${Utils.formatMoney(months.length * monthlyInterest - totalPaid)} | Doc Charge: ${Utils.formatMoney((loan.principalAmount||0) * (Number(loan.documentChargePct||0)/100))}`;
		tbody.querySelectorAll('[data-pay-month]').forEach(btn => {
			btn.addEventListener('click', () => Payments.payMonth(loan.id, btn.getAttribute('data-pay-month'), monthlyInterest));
		});
	}

	const Payments = {
		open(loanId) {
			currentLoanId = loanId;
			window.currentLoanIdForDocs = loanId;
			const loans = Storage.getLoans();
			const loan = loans.find(l => l.id === loanId);
			if (!loan) return;
			renderPayments(loan);
			document.getElementById('paymentsModal').classList.remove('hidden');
		},
		close() {
			document.getElementById('paymentsModal').classList.add('hidden');
			currentLoanId = null;
			window.currentLoanIdForDocs = null;
		},
		showTab(tab) {
			const history = document.getElementById('historySection');
			const docs = document.getElementById('documentsSection');
			const hb = document.getElementById('tabHistoryBtn');
			const db = document.getElementById('tabDocumentsBtn');
			if (tab === 'docs') {
				history.classList.add('hidden');
				docs.classList.remove('hidden');
				hb.classList.remove('secondary');
				db.classList.add('secondary');
			} else {
				history.classList.remove('hidden');
				docs.classList.add('hidden');
				hb.classList.add('secondary');
				db.classList.remove('secondary');
			}
		},
		payMonth(loanId, month, interestAmt) {
			const loans = Storage.getLoans();
			const loan = loans.find(l => l.id === loanId);
			if (!loan) return;
			const payments = Storage.getPayments();
			let rec = payments.find(p => p.loanId === loanId && p.month === month);
			if (!rec) {
				rec = {
					id: Utils.genId('payment'),
					loanId,
					month,
					interest_amt: Number(interestAmt),
					is_paid: true,
					paid_date: Utils.nowIso(),
					remaining_amount: 0
				};
				payments.push(rec);
			} else {
				rec.is_paid = true;
				rec.paid_date = Utils.nowIso();
				rec.interest_amt = Number(interestAmt);
			}
			Storage.setPayments(payments);
			renderPayments(loan);
			Loans.renderTable();
		},
		downloadHistoryPdf(loanIdOpt) {
			const loanId = loanIdOpt || currentLoanId;
			if (!loanId) return;
			const loan = Storage.getLoans().find(l => l.id === loanId);
			if (!loan) return;
			const payments = Storage.getPayments().filter(p => p.loanId === loanId);
			Receipts.historyPdf(loan, payments);
		},
		renderDocuments(loanId) {
			const loan = Storage.getLoans().find(l => l.id === loanId);
			if (loan) {
				document.getElementById('docCustomerName').textContent = loan.customerName || '-';
				const phoneDisplay = document.getElementById('docPhoneDisplay');
				const phoneEditBtn = document.getElementById('docPhoneEditBtn');
				const phoneInput = document.getElementById('docPhoneInput');
				const phoneSave = document.getElementById('docPhoneSaveBtn');
				const phoneCancel = document.getElementById('docPhoneCancelBtn');
				const phone = loan.phoneNumber || '';
				if (phone) {
					phoneDisplay.innerHTML = `<a href="tel:${phone.replace(/\s+/g, '')}" style="color:var(--primary); text-decoration:underline;">${phone}</a>`;
					phoneEditBtn.style.display = 'inline-block';
				} else {
					phoneDisplay.textContent = 'Not set';
					phoneEditBtn.style.display = 'inline-block';
				}
				phoneDisplay.style.display = 'inline';
				phoneInput.style.display = 'none';
				phoneSave.style.display = 'none';
				phoneCancel.style.display = 'none';
				phoneInput.value = phone;
			}
			const list = Storage.getDocuments().filter(d => d.loan_id === loanId);
			const tbody = document.getElementById('documentsTbody');
			tbody.innerHTML = '';
			for (const d of list) {
				const tr = document.createElement('tr');
				tr.innerHTML = `
					<td>${d.document_type}</td>
					<td>${d.document_number || '-'}</td>
					<td>${Utils.formatDDMMYYYY(d.received_date)}</td>
					<td>${d.file_url ? `<a href="${d.file_url}" target="_blank">Open</a>` : '-'}</td>
					<td>${d.verified_status ? '<span class="status-pill pill-active">Verified</span>' : '<span class="status-pill pill-due-soon">Not verified</span>'}</td>
					<td>${d.verified_status ? '' : `<button class="btn small" data-verify-doc="${d.document_id}">Verify</button>`}</td>
				`;
				tbody.appendChild(tr);
			}
			tbody.querySelectorAll('[data-verify-doc]').forEach(btn => {
				btn.addEventListener('click', () => {
					const id = btn.getAttribute('data-verify-doc');
					const docs = Storage.getDocuments();
					const rec = docs.find(x => x.document_id === id);
					if (rec) { rec.verified_status = true; Storage.setDocuments(docs); }
					Payments.renderDocuments(loanId);
				});
			});
		},
		async uploadDocument(loanId) {
			const type = document.getElementById('docTypeInput').value;
			const num = document.getElementById('docNumberInput').value.trim();
			const fileInput = document.getElementById('docFileInput');
			const file = fileInput.files && fileInput.files[0];
			let fileUrl = '';
			if (file) {
				// Store as object URL (stays for session); for persistence, could store base64
				fileUrl = URL.createObjectURL(file);
			}
			const docs = Storage.getDocuments();
			docs.push({
				document_id: Utils.genId('doc'),
				loan_id: loanId,
				document_type: type,
				document_number: num || '',
				file_url: fileUrl,
				received_date: Utils.nowIso(),
				verified_status: false
			});
			Storage.setDocuments(docs);
			fileInput.value = '';
			document.getElementById('docNumberInput').value = '';
			Payments.renderDocuments(loanId);
		}
	};
	window.Payments = Payments;
})(window);


