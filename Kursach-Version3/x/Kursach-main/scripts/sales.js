import { API } from '../../api.js';

let salesState = [];
const cart = {};

// Загрузка товаров при инициализации
async function initializeSales() {
  try {
    salesState = await API.getProducts();
    salesState = salesState.map(product => ({
      id: product.Id || product.id,
      name: product.Name || product.name || 'Товар без названия',
      category: product.Category || product.category || 'Без категории',
      count: Number(product.Count || product.count || 0),
      price: Number(product.Price || product.price || 0),
      image: product.Image || product.image || 'pic/Food.jpg'
    }));
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
  }
}

function categoryOrder(category) {
  if (category === "Энергос") return 1;
  if (category === "Напиток") return 2;
  if (category === "Сэндвичи") return 3;
  if (category === "Шоколад") return 4;
  return 5;
}

function formatRub(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
}

// Обновление отчета после продажи
async function updateReportFromSales(paymentMethod, foodTotal, topupAmount) {
  try {
    const report = await API.getReports();

    const updatedReport = {
      PcRevenueCash: Number(report.PcRevenueCash || 0),
      PcRevenueCard: Number(report.PcRevenueCard || 0),
      FridgeRevenueCash: Number(report.FridgeRevenueCash || 0),
      FridgeRevenueCard: Number(report.FridgeRevenueCard || 0)
    };

    if (foodTotal > 0) {
      if (paymentMethod === 'Наличка') {
        updatedReport.FridgeRevenueCash += foodTotal;
      } else {
        updatedReport.FridgeRevenueCard += foodTotal;
      }
    }

    if (topupAmount > 0) {
      if (paymentMethod === 'Наличка') {
        updatedReport.PcRevenueCash += topupAmount;
      } else {
        updatedReport.PcRevenueCard += topupAmount;
      }
    }

    await API.updateReports(updatedReport);

    // Обновляем поля на странице отчета если она открыта
    if (document.getElementById('pcRevenueCashInput')) {
      document.getElementById('pcRevenueCashInput').value = updatedReport.PcRevenueCash;
      document.getElementById('pcRevenueCardInput').value = updatedReport.PcRevenueCard;
      document.getElementById('fridgeRevenueCashInput').value = updatedReport.FridgeRevenueCash;
      document.getElementById('fridgeRevenueCardInput').value = updatedReport.FridgeRevenueCard;

      // Обновляем отображение totals
      const pcTotal = updatedReport.PcRevenueCash + updatedReport.PcRevenueCard;
      const fridgeTotal = updatedReport.FridgeRevenueCash + updatedReport.FridgeRevenueCard;
      const dayTotal = pcTotal + fridgeTotal;

      document.getElementById("pcRevenueTotal").textContent = formatRub(pcTotal);
      document.getElementById("fridgeRevenueTotal").textContent = formatRub(fridgeTotal);
      document.getElementById("dayTotal").textContent = formatRub(dayTotal);
    }
  } catch (error) {
    console.error('Ошибка обновления отчета:', error);
  }
}

// Загрузка отчета (удалена, используется API)
// function loadReport() - удалена

// Сохранение отчета (удалена, используется API)
// function saveReport() - удалена

