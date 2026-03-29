const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Обслуживание статических файлов из папки x/Kursach-main
app.use(express.static(path.join(__dirname, 'x', 'Kursach-main')));

// Подключение к SQLite
const db = new sqlite3.Database('./lanclub.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к SQLite:', err.message);
    } else {
        console.log('Подключено к SQLite database');
        initializeDatabase();
    }
});

// Инициализация базы данных
function initializeDatabase() {
    // Создание таблиц
    db.serialize(() => {
        // Таблица ПК
        db.run(`CREATE TABLE IF NOT EXISTS PCs (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Tier TEXT,
            Status TEXT,
            Rate INTEGER,
            Balance INTEGER,
            AllocatedMinutes INTEGER,
            SpentTotal INTEGER,
            LastEvent TEXT
        )`);

        // Таблица категорий
        db.run(`CREATE TABLE IF NOT EXISTS Categories (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT
        )`);

        // Таблица продуктов
        db.run(`CREATE TABLE IF NOT EXISTS Products (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT,
            CategoryId INTEGER,
            Count INTEGER,
            Price INTEGER,
            Image TEXT,
            FOREIGN KEY (CategoryId) REFERENCES Categories(Id)
        )`);

        // Таблица отчетов
        db.run(`CREATE TABLE IF NOT EXISTS Reports (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            PcRevenueCash INTEGER,
            PcRevenueCard INTEGER,
            FridgeRevenueCash INTEGER,
            FridgeRevenueCard INTEGER
        )`);

        // Таблица транзакций
        db.run(`CREATE TABLE IF NOT EXISTS Transactions (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Type TEXT,
            Amount INTEGER,
            Category TEXT,
            Time TEXT,
            Date TEXT
        )`);

        // Таблица бронирований
        db.run(`CREATE TABLE IF NOT EXISTS Bookings (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            PcId TEXT,
            SlotTime TEXT
        )`);

        // Таблица продаж
        db.run(`CREATE TABLE IF NOT EXISTS Sales (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            CreatedAt TEXT,
            PaymentMethod TEXT,
            TotalAmount INTEGER
        )`);

        // Таблица элементов продаж
        db.run(`CREATE TABLE IF NOT EXISTS SaleItems (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            SaleId INTEGER,
            ProductId INTEGER,
            Quantity INTEGER,
            Price INTEGER,
            FOREIGN KEY (SaleId) REFERENCES Sales(Id),
            FOREIGN KEY (ProductId) REFERENCES Products(Id)
        )`);

        // Добавление начальных данных
        addInitialData();
    });
}

