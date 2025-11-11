(function (window) {
	'use strict';
	let charts = { bar: null, pie: null };

	function computeAggregates(loans, payments, scopeUserId) {
		const scopedLoans = scopeUserId ? loans.filter(l => l.givenByUserId === scopeUserId) : loans;
		const scopedLoanIds = new Set(scopedLoans.map(l => l.id));
		const scopedPayments = payments.filter(p => scopedLoanIds.has(p.loanId));

		const totalLoans = scopedLoans.reduce((s, l) => s + (l.principalAmount || 0), 0);
		const totalReceived = scopedPayments.reduce((s, p) => s + (p.amount || 0), 0);
		const totalPending = scopedLoans.reduce((s, l) => s + (l.totals?.remaining || 0), 0);
		const totalInterest = scopedLoans.reduce((s, l) => s + (l.principalAmount * (l.interestPct || 0) / 100), 0);

		return { totalLoans, totalReceived, totalPending, totalInterest, scopedLoans, scopedPayments };
	}

	function buildLoansPerMonth(loans) {
		const map = new Map();
		for (const l of loans) {
			const d = new Date(l.createdAt);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
			map.set(key, (map.get(key) || 0) + 1);
		}
		const labels = Array.from(map.keys()).sort();
		const data = labels.map(k => map.get(k));
		return { labels, data };
	}

	function buildPaidPending(loans) {
		let paid = 0, pending = 0;
		for (const l of loans) {
			paid += (l.totals?.totalPaid || 0);
			pending += (l.totals?.remaining || 0);
		}
		return { labels: ['Paid', 'Pending'], data: [paid, pending] };
	}

	function renderMetrics(aggr) {
		document.getElementById('metricTotalLoans').textContent = Utils.formatMoney(aggr.totalLoans);
		document.getElementById('metricTotalReceived').textContent = Utils.formatMoney(aggr.totalReceived);
		document.getElementById('metricTotalPending').textContent = Utils.formatMoney(aggr.totalPending);
		document.getElementById('metricTotalInterest').textContent = Utils.formatMoney(aggr.totalInterest);
	}

	function renderCharts(aggr) {
		const barEl = document.getElementById('chartLoansPerMonth');
		const pieEl = document.getElementById('chartPaidPending');
		const perMonth = buildLoansPerMonth(aggr.scopedLoans);
		const paidPending = buildPaidPending(aggr.scopedLoans);

		if (charts.bar) charts.bar.destroy();
		if (charts.pie) charts.pie.destroy();

		charts.bar = new Chart(barEl, {
			type: 'bar',
			data: {
				labels: perMonth.labels,
				datasets: [{ label: 'Loans', data: perMonth.data, backgroundColor: '#4f46e5' }]
			},
			options: { responsive: true, maintainAspectRatio: false }
		});
		charts.pie = new Chart(pieEl, {
			type: 'pie',
			data: {
				labels: paidPending.labels,
				datasets: [{ data: paidPending.data, backgroundColor: ['#22c55e', '#ef4444'] }]
			},
			options: { responsive: true, maintainAspectRatio: false }
		});
	}

	const Dashboard = {
		refresh(scope) {
			const loans = Storage.getLoans();
			const payments = Storage.getPayments();
			const aggr = computeAggregates(loans, payments, scope?.userId || null);
			renderMetrics(aggr);
			renderCharts(aggr);
		}
	};
	window.Dashboard = Dashboard;
})(window);


