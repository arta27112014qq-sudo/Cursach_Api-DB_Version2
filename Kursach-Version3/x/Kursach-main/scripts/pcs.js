import { API } from '../../api.js';

function createPc(idNumber, tier, rate) {
  return {
    id: `PC-${String(idNumber).padStart(2, "0")}`,
    tier,
    status: "Свободен",
    rate,
    balance: 0,
    allocatedMinutes: 0,
    spentTotal: 0,
    lastEvent: "Готов к запуску",
  };
}

const DEFAULT_PCS = [
  ...Array.from({ length: 10 }, (_, i) => createPc(i + 1, "VIP", 120)),
  ...Array.from({ length: 15 }, (_, i) => createPc(i + 11, "Комфорт", 100)),
  ...Array.from({ length: 25 }, (_, i) => createPc(i + 26, "Стандарт", 80)),
];

let pcsState = [];

// Загрузка ПК при инициализации
async function initializePcs() {
  try {
    const pcs = await API.getPCs();
    pcsState = pcs.map(pc => ({
      id: pc.Id || pc.id,
      tier: pc.Tier || pc.tier || 'Стандарт',
      status: pc.Status || pc.status || 'Свободен',
      rate: Number(pc.Rate || pc.rate || 0),
      balance: Number(pc.Balance || pc.balance || 0),
      allocatedMinutes: Number(pc.AllocatedMinutes || pc.allocatedMinutes || 0),
      spentTotal: Number(pc.SpentTotal || pc.spentTotal || 0),
      lastEvent: pc.LastEvent || pc.lastEvent || 'Нет событий'
    }));

    // Если в базе нет ПК, создаем стандартные
    if (pcsState.length === 0) {
      pcsState = [...DEFAULT_PCS];
      // Здесь можно добавить код для сохранения в базу
    }
  } catch (error) {
    console.error('Ошибка загрузки ПК:', error);
    pcsState = [...DEFAULT_PCS];
  }
}

// Сохранение ПК на сервере
async function savePcs(pcs) {
  try {
    for (const pc of pcs) {
      await API.updatePC(pc.id, {
        Tier: pc.tier,
        Status: pc.status,
        Rate: pc.rate,
        Balance: pc.balance,
        AllocatedMinutes: pc.allocatedMinutes,
        SpentTotal: pc.spentTotal,
        LastEvent: pc.lastEvent
      });
    }
  } catch (error) {
    console.error('Ошибка сохранения ПК:', error);
  }
}

function statusClass(status) {
  if (status === "Свободен") return "free";
  if (status === "Занят") return "busy";
  if (status === "Пауза") return "busy";
  return "offline";
}

// Загрузка отчета (через API)
async function loadReport() {
  try {
    const report = await API.getReports();
    return {
      pcRevenueCash: Number(report.PcRevenueCash || 0),
      pcRevenueCard: Number(report.PcRevenueCard || 0),
      fridgeRevenueCash: Number(report.FridgeRevenueCash || 0),
      fridgeRevenueCard: Number(report.FridgeRevenueCard || 0),
    };
  } catch (error) {
    console.error('Ошибка загрузки отчета:', error);
    return { pcRevenueCash: 0, pcRevenueCard: 0, fridgeRevenueCash: 0, fridgeRevenueCard: 0 };
  }
}

// Запись дохода ПК
async function writePcRevenue(amount) {
  if (amount <= 0) return;
  try {
    const report = await API.getReports();
    const updatedReport = {
      PcRevenueCash: Number(report.PcRevenueCash || 0) + amount,
      PcRevenueCard: Number(report.PcRevenueCard || 0),
      FridgeRevenueCash: Number(report.FridgeRevenueCash || 0),
      FridgeRevenueCard: Number(report.FridgeRevenueCard || 0)
    };
    await API.updateReports(updatedReport);
  } catch (error) {
    console.error('Ошибка записи дохода ПК:', error);
  }
}

