const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Конфигурация подключения к SQL Server
const config = {
    server: 'localhost\\SQLEXPRESS',  // Именованный экземпляр
    database: 'LanClubDB',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        trustedConnection: true  // Использовать аутентификацию Windows
    }
};

// Подключение к базе данных
sql.connect(config)
    .then(() => console.log('Подключено к SQL Server'))
    .catch(err => console.error('Ошибка подключения:', err));

// API для ПК
app.get('/api/pcs', async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM PCs`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pcs/start', async (req, res) => {
    try {
        const { pcId, minutes } = req.body;
        const rateResult = await sql.query`SELECT Rate FROM PCs WHERE Id = ${pcId}`;
        const rate = rateResult.recordset[0].Rate;
        const cost = (rate * minutes) / 60;

        await sql.query`UPDATE PCs SET AllocatedMinutes = ${minutes}, SpentTotal = SpentTotal + ${cost}, Status = 'Занят' WHERE Id = ${pcId}`;

        // Добавляем сессию
        await sql.query`INSERT INTO PCSessions (PcId, StartTime, Minutes, Cost) VALUES (${pcId}, GETDATE(), ${minutes}, ${cost})`;

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pcs/topup', async (req, res) => {
    try {
        const { pcId, amount } = req.body;
        await sql.query`UPDATE PCs SET Balance = Balance + ${amount}, LastEvent = 'Пополнение через кассу: ' + ${amount} + ' ₽' WHERE Id = ${pcId}`;

        // Добавляем транзакцию
        await sql.query`INSERT INTO Transactions (Type, Amount, Category, Time, Date) VALUES ('cash', ${amount}, NULL, FORMAT(GETDATE(), 'HH:mm'), FORMAT(GETDATE(), 'yyyy-MM-dd'))`;

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/pcs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const setClause = Object.keys(updates).map(key => `${key} = ${updates[key]}`).join(', ');
        await sql.query`UPDATE PCs SET ${setClause} WHERE Id = ${id}`;

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для продуктов
app.get('/api/products', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT p.*, c.Name as Category 
            FROM Products p 
            JOIN Categories c ON p.CategoryId = c.Id
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sales', async (req, res) => {
    try {
        const { items, paymentMethod, foodTotal, topupAmount, topupPc } = req.body;

        // Создаем продажу
        const saleResult = await sql.query`INSERT INTO Sales (CreatedAt, PaymentMethod, TotalAmount) OUTPUT INSERTED.Id VALUES (GETDATE(), ${paymentMethod}, ${foodTotal})`;
        const saleId = saleResult.recordset[0].Id;

        // Добавляем товары продажи
        for (const item of items) {
            await sql.query`INSERT INTO SaleItems (SaleId, ProductId, Quantity, Price) VALUES (${saleId}, ${item.productId}, ${item.quantity}, ${item.price})`;
            await sql.query`UPDATE Products SET Count = Count - ${item.quantity} WHERE Id = ${item.productId}`;
        }

        // Обновляем отчет
        if (foodTotal > 0) {
            if (paymentMethod === 'Наличка') {
                await sql.query`UPDATE Reports SET FridgeRevenueCash = FridgeRevenueCash + ${foodTotal} WHERE Id = 1`;
            } else {
                await sql.query`UPDATE Reports SET FridgeRevenueCard = FridgeRevenueCard + ${foodTotal} WHERE Id = 1`;
            }
        }

        // Пополнение ПК
        if (topupAmount > 0 && topupPc) {
            await sql.query`UPDATE PCs SET Balance = Balance + ${topupAmount} WHERE Id = ${topupPc}`;

            if (paymentMethod === 'Наличка') {
                await sql.query`UPDATE Reports SET PcRevenueCash = PcRevenueCash + ${topupAmount} WHERE Id = 1`;
            } else {
                await sql.query`UPDATE Reports SET PcRevenueCard = PcRevenueCard + ${topupAmount} WHERE Id = 1`;
            }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для отчетов
app.get('/api/reports', async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM Reports WHERE Id = 1`;
        res.json(result.recordset[0] || {
            PcRevenueCash: 0,
            PcRevenueCard: 0,
            FridgeRevenueCash: 0,
            FridgeRevenueCard: 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/reports', async (req, res) => {
    try {
        const { PcRevenueCash, PcRevenueCard, FridgeRevenueCash, FridgeRevenueCard } = req.body;
        await sql.query`
            UPDATE Reports 
            SET PcRevenueCash = ${PcRevenueCash}, 
                PcRevenueCard = ${PcRevenueCard}, 
                FridgeRevenueCash = ${FridgeRevenueCash}, 
                FridgeRevenueCard = ${FridgeRevenueCard} 
            WHERE Id = 1
        `;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для транзакций
app.get('/api/transactions', async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM Transactions ORDER BY Date DESC, Time DESC`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для бронирований
app.get('/api/bookings', async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM Bookings ORDER BY SlotTime`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { pcId, slotTime } = req.body;

        // Проверяем, существует ли уже бронирование
        const existing = await sql.query`SELECT * FROM Bookings WHERE PcId = ${pcId} AND SlotTime = ${slotTime}`;

        if (existing.recordset.length > 0) {
            // Удаляем существующее бронирование
            await sql.query`DELETE FROM Bookings WHERE PcId = ${pcId} AND SlotTime = ${slotTime}`;
        } else {
            // Добавляем новое бронирование
            await sql.query`INSERT INTO Bookings (PcId, SlotTime) VALUES (${pcId}, ${slotTime})`;
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