// Отрисовка списка ПК
async function renderPcSelect() {
  const select = document.getElementById("topupPc");
  try {
    const pcs = await API.getPCs();
    select.innerHTML = `<option value="">Не пополнять</option>`;
    pcs.forEach((pc) => {
      const option = document.createElement("option");
      option.value = pc.Id;
      option.textContent = `${pc.Id} (${pc.Tier || "ПК"})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Ошибка загрузки ПК:', error);
  }
}

function renderSales() {
  const root = document.getElementById("salesGroups");
  root.innerHTML = "";

  const categories = [...new Set(salesState.map((item) => item.category))].sort(
    (a, b) => categoryOrder(a) - categoryOrder(b)
  );

  categories.forEach((category) => {
    const section = document.createElement("section");
    section.className = "tier-section";
    section.innerHTML = `
      <div class="tier-header"><h3>${category}</h3></div>
      <div class="sales-grid" id="sales-${category}"></div>
    `;
    root.appendChild(section);

    const grid = document.getElementById(`sales-${category}`);
    salesState.forEach((item, index) => {
      if (item.category !== category) return;
      const itemCard = document.createElement("article");
      itemCard.className = "sale-card";
      itemCard.innerHTML = `
        <img src="${item.image || 'pic/Food.jpg'}" alt="${item.name}" class="sale-photo" />
        <h4>${item.name}</h4>
        <p>Цена: <strong>${item.price} ₽</strong></p>
        <p>Остаток: <strong>${item.count} шт.</strong></p>
        <div class="sale-controls">
          <input type="number" min="1" max="${item.count}" value="1" data-index="${index}" class="sale-qty" />
          <button data-index="${index}" class="add-cart-btn" ${item.count <= 0 ? "disabled" : ""}>В чек</button>
        </div>
      `;
      grid.appendChild(itemCard);
    });
  });

  document.querySelectorAll(".add-cart-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      const item = salesState[index];
      const qtyInput = document.querySelector(`.sale-qty[data-index="${index}"]`);
      const qty = Math.max(1, Number(qtyInput.value || 1));
      if (item.count <= 0) return;
      if (qty > item.count) return;
      cart[index] = Number(cart[index] || 0) + qty;
      renderCart();
    });
  });
}

function renderCart() {
  const root = document.getElementById("cartItems");
  root.innerHTML = "";
  let foodTotal = 0;
  Object.entries(cart).forEach(([index, qty]) => {
    const item = salesState[Number(index)];
    if (!item || qty <= 0) return;
    const sum = qty * item.price;
    foodTotal += sum;
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <span>${item.name} × ${qty}</span>
      <span>${formatRub(sum)}</span>
    `;
    root.appendChild(row);
  });

  if (!root.innerHTML) root.innerHTML = "<p class='hint'>Товары не выбраны.</p>";

  const topupAmount = Number(document.getElementById("topupAmount").value || 0);
  document.getElementById("foodTotal").textContent = formatRub(foodTotal);
  document.getElementById("topupTotal").textContent = formatRub(topupAmount);
  document.getElementById("grandTotal").textContent = formatRub(foodTotal + topupAmount);
}

async function checkout() {
  const note = document.getElementById("checkoutNote");
  const paymentMethod = document.getElementById("paymentMethod").value;
  const topupAmount = Number(document.getElementById("topupAmount").value || 0);
  const topupPc = document.getElementById("topupPc").value;
  const cartEntries = Object.entries(cart);

  if (topupAmount > 0 && !topupPc) {
    note.textContent = "Выберите ПК для пополнения.";
    return;
  }

  let foodTotal = 0;
  const saleItems = [];

  for (const [indexRaw, qty] of cartEntries) {
    const index = Number(indexRaw);
    const item = salesState[index];
    if (!item || qty <= 0) continue;
    if (item.count < qty) {
      note.textContent = `Недостаточно остатка: ${item.name}`;
      return;
    }
    const itemTotal = qty * item.price;
    foodTotal += itemTotal;
    saleItems.push({
      productId: item.id,
      quantity: qty,
      price: item.price
    });
  }

  if (foodTotal <= 0 && topupAmount <= 0) {
    note.textContent = "Добавьте товары или сумму пополнения.";
    return;
  }

  try {
    // Создаем продажу через API
    await API.createSale({
      items: saleItems,
      paymentMethod,
      foodTotal,
      topupAmount,
      topupPc
    });

    // Обновляем локальное состояние товаров
    for (const [indexRaw, qty] of cartEntries) {
      const index = Number(indexRaw);
      const item = salesState[index];
      if (!item || qty <= 0) continue;
      item.count -= qty;
    }

    // Очищаем корзину
    Object.keys(cart).forEach((key) => delete cart[key]);
    document.getElementById("topupAmount").value = "0";

    const total = foodTotal + topupAmount;
    note.textContent = `Оплата проведена (${paymentMethod}). Итого: ${formatRub(total)}.`;

    // Сохраняем транзакции для диаграммы
    const transactions = await API.getTransactions();
    const now = new Date();

    // Обновляем отчет
    await updateReportFromSales(paymentMethod, foodTotal, topupAmount);

    renderSales();
    renderCart();
  } catch (error) {
    console.error('Ошибка проведения продажи:', error);
    note.textContent = 'Ошибка проведения продажи';
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  await initializeSales();
  await renderPcSelect();
  renderSales();
  renderCart();
});

// Обработчики событий
document.getElementById("topupAmount").addEventListener("input", renderCart);
document.getElementById("checkoutBtn").addEventListener("click", checkout);
