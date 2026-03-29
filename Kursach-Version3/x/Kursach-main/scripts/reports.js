import { API } from '../../api.js';

function formatRub(value) {
  return `${value.toLocaleString("ru-RU")} ₽`;
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

function renderRevenue(report) {
  const pcTotal = report.pcRevenueCash + report.pcRevenueCard;
  const fridgeTotal = report.fridgeRevenueCash + report.fridgeRevenueCard;
  const dayTotal = pcTotal + fridgeTotal;

  document.getElementById("pcRevenueTotal").textContent = formatRub(pcTotal);
  document.getElementById("fridgeRevenueTotal").textContent = formatRub(fridgeTotal);
  document.getElementById("dayTotal").textContent = formatRub(dayTotal);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  const reportState = await loadReport();
  renderRevenue(reportState);

  document.getElementById("pcRevenueCashInput").value = reportState.pcRevenueCash;
  document.getElementById("pcRevenueCardInput").value = reportState.pcRevenueCard;
  document.getElementById("fridgeRevenueCashInput").value = reportState.fridgeRevenueCash;
  document.getElementById("fridgeRevenueCardInput").value = reportState.fridgeRevenueCard;

  // Добавляем обработчик для кнопки сохранения
  const saveBtn = document.getElementById('saveReportBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const report = {
        pcRevenueCash: Number(document.getElementById("pcRevenueCashInput").value || 0),
        pcRevenueCard: Number(document.getElementById("pcRevenueCardInput").value || 0),
        fridgeRevenueCash: Number(document.getElementById("fridgeRevenueCashInput").value || 0),
        fridgeRevenueCard: Number(document.getElementById("fridgeRevenueCardInput").value || 0)
      };

      await saveReport(report);
      renderRevenue(report);
      alert('Отчет сохранен');
    });
  }
});
