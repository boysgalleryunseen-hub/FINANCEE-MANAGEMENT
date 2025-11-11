(function (window) {
	'use strict';
	const { jsPDF } = window.jspdf;

	function header(doc, orgName) {
		doc.setFontSize(16);
		doc.text(orgName || 'Finance Manager', 105, 18, { align: 'center' });
		doc.setFontSize(11);
		doc.text('Receipt', 105, 26, { align: 'center' });
		doc.line(20, 30, 190, 30);
	}

	function footer(doc) {
		doc.line(20, 270, 190, 270);
		doc.text('Signature', 170, 285, { align: 'center' });
	}

	const Receipts = {
		loanReceipt(loan) {
			const s = Storage.getSettings();
			const doc = new jsPDF();
			header(doc, s.orgName);
			doc.setFontSize(12);
			const y0 = 42;
			doc.text(`Customer: ${loan.customerName}`, 20, y0);
			doc.text(`Principal: ${Utils.formatMoney(loan.principalAmount)}`, 20, y0 + 8);
			const interestAmt = (Number(loan.principalAmount||0) * Number(loan.interestPct||0))/100;
			const totalDue = Number(loan.principalAmount||0) + interestAmt;
			doc.text(`Interest %: ${loan.interestPct}  |  Interest Amt: ${Utils.formatMoney(interestAmt)}`, 20, y0 + 16);
			doc.text(`Total Due: ${Utils.formatMoney(totalDue)}`, 20, y0 + 24);
			doc.text(`Given By: ${loan.givenByName}`, 20, y0 + 32);
			doc.text(`Created: ${Utils.formatDate(loan.createdAt)}`, 20, y0 + 40);
			doc.text(`Due Date: ${Utils.formatShortDate(loan.dueDate)}`, 20, y0 + 48);
			footer(doc);
			doc.save(`LoanReceipt_${loan.customerName}_${loan.id}.pdf`);
		},
		paymentReceipt(loan, payment) {
			const s = Storage.getSettings();
			const doc = new jsPDF();
			header(doc, s.orgName);
			doc.setFontSize(12);
			const y0 = 42;
			doc.text(`Customer: ${loan.customerName}`, 20, y0);
			doc.text(`Payment: ${Utils.formatMoney(payment.amount)}`, 20, y0 + 8);
			doc.text(`Date: ${Utils.formatShortDate(payment.date)}`, 20, y0 + 16);
			doc.text(`Loan ID: ${loan.id}`, 20, y0 + 24);
			const interestAmt = (Number(loan.principalAmount||0) * Number(loan.interestPct||0))/100;
			const totalDue = Number(loan.principalAmount||0) + interestAmt;
			const totals = loan.totals || { totalPaid: 0, remaining: totalDue };
			doc.text(`Interest Amt: ${Utils.formatMoney(interestAmt)}  |  Total Due: ${Utils.formatMoney(totalDue)}`, 20, y0 + 32);
			doc.text(`Total Paid: ${Utils.formatMoney(totals.totalPaid)}`, 20, y0 + 40);
			doc.text(`Remaining: ${Utils.formatMoney(totals.remaining)}`, 20, y0 + 48);
			footer(doc);
			doc.save(`PaymentReceipt_${loan.customerName}_${payment.id}.pdf`);
		},
		historyPdf(loan, payments) {
			const s = Storage.getSettings();
			const doc = new jsPDF();
			header(doc, s.orgName);
			doc.setFontSize(12);
			let y = 42;
			const monthlyInterest = (Number(loan.principalAmount || 0) * Number(loan.interestPct || 0)) / 100;
			const docChargeAmt = Number(loan.principalAmount || 0) * (Number(loan.documentChargePct || 0) / 100);
			const totalInterest = monthlyInterest * Number(loan.numberOfMonths || 10);
			const totalPayable = Number(loan.principalAmount || 0) + totalInterest + docChargeAmt;
			doc.text(`Customer: ${loan.customerName}`, 20, y); y += 8;
			doc.text(`Principal: ${Utils.formatMoney(loan.principalAmount)} | Interest %: ${loan.interestPct} | Doc %: ${loan.documentChargePct ?? 0}`, 20, y); y += 8;
			doc.text(`Months: ${loan.numberOfMonths || 10} | Monthly Interest: ${Utils.formatMoney(monthlyInterest)}`, 20, y); y += 8;
			doc.text(`Total Interest: ${Utils.formatMoney(totalInterest)} | Doc Charge: ${Utils.formatMoney(docChargeAmt)} | Total Payable: ${Utils.formatMoney(totalPayable)}`, 20, y); y += 8;
			doc.text(`Given By: ${loan.givenByName} | Created: ${Utils.formatShortDate(loan.createdAt)} | Due: ${Utils.formatShortDate(loan.dueDate)}`, 20, y); y += 10;
			doc.text('History:', 20, y); y += 6;
			// table header
			doc.text('Month', 20, y);
			doc.text('Interest', 55, y);
			doc.text('Paid?', 95, y);
			doc.text('Date Paid', 120, y);
			doc.text('Remaining', 160, y);
			y += 4;
			doc.line(20, y, 190, y); y += 4;
			// rows
			const map = new Map(payments.map(p => [p.month, p]));
			// months between
			const months = (function () {
				const out = [];
				const start = new Date(loan.createdAt);
				const end = new Date(loan.dueDate);
				const cur = new Date(start.getFullYear(), start.getMonth(), 1);
				const stop = new Date(end.getFullYear(), end.getMonth(), 1);
				while (cur <= stop) {
					out.push(cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0'));
					cur.setMonth(cur.getMonth() + 1);
				}
				return out;
			})();
			let totalPaid = 0;
			for (const m of months) {
				const rec = map.get(m);
				const isPaid = !!(rec && rec.is_paid);
				if (isPaid) totalPaid += Number(rec.interest_amt || 0);
				const remaining = Math.max(0, monthlyInterest - (isPaid ? Number(rec.interest_amt || 0) : 0));
				doc.text(m, 20, y);
				doc.text(Utils.formatMoney(monthlyInterest), 55, y);
				doc.text(isPaid ? 'Yes' : 'No', 95, y);
				doc.text(isPaid ? Utils.formatShortDate(rec.paid_date) : '-', 120, y);
				doc.text(Utils.formatMoney(remaining), 160, y);
				y += 6;
				if (y > 270) { doc.addPage(); y = 20; }
			}
			y += 4;
			doc.line(20, y, 190, y); y += 8;
			doc.text(`Totals: Paid ${Utils.formatMoney(totalPaid)} / Interest ${Utils.formatMoney(months.length * monthlyInterest)} | Pending ${Utils.formatMoney(months.length * monthlyInterest - totalPaid)}`, 20, y);
			doc.save(`LoanHistory_${loan.customerName}_${loan.id}.pdf`);
		}
	};
	window.Receipts = Receipts;
})(window);