// Получение бронирований ПК
async function bookingRangesForPc(pcId) {
  try {
    const bookings = await API.getBookings();
    const pcBookings = bookings.filter(b => b.PcId === pcId);

    if (!pcBookings.length) return "";

    const toLabel = (dateValue) => {
      const dd = String(dateValue.getDate()).padStart(2, "0");
      const mm = String(dateValue.getMonth() + 1).padStart(2, "0");
      const hh = String(dateValue.getHours()).padStart(2, "0");
      const min = String(dateValue.getMinutes()).padStart(2, "0");
      return `${dd}.${mm} ${hh}:${min}`;
    };

    const addMinutes = (dateValue, minutes) => {
      return new Date(dateValue.getTime() + minutes * 60 * 1000);
    };

    const sorted = pcBookings
      .map(b => new Date(b.SlotTime))
      .sort((a, b) => a.getTime() - b.getTime());

    const ranges = [];
    let start = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i < sorted.length; i += 1) {
      const current = sorted[i];
      if (current.getTime() === addMinutes(prev, 30).getTime()) {
        prev = current;
        continue;
      }
      ranges.push(`${toLabel(start)}-${toLabel(addMinutes(prev, 30))}`);
      start = current;
      prev = current;
    }

    ranges.push(`${toLabel(start)}-${toLabel(addMinutes(prev, 30))}`);
    return ranges.slice(0, 2).join(", ");
  } catch (error) {
    console.error('Ошибка загрузки бронирований:', error);
    return "";
  }
}

const draftTopups = {};
const draftMinutes = {};
let openedMenuPcId = null;

const MENU_ACTIONS = [
  "Старт сессии",
  "Завершить сессию",
  "Пауза сессии",
  "Снять паузу",
  "Блокировать ПК",
  "Разблокировать ПК",
  "Перезагрузка ПК",
  "Выключить ПК",
  "Удаленный рабочий стол",
  "Отправить сообщение",
];

function normalizeMinutes(minutes) {
  const safe = Number(String(minutes || "0").replace(",", "."));
  if (safe <= 0) return 0;
  return Math.max(30, Math.round(safe / 30) * 30);
}

async function startSession(pc, requestedMinutes) {
  if (pc.status !== "Свободен") return;
  const normalizedRequested = normalizeMinutes(requestedMinutes);
  if (normalizedRequested <= 0) {
    pc.lastEvent = "Введите корректное время сессии";
    return;
  }
  const requestedCost = Math.round((pc.rate * normalizedRequested) / 60);

  let finalMinutes = normalizedRequested;
  let finalCost = requestedCost;
  if (pc.balance < requestedCost) {
    const affordableMinutes = Math.floor((pc.balance / pc.rate) * 2) * 30;
    if (affordableMinutes < 30) {
      pc.lastEvent = "Недостаточно баланса для запуска";
      return;
    }
    finalMinutes = affordableMinutes;
    finalCost = Math.round((pc.rate * finalMinutes) / 60);
  }

  pc.balance -= finalCost;
  pc.spentTotal += finalCost;
  pc.allocatedMinutes = finalMinutes;
  pc.status = "Занят";
  pc.lastEvent = `Сессия запущена на ${finalMinutes} мин`;

  try {
    await API.startSession(pc.id, finalMinutes);
    await writePcRevenue(finalCost);
  } catch (error) {
    console.error('Ошибка запуска сессии:', error);
  }
}

function endSession(pc) {
  if (pc.status !== "Занят") return;
  pc.status = "Свободен";
  pc.allocatedMinutes = 0;
  pc.lastEvent = "Сессия завершена";
}

async function extendSession(pc, addMinutes = 30) {
  if (pc.status !== "Занят") return;
  const extensionCost = Math.round((pc.rate * addMinutes) / 60);
  if (pc.balance < extensionCost) {
    pc.lastEvent = "Недостаточно баланса для продления";
    return;
  }
  pc.balance -= extensionCost;
  pc.spentTotal += extensionCost;
  pc.allocatedMinutes += addMinutes;
  pc.lastEvent = `Сессия продлена на ${addMinutes} мин`;

  try {
    await writePcRevenue(extensionCost);
  } catch (error) {
    console.error('Ошибка продления сессии:', error);
  }
}

