/* eslint-disable no-magic-numbers */
document.addEventListener("DOMContentLoaded", () => {
  // ========= DOM HOOKS =========
  const form = document.getElementById("loan-form");
  const addLoanBtn = document.getElementById("add-loan");
  const loansContainer = document.getElementById("loans-container");
  const resultsContainer = document.getElementById("results-container");
  const loanTemplate = document.getElementById("loan-template");

  const todayInput = document.getElementById("today");
  const gradInput = document.getElementById("graduationDate");
  const calculateBtn = document.getElementById("calculate");

  // Defaults
  setDefaultDates();

  // ========= EVENT LISTENERS =========
  form.addEventListener("submit", handleCalculate);
  addLoanBtn.addEventListener("click", () => addLoan());
  // Event delegation for remove buttons
  loansContainer.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.closest(".remove-loan")) {
      removeLoan(target.closest(".remove-loan"));
    }
  });

  // ========= CORE HANDLERS =========
  function handleCalculate(e) {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    try {
      const formState = readFormState();
      const errors = validate(formState);

      if (Object.keys(errors).length > 0) {
        displayErrors(errors);
        setLoading(false);
        return;
      }

      const summary = calculateAggregateSummary(formState);
      displayResults(summary);
    } catch (err) {
      console.error(err);
      displayResults({
        error:
          "An unexpected error occurred. Please double-check your inputs and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  // ========= DOM HELPERS =========
  let loanCount = 1;

  function addLoan() {
    loanCount += 1;
    const node = loanTemplate.content.cloneNode(true);
    const section = node.querySelector(".loan-section");
    section.dataset.loanId = String(loanCount);
    const title = section.querySelector("h3");
    title.textContent = `Loan #${loanCount}`;
    const checkbox = section.querySelector('input[name="subsidized"]');
    checkbox.id = `subsidized-${loanCount}`;
    const label = section.querySelector("label.text-sm.font-medium");
    label.setAttribute("for", checkbox.id);

    loansContainer.appendChild(node);
    renumberLoans();
  }

  function removeLoan(buttonEl) {
    const section = buttonEl.closest(".loan-section");
    if (!section) return;
    section.remove();
    renumberLoans();
    loanCount = loansContainer.querySelectorAll(".loan-section").length;
  }

  function renumberLoans() {
    const sections = [...loansContainer.querySelectorAll(".loan-section")];
    sections.forEach((sec, i) => {
      sec.dataset.loanId = String(i + 1);
      const title = sec.querySelector("h3");
      if (title) title.textContent = `Loan #${i + 1}`;
      const sub = sec.querySelector('input[name="subsidized"]');
      const label = sec.querySelector("label.text-sm.font-medium");
      if (sub && label) {
        sub.id = `subsidized-${i + 1}`;
        label.setAttribute("for", sub.id);
      }
    });
  }

  function displayResults(summary) {
    if (summary?.error) {
      resultsContainer.innerHTML = `
        <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-red-200">
          <h3 class="text-lg font-semibold text-red-700">Error</h3>
          <p class="mt-2 text-sm text-red-700">${summary.error}</p>
        </div>
      `;
      return;
    }

    const currency = (n) => formatCurrency(n);
    const dateFmt = (d) => (d ? formatDateISO(d) : "—");

    const perLoanRows = summary.loans
      .map(
        (ln, idx) => `
        <tr class="border-t">
          <td class="px-3 py-2 text-sm text-slate-700">Loan #${idx + 1}</td>
          <td class="px-3 py-2 text-sm">${currency(ln.monthlyPayment)}</td>
          <td class="px-3 py-2 text-sm">${currency(ln.totalInterest)}</td>
          <td class="px-3 py-2 text-sm">${currency(ln.totalPaid)}</td>
          <td class="px-3 py-2 text-sm">${dateFmt(ln.payoffDate)}</td>
        </tr>`
      )
      .join("");

    resultsContainer.innerHTML = `
      <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div class="mb-4">
          <h3 class="text-lg font-semibold">Results Summary</h3>
          <p class="mt-1 text-sm text-slate-600">
            Payments begin after graduation + grace period. Interest accrues daily until payments begin
            (subsidized loans pause accrual until graduation).
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg border border-slate-200 p-4">
            <div class="text-xs font-medium text-slate-500">Total Monthly Payment</div>
            <div class="mt-1 text-xl font-semibold">${currency(
              summary.totalMonthlyPayment
            )}</div>
          </div>
          <div class="rounded-lg border border-slate-200 p-4">
            <div class="text-xs font-medium text-slate-500">Total Principal</div>
            <div class="mt-1 text-xl font-semibold">${currency(
              summary.totalPrincipal
            )}</div>
          </div>
          <div class="rounded-lg border border-slate-200 p-4">
            <div class="text-xs font-medium text-slate-500">Total Interest</div>
            <div class="mt-1 text-xl font-semibold">${currency(
              summary.totalInterest
            )}</div>
          </div>
          <div class="rounded-lg border border-slate-200 p-4">
            <div class="text-xs font-medium text-slate-500">Total Cost</div>
            <div class="mt-1 text-xl font-semibold">${currency(
              summary.totalPaid
            )}</div>
          </div>
        </div>

        <div class="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <table class="w-full text-left">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-3 py-2 text-xs font-semibold text-slate-600">Loan</th>
                <th class="px-3 py-2 text-xs font-semibold text-slate-600">Monthly Payment</th>
                <th class="px-3 py-2 text-xs font-semibold text-slate-600">Total Interest</th>
                <th class="px-3 py-2 text-xs font-semibold text-slate-600">Total Paid</th>
                <th class="px-3 py-2 text-xs font-semibold text-slate-600">Payoff Date</th>
              </tr>
            </thead>
            <tbody>${perLoanRows}</tbody>
          </table>
        </div>

        <p class="mt-4 text-sm text-slate-600">
          Estimated final payoff (latest loan): <span class="font-semibold">${dateFmt(
            summary.finalPayoffDate
          )}</span>
        </p>
      </div>
    `;
  }

  function clearErrors() {
    // remove any previous error messages and styles
    form
      .querySelectorAll(".error-text")
      .forEach((el) => el.parentElement && el.remove());
    form
      .querySelectorAll("[aria-invalid='true']")
      .forEach((el) => el.setAttribute("aria-invalid", "false"));
    form
      .querySelectorAll(".border-red-500")
      .forEach((el) => el.classList.remove("border-red-500"));
  }

  function displayErrors(errors) {
    // errors: { fieldKey (with index) : message }
    Object.entries(errors).forEach(([key, message]) => {
      const [scope, idx, name] = key.split("|"); // scope: global or loan, idx for loan index
      let input;
      if (scope === "global") {
        input = name === "today" ? todayInput : gradInput;
      } else {
        // find nth loan-section
        const section =
          loansContainer.querySelectorAll(".loan-section")[Number(idx)];
        if (!section) return;
        input = section.querySelector(`[name="${name}"]`);
      }

      if (input) {
        input.setAttribute("aria-invalid", "true");
        input.classList.add("border-red-500");
        const p = document.createElement("p");
        p.className = "mt-1 text-sm text-red-600 error-text";
        p.textContent = message;
        input.insertAdjacentElement("afterend", p);
      }
    });
  }

  function setLoading(isLoading) {
    calculateBtn.disabled = isLoading;
    calculateBtn.style.opacity = isLoading ? "0.75" : "1";
    calculateBtn.textContent = isLoading ? "Calculating..." : "Calculate";
  }

  function setDefaultDates() {
    const today = new Date();
    todayInput.value = toInputValue(today);
    // default grad date = next June 1
    const grad = new Date(Date.UTC(today.getUTCFullYear(), 5, 1));
    gradInput.value = toInputValue(grad);
  }

  // ========= STATE & VALIDATION =========
  function readFormState() {
    const today = parseDate(todayInput.value);
    const graduationDate = parseDate(gradInput.value);

    const loans = [...loansContainer.querySelectorAll(".loan-section")].map(
      (section) => {
        const get = (sel) => section.querySelector(sel);
        const balance = toNumber(get('input[name="balance"]').value);
        const aprPct = toNumber(get('input[name="apr"]').value);
        const termYears = toInt(get('input[name="termYears"]').value);
        const graceMonths = toInt(get('input[name="graceMonths"]').value);
        const originationDate = parseDate(
          get('input[name="originationDate"]').value
        );
        const subsidized = !!get('input[name="subsidized"]').checked;

        return {
          balance,
          aprPct,
          termYears,
          graceMonths,
          originationDate,
          subsidized,
        };
      }
    );

    return { today, graduationDate, loans };
  }

  function validate(state) {
    const errors = {};
    if (!isValidDate(state.today)) {
      errors["global||today"] = "Please enter a valid today's date.";
    }
    if (!isValidDate(state.graduationDate)) {
      errors["global||graduationDate"] = "Please enter a valid graduation date.";
    }

    state.loans.forEach((ln, i) => {
      if (!(ln.balance > 0)) {
        errors[`loan|${i}|balance`] = "Balance must be greater than 0.";
      }
      if (!(ln.aprPct >= 0)) {
        errors[`loan|${i}|apr`] = "APR must be 0 or greater.";
      }
      if (!(ln.termYears > 0)) {
        errors[`loan|${i}|termYears`] = "Term must be at least 1 year.";
      }
      if (!(ln.graceMonths >= 0)) {
        errors[`loan|${i}|graceMonths`] = "Grace period cannot be negative.";
      }
      if (!isValidDate(ln.originationDate)) {
        errors[`loan|${i}|originationDate`] = "Enter a valid origination date.";
      }
      // logical date checks if grad provided
      if (
        isValidDate(ln.originationDate) &&
        isValidDate(state.graduationDate) &&
        lt(state.graduationDate, ln.originationDate)
      ) {
        errors[`loan|${i}|originationDate`] =
          "Origination must be on or before graduation.";
      }
    });

    return errors;
  }

  // ========= CALCULATIONS =========
  function calculateAggregateSummary(state) {
    const loansOut = state.loans.map((ln) =>
      calculateSingleLoanSummary({
        balance: ln.balance,
        aprPct: ln.aprPct,
        termYears: ln.termYears,
        graceMonths: ln.graceMonths,
        originationDate: ln.originationDate,
        graduationDate: state.graduationDate,
        subsidized: ln.subsidized,
      })
    );

    const totalMonthlyPayment = sum(loansOut.map((l) => l.monthlyPayment));
    const totalPrincipal = sum(loansOut.map((l) => l.principal));
    const totalInterest = sum(loansOut.map((l) => l.totalInterest));
    const totalPaid = totalPrincipal + totalInterest;
    const finalPayoffDate = loansOut.reduce((latest, l) => {
      if (!latest) return l.payoffDate;
      if (!l.payoffDate) return latest;
      return gt(l.payoffDate, latest) ? l.payoffDate : latest;
    }, null);

    return {
      totalMonthlyPayment,
      totalPrincipal,
      totalInterest,
      totalPaid,
      finalPayoffDate,
      loans: loansOut,
    };
  }

  function calculateSingleLoanSummary({
    balance,
    aprPct,
    termYears,
    graceMonths,
    originationDate,
    graduationDate,
    subsidized,
  }) {
    const principal = balance;
    const apr = aprPct / 100;
    const nMonths = Math.round(termYears * 12);

    // Payment start date = graduation + grace months
    const paymentStartDate = addMonths(graduationDate, graceMonths);

    // Accrual window (daily)
    // Unsubsidized: from origination -> paymentStart
    // Subsidized:   from graduation  -> paymentStart (no accrual before grad)
    const accrualStart = subsidized ? graduationDate : originationDate;
    let capitalizedInterest = 0;

    if (apr > 0 && lte(accrualStart, paymentStartDate)) {
      const days = diffDays(accrualStart, paymentStartDate);
      const dailyRate = apr / 365;
      // compound daily
      const accrued = principal * Math.pow(1 + dailyRate, Math.max(0, days)) - principal;
      capitalizedInterest = Math.max(0, accrued);
    }

    let startingBalance = principal + capitalizedInterest;

    // Monthly payment (amortization)
    let monthlyPayment = 0;
    if (apr === 0) {
      monthlyPayment = round2(startingBalance / nMonths);
    } else {
      const r = apr / 12;
      monthlyPayment = round2(
        (startingBalance * r) / (1 - Math.pow(1 + r, -nMonths))
      );
    }

    // Simulate repayment month-by-month to get accurate final interest & payoff date
    let remaining = startingBalance;
    let totalInterestPaid = 0;
    let months = 0;
    const r = apr / 12;

    while (remaining > 0 && months < nMonths + 360 /* safety bound */) {
      const interest = apr === 0 ? 0 : remaining * r;
      let principalPaid = monthlyPayment - interest;

      // If near the end, cap the last payment
      if (principalPaid > remaining) {
        principalPaid = remaining;
      }

      totalInterestPaid += interest;
      remaining = remaining - principalPaid;
      months += 1;

      if (remaining <= 0.01) {
        remaining = 0;
        break;
      }
    }

    const payoffDate = addMonths(paymentStartDate, months);

    return {
      principal: round2(principal),
      capitalizedInterest: round2(capitalizedInterest),
      startingBalance: round2(startingBalance),
      monthlyPayment: round2(monthlyPayment),
      totalInterest: round2(totalInterestPaid),
      totalPaid: round2(principal + totalInterestPaid),
      payoffDate,
      paymentStartDate,
    };
  }

  // ========= UTILITIES (dates, math, format) =========
  function parseDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split("-").map((n) => parseInt(n, 10));
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }

  function toInputValue(date) {
    // returns YYYY-MM-DD for <input type="date">
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function addMonths(date, months) {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    const d = date.getUTCDate();
    const out = new Date(Date.UTC(y, m + months, 1));
    // keep day-of-month by clamping to month length
    const endDay = Math.min(d, daysInMonth(out.getUTCFullYear(), out.getUTCMonth()));
    out.setUTCDate(endDay);
    return out;
  }

  function daysInMonth(year, monthIndex0) {
    return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  }

  function diffDays(a, b) {
    const ms = b.getTime() - a.getTime();
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  }

  function isValidDate(d) {
    return d instanceof Date && !isNaN(d.getTime());
  }

  function lt(a, b) {
    return a.getTime() < b.getTime();
  }
  function lte(a, b) {
    return a.getTime() <= b.getTime();
  }
  function gt(a, b) {
    return a.getTime() > b.getTime();
  }

  function toNumber(v) {
    const n = Number(v);
    return isFinite(n) ? n : NaN;
  }
  function toInt(v) {
    const n = parseInt(String(v), 10);
    return isFinite(n) ? n : NaN;
  }

  function sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
  }

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function formatCurrency(n) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0);
  }

  function formatDateISO(d) {
    // yyyy-mm-dd
    return toInputValue(d);
  }
});