// Добавление начальных данных
function addInitialData() {
    // Проверяем, есть ли уже данные
    db.get('SELECT COUNT(*) as count FROM PCs', (err, row) => {
        if (err) {
            console.error('Ошибка проверки данных:', err);
            return;
        }

        if (row.count === 0) {
            console.log('База данных пуста, добавляем начальные данные...');

            // Добавление категорий
            const categories = [
                'Энергос', 'Напиток', 'Сэндвичи', 'Шоколад', 'Еда'
            ];

            categories.forEach((category, index) => {
                db.run('INSERT INTO Categories (Name) VALUES (?)', [category], (err) => {
                    if (err) console.error('Ошибка добавления категории:', err);
                });
            });

            // Добавление ПК
            for (let i = 1; i <= 25; i++) {
                let tier, rate;
                if (i <= 5) {
                    tier = 'VIP';
                    rate = 150;
                } else if (i <= 15) {
                    tier = 'Комфорт';
                    rate = 100;
                } else {
                    tier = 'Стандарт';
                    rate = 80;
                }

                db.run(
                    'INSERT INTO PCs (Tier, Status, Rate, Balance, AllocatedMinutes, SpentTotal, LastEvent) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [tier, 'Свободен', rate, 0, 0, 0, 'Нет событий'],
                    (err) => {
                        if (err) console.error('Ошибка добавления ПК:', err);
                    }
                );
            }

            // Добавление продуктов
            const products = [
                ['Red Bull', 1, 14, 180, 'pic/rb.jpg'],
                ['Adrenaline Rush', 1, 12, 170, 'pic/adr.jpg'],
                ['Monster', 1, 10, 190, 'pic/Monster.jpg'],
                ['Burn', 1, 10, 165, 'pic/Burn.jpg'],
                ['Gorilla', 1, 12, 160, 'pic/Gorilla.jpg'],
                ['Flash Up', 1, 9, 150, 'pic/Flash Up.jpg'],
                ['Lit Energy', 1, 8, 155, 'pic/Lit Energy.jpg'],
                ['Water 0.5', 2, 18, 80, 'pic/Water.jpg'],
                ['Cola 0.5', 2, 16, 120, 'pic/Cola.jpg'],
                ['Fanta 0.5', 2, 14, 120, 'pic/Fanta.jpg'],
                ['Juice 0.33', 2, 12, 110, 'pic/Juice.jpg'],
                ['Sandwich', 3, 10, 220, 'pic/Cookie.jpg'],
                ['Snickers', 4, 16, 110, 'pic/Snickers.png'],
                ['Twix', 4, 15, 110, 'pic/Twix.jpg'],
                ['Mars', 4, 14, 110, 'pic/Mars.jpg'],
                ['KitKat', 4, 12, 120, 'pic/KitKat.jpg'],
                ['Bounty', 4, 11, 120, 'pic/Bounty.jpg'],
                ['Chips', 5, 13, 140, 'pic/Chips.jpg'],
                ['Nuts', 5, 11, 130, 'pic/Nuts.jpg'],
                ['Cookies', 5, 12, 100, 'pic/Food.jpg']
            ];

            products.forEach(product => {
                db.run(
                    'INSERT INTO Products (Name, CategoryId, Count, Price, Image) VALUES (?, ?, ?, ?, ?)',
                    [product[0], product[1], product[2], product[3], product[4]],
                    (err) => {
                        if (err) console.error('Ошибка добавления продукта:', err);
                    }
                );
            });

            // Добавление отчета
            db.run('INSERT INTO Reports (PcRevenueCash, PcRevenueCard, FridgeRevenueCash, FridgeRevenueCard) VALUES (?, ?, ?, ?)',
                [0, 0, 0, 0], (err) => {
                    if (err) console.error('Ошибка добавления отчета:', err);
                });

            console.log('Начальные данные добавлены в базу данных');
        } else {
            console.log('База данных уже содержит данные');
        }
    });
}

