import { API } from '../../api.js';

const DEFAULT_STOCK = [
  { name: "Red Bull", category: "Энергос", count: 14, price: 180, image: "pic/rb.jpg" },
  { name: "Adrenaline Rush", category: "Энергос", count: 12, price: 170, image: "pic/adr.jpg" },
  { name: "Monster", category: "Энергос", count: 10, price: 190, image: "pic/Monster.jpg" },
  { name: "Burn", category: "Энергос", count: 10, price: 165, image: "pic/Burn.jpg" },
  { name: "Gorilla", category: "Энергос", count: 12, price: 160, image: "pic/Gorilla.jpg" },
  { name: "Flash Up", category: "Энергос", count: 9, price: 150, image: "pic/Flash Up.jpg" },
  { name: "Lit Energy", category: "Энергос", count: 8, price: 155, image: "pic/Lit Energy.jpg" },
  { name: "Water 0.5", category: "Напиток", count: 18, price: 80, image: "pic/Water.jpg" },
  { name: "Cola 0.5", category: "Напиток", count: 16, price: 120, image: "pic/Cola.jpg" },
  { name: "Fanta 0.5", category: "Напиток", count: 14, price: 120, image: "pic/Fanta.jpg" },
  { name: "Juice 0.33", category: "Напиток", count: 12, price: 110, image: "pic/Juice.jpg" },
  { name: "Sandwich", category: "Сэндвичи", count: 10, price: 220, image: "pic/Cookie.jpg" },
  { name: "Snickers", category: "Шоколад", count: 16, price: 110, image: "pic/Snickers.png" },
  { name: "Twix", category: "Шоколад", count: 15, price: 110, image: "pic/Twix.jpg" },
  { name: "Mars", category: "Шоколад", count: 14, price: 110, image: "pic/Mars.jpg" },
  { name: "KitKat", category: "Шоколад", count: 12, price: 120, image: "pic/KitKat.jpg" },
  { name: "Bounty", category: "Шоколад", count: 11, price: 120, image: "pic/Bounty.jpg" },
  { name: "Chips", category: "Еда", count: 13, price: 140, image: "pic/Chips.jpg" },
  { name: "Nuts", category: "Еда", count: 11, price: 130, image: "pic/Nuts.jpg" },
  { name: "Cookies", category: "Еда", count: 12, price: 100, image: "pic/Food.jpg" },
];

// Загрузка товаров с сервера
async function loadStock() {
  try {
    const products = await API.getProducts();
    console.log('Получено товаров с сервера:', products.length);

    if (products.length === 0) {
      console.log('Товары не найдены, используем стандартные данные');
      return DEFAULT_STOCK;
    }

    const mappedProducts = products.map(product => ({
      id: product.Id || product.id,
      name: product.Name || product.name || 'Товар без названия',
      category: product.Category || product.category || 'Без категории',
      count: Number(product.Count || product.count || 0),
      price: Number(product.Price || product.price || 0),
      image: product.Image || product.image || 'pic/Food.jpg'
    }));

    console.log('Обработанные товары:', mappedProducts);
    return mappedProducts;
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
    return DEFAULT_STOCK;
  }
}

// Сохранение товаров на сервере (через продажи)
async function saveStock(items) {
  // Товары обновляются автоматически при создании продаж
  console.log('Товары будут обновлены при продаже');
}

// Загрузка отчета с сервера
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

// Сохранение отчета на сервере
async function saveReport(report) {
  try {
    await API.updateReports(report);
  } catch (error) {
    console.error('Ошибка сохранения отчета:', error);
  }
}

// Добавление дохода от холодильника
async function addFridgeRevenue(amount, paymentMethod = 'Наличка') {
  const safeAmount = Number(amount || 0);
  if (safeAmount <= 0) return;

  try {
    const report = await loadReport();
    if (paymentMethod === 'Наличка') {
      report.fridgeRevenueCash += safeAmount;
    } else {
      report.fridgeRevenueCard += safeAmount;
    }
    await saveReport(report);
  } catch (error) {
    console.error('Ошибка добавления дохода холодильника:', error);
  }
}

// Добавление дохода от ПК
async function addPcRevenue(amount, paymentMethod = 'Наличка') {
  const safeAmount = Number(amount || 0);
  if (safeAmount <= 0) return;

  try {
    const report = await loadReport();
    if (paymentMethod === 'Наличка') {
      report.pcRevenueCash += safeAmount;
    } else {
      report.pcRevenueCard += safeAmount;
    }
    await saveReport(report);
  } catch (error) {
    console.error('Ошибка добавления дохода ПК:', error);
  }
}

// Загрузка списка ПК с сервера
async function loadPcList() {
  try {
    const pcs = await API.getPCs();
    return pcs.map(pc => ({
      id: pc.Id,
      tier: pc.Tier,
      status: pc.Status,
      rate: pc.Rate,
      balance: pc.Balance,
      allocatedMinutes: pc.AllocatedMinutes,
      spentTotal: pc.SpentTotal,
      lastEvent: pc.LastEvent
    }));
  } catch (error) {
    console.error('Ошибка загрузки ПК:', error);
    return [];
  }
}

// Пополнение баланса ПК
async function addBalanceToPc(pcId, amount) {
  const safeAmount = Number(amount || 0);
  if (!pcId || safeAmount <= 0) return false;

  try {
    await API.topupPC(pcId, safeAmount);
    return true;
  } catch (error) {
    console.error('Ошибка пополнения ПК:', error);
    return false;
  }
}

export { loadStock, saveStock, loadReport, saveReport, addPcRevenue };
