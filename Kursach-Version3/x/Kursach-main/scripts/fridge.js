import { loadStock } from './fridge-data.js';
import { API } from '../api.js';

let stockState = [];

async function initFridge() {
  try {
    stockState = await loadStock();
    renderStock();
  } catch (error) {
    console.error('Ошибка загрузки данных холодильника:', error);
  }
}

function renderStock() {
  const body = document.getElementById("stockTableBody");
  if (!body) {
    console.error('Элемент stockTableBody не найден');
    return;
  }
  body.innerHTML = "";

  console.log('Рендеринг холодильника, товаров:', stockState.length);

  if (stockState.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" style="text-align: center;">Товары не найдены. Проверьте подключение к серверу.</td>`;
    body.appendChild(row);
    return;
  }

  stockState.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name || 'Без названия'}</td>
      <td>${item.category || 'Без категории'}</td>
      <td class="value-positive">${item.count || 0} шт.</td>
      <td>${item.price || 0} ₽</td>
      <td><input id="add-${index}" type="number" min="0" value="0" /></td>
      <td><button data-index="${index}" class="add-stock-btn">Добавить</button></td>
    `;
    body.appendChild(row);
  });

  document.querySelectorAll(".add-stock-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.index);
      const input = document.getElementById(`add-${index}`);
      const addCount = Number(input.value || 0);
      if (addCount > 0) {
        const item = stockState[index];
        try {
          await API.restockProduct(item.id, addCount);
          item.count += addCount;
          console.log(`Добавлено ${addCount} шт. к товару ${item.name}`);
          input.value = 0;
          renderStock();
        } catch (error) {
          console.error('Ошибка пополнения товара:', error);
          alert('Ошибка сохранения. Проверьте консоль.');
        }
      }
    });
  });
}

// Запускаем инициализацию при загрузке страницы
initFridge();