// API для ПК
app.get('/api/pcs', async (req, res) => {
    try {
        db.all('SELECT * FROM PCs', (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для продуктов
app.get('/api/products', async (req, res) => {
    try {
        db.all(`
            SELECT p.*, c.Name as Category 
            FROM Products p 
            JOIN Categories c ON p.CategoryId = c.Id
        `, (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для отчетов
app.get('/api/reports', async (req, res) => {
    try {
        db.get('SELECT * FROM Reports WHERE Id = 1', (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(row || {
                    PcRevenueCash: 0,
                    PcRevenueCard: 0,
                    FridgeRevenueCash: 0,
                    FridgeRevenueCard: 0
                });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для транзакций
app.get('/api/transactions', async (req, res) => {
    try {
        db.all('SELECT * FROM Transactions ORDER BY Date DESC, Time DESC', (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для бронирований
app.get('/api/bookings', async (req, res) => {
    try {
        db.all('SELECT * FROM Bookings ORDER BY SlotTime', (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(rows);
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для продаж (POST)
app.post('/api/sales', (req, res) => {
    try {
        const { items, paymentMethod, foodTotal, topupAmount, topupPc } = req.body;

        console.log('Получен запрос на продажу:', { items, paymentMethod, foodTotal, topupAmount, topupPc });

        // Создаем запись о продаже
        db.run(
            'INSERT INTO Sales (CreatedAt, PaymentMethod, TotalAmount) VALUES (datetime("now"), ?, ?)',
            [paymentMethod, foodTotal],
            function (err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                const saleId = this.lastID;

                // Добавляем товары продажи и обновляем количество
                let completedUpdates = 0;
                const totalUpdates = items.length;

                items.forEach(item => {
                    console.log(`Обновление товара ${item.productId}: -${item.quantity} шт.`);

                    // Сначала обновляем количество товаров
                    db.run(
                        'UPDATE Products SET Count = Count - ? WHERE Id = ?',
                        [item.quantity, item.productId],
                        function (err) {
                            if (err) {
                                console.error('Ошибка обновления товара:', err);
                            } else {
                                console.log(`Товар ${item.productId} обновлен, изменений: ${this.changes}`);
                            }

                            // Затем добавляем запись о продаже товара
                            db.run(
                                'INSERT INTO SaleItems (SaleId, ProductId, Quantity, Price) VALUES (?, ?, ?, ?)',
                                [saleId, item.productId, item.quantity, item.price]
                            );

                            completedUpdates++;
                            if (completedUpdates === totalUpdates) {
                                console.log('Все товары обновлены, обновляем отчеты');

                                // Обновляем отчеты
                                if (foodTotal > 0) {
                                    if (paymentMethod === 'Наличка') {
                                        db.run('UPDATE Reports SET FridgeRevenueCash = FridgeRevenueCash + ? WHERE Id = 1', [foodTotal]);
                                    } else {
                                        db.run('UPDATE Reports SET FridgeRevenueCard = FridgeRevenueCard + ? WHERE Id = 1', [foodTotal]);
                                    }
                                }

                                // Пополнение ПК
                                if (topupAmount > 0 && topupPc) {
                                    db.run('UPDATE PCs SET Balance = Balance + ? WHERE Id = ?', [topupAmount, topupPc]);

                                    if (paymentMethod === 'Наличка') {
                                        db.run('UPDATE Reports SET PcRevenueCash = PcRevenueCash + ? WHERE Id = 1', [topupAmount]);
                                    } else {
                                        db.run('UPDATE Reports SET PcRevenueCard = PcRevenueCard + ? WHERE Id = 1', [topupAmount]);
                                    }
                                }

                                console.log('Продажа успешно завершена');
                                res.json({ success: true });
                            }
                        }
                    );
                });
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для отчетов (PUT)
app.put('/api/reports', (req, res) => {
    try {
        const { PcRevenueCash, PcRevenueCard, FridgeRevenueCash, FridgeRevenueCard } = req.body;

        db.run(
            'UPDATE Reports SET PcRevenueCash = ?, PcRevenueCard = ?, FridgeRevenueCash = ?, FridgeRevenueCard = ? WHERE Id = 1',
            [PcRevenueCash, PcRevenueCard, FridgeRevenueCash, FridgeRevenueCard],
            (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ success: true });
                }
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для бронирований (POST)
app.post('/api/bookings', (req, res) => {
    try {
        const { pcId, slotTime } = req.body;

        // Проверяем, существует ли уже бронирование
        db.get('SELECT * FROM Bookings WHERE PcId = ? AND SlotTime = ?', [pcId, slotTime], (err, existing) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (existing) {
                // Удаляем существующее бронирование
                db.run('DELETE FROM Bookings WHERE PcId = ? AND SlotTime = ?', [pcId, slotTime], (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                    } else {
                        res.json({ success: true, action: 'deleted' });
                    }
                });
            } else {
                // Добавляем новое бронирование
                db.run('INSERT INTO Bookings (PcId, SlotTime) VALUES (?, ?)', [pcId, slotTime], (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                    } else {
                        res.json({ success: true, action: 'created' });
                    }
                });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для ПК (POST - старт сессии)
app.post('/api/pcs/start', (req, res) => {
    try {
        const { pcId, minutes } = req.body;

        db.get('SELECT Rate FROM PCs WHERE Id = ?', [pcId], (err, pc) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (!pc) {
                res.status(404).json({ error: 'ПК не найден' });
                return;
            }

            const cost = Math.round((pc.Rate * minutes) / 60);

            db.run(
                'UPDATE PCs SET AllocatedMinutes = ?, SpentTotal = SpentTotal + ?, Status = ? WHERE Id = ?',
                [minutes, cost, 'Занят', pcId],
                (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                    } else {
                        res.json({ success: true });
                    }
                }
            );
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для ПК (POST - пополнение)
app.post('/api/pcs/topup', (req, res) => {
    try {
        const { pcId, amount } = req.body;

        db.run(
            'UPDATE PCs SET Balance = Balance + ?, LastEvent = ? WHERE Id = ?',
            [amount, `Пополнение через кассу: ${amount} ₽`, pcId],
            (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ success: true });
                }
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для ПК (PUT)
app.put('/api/pcs/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(id);

        db.run(`UPDATE PCs SET ${setClause} WHERE Id = ?`, values, (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ success: true });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для пополнения товаров (PUT)
app.put('/api/products/:id/restock', (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        db.run(
            'UPDATE Products SET Count = Count + ? WHERE Id = ?',
            [amount, id],
            (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ success: true });
                }
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`API доступен по адресу: http://localhost:${PORT}/api`);
    console.log(`Веб-приложение доступно по адресу: http://localhost:${PORT}`);
    console.log('Откройте в браузере: http://localhost:3000/fridge.html');
});
