const API_URL = "http://localhost:3000/api";

async function apiRequest(url, method = "GET", body = null) {
    const res = await fetch(API_URL + url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : null
    });

    if (!res.ok) throw new Error("API error");
    return res.json();
}

export const API = {
    // ПК
    getPCs: () => apiRequest("/pcs"),
    startSession: (pcId, minutes) => apiRequest("/pcs/start", "POST", { pcId, minutes }),
    topupPC: (pcId, amount) => apiRequest("/pcs/topup", "POST", { pcId, amount }),
    updatePC: (pcId, data) => apiRequest(`/pcs/${pcId}`, "PUT", data),

    // Продукты и продажи
    getProducts: () => apiRequest("/products"),
    restockProduct: (productId, amount) => apiRequest(`/products/${productId}/restock`, "PUT", { amount }),
    createSale: (data) => apiRequest("/sales", "POST", data),

    // Отчеты
    getReports: () => apiRequest("/reports"),
    updateReports: (data) => apiRequest("/reports", "PUT", data),

    // Транзакции
    getTransactions: () => apiRequest("/transactions"),

    // Бронирования
    getBookings: () => apiRequest("/bookings"),
    toggleBooking: (pcId, slotTime) => apiRequest("/bookings", "POST", { pcId, slotTime })
};
