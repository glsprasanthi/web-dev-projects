document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const expenseForm = document.getElementById('expense-form');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const expenseListContainer = document.getElementById('expense-list-container');
    const weeklyTotalEl = document.getElementById('weekly-total');
    const monthlyTotalEl = document.getElementById('monthly-total');
    const monthComparisonEl = document.getElementById('month-comparison');
    const newCategoryInput = document.getElementById('new-category');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const chartCanvas = document.getElementById('category-chart');

    // State Management
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    let categories = JSON.parse(localStorage.getItem('categories')) || ['Fast Food', 'Education', 'Lunch', 'Accessories', 'Skincare', 'Groceries', 'Other'];
    let categoryChart = null; // To hold the chart instance

    // --- UTILITY FUNCTIONS --- //
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString + 'T00:00:00'); // Ensure correct date parsing
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // --- CORE RENDERING --- //
    const render = () => {
        populateCategoryDropdown();
        renderExpenses();
        calculateSummary();
        renderChart();
        localStorage.setItem('expenses', JSON.stringify(expenses));
        localStorage.setItem('categories', JSON.stringify(categories));
    };

    // --- RENDER FUNCTIONS --- //
    const populateCategoryDropdown = () => {
        categoryInput.innerHTML = '<option value="" disabled selected>Select a Category</option>';
        categories.sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoryInput.appendChild(option);
        });
    };

    const renderExpenses = () => {
        expenseListContainer.innerHTML = '';
        if (expenses.length === 0) {
            expenseListContainer.innerHTML = '<p style="text-align:center;">No expenses recorded yet.</p>';
            return;
        }

        // Group expenses by date
        const groupedExpenses = expenses.reduce((acc, expense) => {
            const date = expense.date;
            if (!acc[date]) acc[date] = [];
            acc[date].push(expense);
            return acc;
        }, {});

        // Sort dates descending (newest first)
        const sortedDates = Object.keys(groupedExpenses).sort((a, b) => new Date(b) - new Date(a));

        // Create HTML for each date group
        sortedDates.forEach(date => {
            const expensesForDay = groupedExpenses[date];
            const dayTotal = expensesForDay.reduce((sum, e) => sum + e.amount, 0);

            const dateGroupDiv = document.createElement('div');
            dateGroupDiv.className = 'expense-date-group';

            const header = document.createElement('h3');
            header.className = 'date-header';
            header.innerHTML = `${formatDate(date)} <span class="date-total">${formatCurrency(dayTotal)}</span>`;
            dateGroupDiv.appendChild(header);

            const ul = document.createElement('ul');
            ul.className = 'expense-list';
            expensesForDay.forEach(expense => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="expense-details">
                        <span class="expense-description">${expense.description}</span>
                        <span class="expense-category">${expense.category}</span>
                    </div>
                    <span class="expense-amount">${formatCurrency(expense.amount)}</span>
                    <button class="delete-btn" data-id="${expense.id}">X</button>
                `;
                ul.appendChild(li);
            });
            dateGroupDiv.appendChild(ul);
            expenseListContainer.appendChild(dateGroupDiv);
        });
    };

    const calculateSummary = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Weekly Total
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const weeklyTotal = expenses.filter(e => new Date(e.date) >= startOfWeek).reduce((s, e) => s + e.amount, 0);
        weeklyTotalEl.textContent = formatCurrency(weeklyTotal);

        // Monthly Total (Current Month)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyTotal = expenses.filter(e => new Date(e.date) >= startOfMonth).reduce((s, e) => s + e.amount, 0);
        monthlyTotalEl.textContent = formatCurrency(monthlyTotal);

        // Month-over-Month Comparison
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const lastMonthTotal = expenses.filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate >= startOfLastMonth && expenseDate <= endOfLastMonth;
        }).reduce((s, e) => s + e.amount, 0);

        monthComparisonEl.classList.remove('increase', 'decrease');
        if (lastMonthTotal === 0 && monthlyTotal > 0) {
            monthComparisonEl.textContent = `↑ from ${formatCurrency(0)}`;
            monthComparisonEl.classList.add('increase');
        } else if (lastMonthTotal > 0) {
            const percentageChange = ((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100;
            if (percentageChange > 0) {
                monthComparisonEl.textContent = `↑ ${percentageChange.toFixed(0)}%`;
                monthComparisonEl.classList.add('increase');
            } else {
                monthComparisonEl.textContent = `↓ ${Math.abs(percentageChange).toFixed(0)}%`;
                monthComparisonEl.classList.add('decrease');
            }
        } else {
            monthComparisonEl.textContent = '--';
        }
    };

    const renderChart = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthlyExpenses = expenses.filter(e => new Date(e.date) >= startOfMonth);

        const categoryTotals = monthlyExpenses.reduce((acc, expense) => {
            if (!acc[expense.category]) acc[expense.category] = 0;
            acc[expense.category] += expense.amount;
            return acc;
        }, {});

        const chartLabels = Object.keys(categoryTotals);
        const chartData = Object.values(categoryTotals);

        if (categoryChart) {
            categoryChart.destroy(); // Destroy old chart before creating a new one
        }
        
        if (chartData.length === 0) return; // Don't render an empty chart

        categoryChart = new Chart(chartCanvas, {
            type: 'pie',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Spending',
                    data: chartData,
                    backgroundColor: ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71', '#1abc9c', '#34495e'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } }
            }
        });
    };

    // --- EVENT HANDLER FUNCTIONS --- //
    const addExpense = (e) => {
        e.preventDefault();
        const description = descriptionInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const category = categoryInput.value;

        if (!description || !amount || !category) {
            alert('Please fill out all fields.');
            return;
        }

        expenses.push({
            id: Date.now(),
            description,
            amount,
            category,
            date: new Date().toISOString().split('T')[0]
        });

        expenseForm.reset();
        categoryInput.value = "";
        render();
    };

    const deleteExpense = (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            expenses = expenses.filter(expense => expense.id !== id);
            render();
        }
    };

    const addCategory = () => {
        const newCategory = newCategoryInput.value.trim();
        if (newCategory && !categories.find(cat => cat.toLowerCase() === newCategory.toLowerCase())) {
            categories.push(newCategory);
            newCategoryInput.value = '';
            render();
        } else if (!newCategory) {
            alert("Category name cannot be empty.");
        } else {
            alert("This category already exists.");
        }
    };

    // --- EVENT LISTENERS --- //
    expenseForm.addEventListener('submit', addExpense);
    expenseListContainer.addEventListener('click', deleteExpense);
    addCategoryBtn.addEventListener('click', addCategory);

    // Initial Render
    render();
});