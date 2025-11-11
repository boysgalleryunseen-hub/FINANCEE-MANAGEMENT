(function (window) {
	'use strict';
	const Models = {
		makeUser({ name, pinHash, role }) {
			return {
				id: Utils.genId('user'),
				name,
				pinHash,
				role: role || 'staff',
				createdAt: Utils.nowIso(),
			};
		},
		makeLoan({ customerName, phoneNumber, principalAmount, interestPct, documentChargePct, numberOfMonths, documents, givenByUserId, givenByName, dueDate }) {
			const principal = Number(principalAmount);
			const rate = Number(interestPct || 0);
			const docPct = Number(documentChargePct || 5);
			const months = Number(numberOfMonths || 10);
			const interestPerMonth = principal * (rate / 100);
			const totalInterest = interestPerMonth * months;
			const documentChargeAmount = principal * (docPct / 100);
			const totalPayable = principal + totalInterest + documentChargeAmount;
			return {
				id: Utils.genId('loan'),
				customerName,
				phoneNumber: phoneNumber || '',
				principalAmount: principal,
				interestPct: rate,
				documentChargePct: docPct,
				numberOfMonths: months,
				calculations: {
					interestPerMonth,
					totalInterest,
					documentChargeAmount,
					totalPayable,
				},
				documents: documents || '',
				givenByUserId,
				givenByName,
				createdAt: Utils.nowIso(),
				dueDate,
				status: 'active',
				totals: { totalPaid: 0, remaining: totalPayable },
			};
		},
		makePayment({ loanId, amount, date }) {
			return {
				id: Utils.genId('payment'),
				loanId,
				amount: Number(amount),
				date: date || Utils.nowIso(),
				createdAt: Utils.nowIso(),
			};
		},
	};
	window.Models = Models;
})(window);