function applyAction(pc, action) {
  if (action === "Завершить сессию") endSession(pc);
  if (action === "Пауза сессии" && pc.status === "Занят") {
    pc.status = "Пауза";
    pc.lastEvent = "Сессия поставлена на паузу";
  }
  if (action === "Снять паузу" && pc.status === "Пауза") {
    pc.status = "Занят";
    pc.lastEvent = "Сессия снята с паузы";
  }
  if (action === "Блокировать ПК") {
    pc.status = "Оффлайн";
    pc.lastEvent = "ПК заблокирован";
  }
  if (action === "Разблокировать ПК" && pc.status === "Оффлайн") {
    pc.status = "Свободен";
    pc.allocatedMinutes = 0;
    pc.lastEvent = "ПК разблокирован";
  }
  if (action === "Выключить ПК") {
    pc.status = "Оффлайн";
    pc.allocatedMinutes = 0;
    pc.lastEvent = "ПК выключен";
  }
  if (action === "Перезагрузка ПК" && pc.status !== "Оффлайн") {
    pc.status = "Свободен";
    pc.allocatedMinutes = 0;
    pc.lastEvent = "ПК перезагружен";
  }
  if (action === "Удаленный рабочий стол") pc.lastEvent = "Открыт удаленный доступ";
  if (action === "Отправить сообщение") pc.lastEvent = "Сообщение отправлено";
}

function mainSessionAction(pc) {
  if (pc.status === "Свободен") return "Старт сессии";
  if (pc.status === "Занят") return "Завершить сессию";
  if (pc.status === "Пауза") return "Снять паузу";
  return "Разблокировать ПК";
}

function renderPcCards() {
  const container = document.getElementById("pcSections");
  container.innerHTML = "";

  const tiers = ["VIP", "Комфорт", "Стандарт"];
  tiers.forEach((tier) => {
    const section = document.createElement("section");
    section.className = "tier-section";
    section.innerHTML = `
      <div class="tier-header">
        <h3>${tier}</h3>
      </div>
      <div class="pc-cards" id="tier-${tier}"></div>
    `;
    container.appendChild(section);
  });

  pcsState.forEach((pc, index) => {
    const primaryAction = mainSessionAction(pc);
    const tier = pc.tier || 'Стандарт'; // Значение по умолчанию
    const cards = document.getElementById(`tier-${tier}`);
    if (!cards) {
      console.error(`Контейнер для tier-${tier} не найден`);
      return;
    }
    const card = document.createElement("article");
    card.className = "pc-card";
    const bookingLabel = "Загрузка..."; // Временно, пока загружаются брони
    const minutesDraft = draftMinutes[pc.id] ?? "60";
    const topupDraft = draftTopups[pc.id] ?? "0";
    card.innerHTML = `
      <div class="pc-card-top">
        <h3 class="pc-name">${pc.id}</h3>
        <span class="status ${statusClass(pc.status)}">${pc.status}</span>
      </div>
      <p class="pc-meta">${pc.tier || 'Стандарт'} · Тариф: ${pc.rate} ₽/ч</p>
      <p class="pc-balance">Баланс: <strong>${pc.balance} ₽</strong></p>
      <p class="pc-time">Осталось: <strong>${pc.allocatedMinutes} мин</strong></p>
      <p class="pc-time">Потрачено: <strong>${pc.spentTotal} ₽</strong></p>
      <p class="pc-booking">${bookingLabel ? `Бронь: ${bookingLabel}` : "Бронь: нет"}</p>
      <p class="pc-note">${pc.lastEvent}</p>
      <div class="pc-actions">
        <button data-index="${index}" class="session-btn">${primaryAction}</button>
        <div class="topup-group">
          <input type="number" min="0" step="30" value="${minutesDraft}" data-index="${index}" class="minutes-input" />
          <small class="input-hint">Минуты сессии</small>
        </div>
        <div class="menu-wrapper">
          <button data-index="${index}" class="menu-open-btn">Меню</button>
          <div class="pc-dropdown hidden" id="dropdown-${index}">
            ${MENU_ACTIONS.map(
      (action) =>
        `<button class="dropdown-item" data-index="${index}" data-action="${action}">${action}</button>`
    ).join("")}
          </div>
        </div>
      </div>
    `;
    card.setAttribute('data-pc-id', pc.id);
    cards.appendChild(card);
  });

  // Загружаем и обновляем брони для всех ПК
  loadAndUpdateBookings();

  // Привязываем обработчики событий к созданным элементам
  document.querySelectorAll(".session-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      const pc = pcsState[index];
      if (mainSessionAction(pc) === "Старт сессии") {
        const minutesInput = document.querySelector(`.minutes-input[data-index="${index}"]`);
        draftMinutes[pc.id] = minutesInput.value;
        startSession(pc, minutesInput.value);
        if (pc.status === "Занят") draftMinutes[pc.id] = "60";
      } else {
        applyAction(pc, mainSessionAction(pc));
      }
      savePcs(pcsState);
      renderPcCards();
    });
  });

  document.querySelectorAll(".minutes-input").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.index);
      draftMinutes[pcsState[index].id] = input.value;
    });
  });

  document.querySelectorAll(".menu-open-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const index = Number(button.dataset.index);
      const pc = pcsState[index];
      const dropdown = document.getElementById(`dropdown-${index}`);
      const isHidden = dropdown.classList.contains("hidden");
      document.querySelectorAll(".pc-dropdown").forEach((item) => item.classList.add("hidden"));
      dropdown.classList.toggle("hidden", !isHidden);
      openedMenuPcId = isHidden ? pc.id : null;
    });
  });

  document.querySelectorAll(".dropdown-item").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      const action = button.dataset.action;
      applyAction(pcsState[index], action);
      openedMenuPcId = null;
      savePcs(pcsState);
      renderPcCards();
    });
  });

  if (openedMenuPcId) {
    const openIndex = pcsState.findIndex((pc) => pc.id === openedMenuPcId);
    if (openIndex >= 0) {
      const openDropdown = document.getElementById(`dropdown-${openIndex}`);
      if (openDropdown) openDropdown.classList.remove("hidden");
    } else {
      openedMenuPcId = null;
    }
  }
}

// Загрузка и обновление информации о бронированиях
async function loadAndUpdateBookings() {
  try {
    const bookings = await API.getBookings();
    pcsState.forEach(async (pc) => {
      const pcBookings = bookings.filter(b => b.PcId === pc.id);
      const bookingElement = document.querySelector(`[data-pc-id="${pc.id}"] .pc-booking`);
      if (bookingElement) {
        if (pcBookings.length > 0) {
          const times = pcBookings.map(b => b.SlotTime).join(', ');
          bookingElement.textContent = `Бронь: ${times}`;
        } else {
          bookingElement.textContent = 'Бронь: нет';
        }
      }
    });
  } catch (error) {
    console.error('Ошибка загрузки бронирований:', error);
  }
}

document.addEventListener("click", () => {
  document.querySelectorAll(".pc-dropdown").forEach((item) => item.classList.add("hidden"));
  openedMenuPcId = null;
});

async function tickSessionTime() {
  let changed = false;
  pcsState.forEach((pc) => {
    if (pc.status !== "Занят") return;
    if (pc.allocatedMinutes <= 0) {
      endSession(pc);
      changed = true;
      return;
    }
    pc.allocatedMinutes -= 1;
    changed = true;
    if (pc.allocatedMinutes <= 0) {
      endSession(pc);
      pc.lastEvent = "Время сессии истекло";
    }
  });
  if (changed) {
    await savePcs(pcsState);
    renderPcCards();
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  await initializePcs();
  renderPcCards();

  // Запускаем таймер
  setInterval(tickSessionTime, 1000);
});
