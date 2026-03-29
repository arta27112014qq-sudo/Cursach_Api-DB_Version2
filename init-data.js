const sql = require('mssql');

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

async function initializeData() {
    try {
        await sql.connect(config);
        console.log('Подключено к базе данных');

        // 1. Создаем категории
        console.log('Создание категорий...');
        await sql.query`DELETE FROM Categories`;

        const categories = [
            { Name: 'Энергос' },
            { Name: 'Напиток' },
            { Name: 'Сэндвичи' },
            { Name: 'Шоколад' },
            { Name: 'Еда' }
        ];

        for (const category of categories) {
            await sql.query`INSERT INTO Categories (Name) VALUES (${category.Name})`;
        }

        // 2. Создаем товары
        console.log('Создание товаров...');
        await sql.query`DELETE FROM Products`;

        const products = [
            { Name: 'Red Bull', CategoryId: 1, Price: 180, Count: 14, Image: 'pic/rb.jpg' },
            { Name: 'Adrenaline Rush', CategoryId: 1, Price: 170, Count: 12, Image: 'pic/adr.jpg' },
            { Name: 'Monster', CategoryId: 1, Price: 190, Count: 10, Image: 'pic/Monster.jpg' },
            { Name: 'Burn', CategoryId: 1, Price: 165, Count: 10, Image: 'pic/Burn.jpg' },
            { Name: 'Gorilla', CategoryId: 1, Price: 160, Count: 12, Image: 'pic/Gorilla.jpg' },
            { Name: 'Flash Up', CategoryId: 1, Price: 150, Count: 9, Image: 'pic/Flash Up.jpg' },
            { Name: 'Lit Energy', CategoryId: 1, Price: 155, Count: 8, Image: 'pic/Lit Energy.jpg' },
            { Name: 'Water 0.5', CategoryId: 2, Price: 80, Count: 18, Image: 'pic/Water.jpg' },
            { Name: 'Cola 0.5', CategoryId: 2, Price: 120, Count: 16, Image: 'pic/Cola.jpg' },
            { Name: 'Fanta 0.5', CategoryId: 2, Price: 120, Count: 14, Image: 'pic/Fanta.jpg' },
            { Name: 'Juice 0.33', CategoryId: 2, Price: 110, Count: 12, Image: 'pic/Juice.jpg' },
            { Name: 'Sandwich', CategoryId: 3, Price: 220, Count: 10, Image: 'pic/Cookie.jpg' },
            { Name: 'Snickers', CategoryId: 4, Price: 110, Count: 16, Image: 'pic/Snickers.png' },
            { Name: 'Twix', CategoryId: 4, Price: 110, Count: 15, Image: 'pic/Twix.jpg' },
            { Name: 'Mars', CategoryId: 4, Price: 110, Count: 14, Image: 'pic/Mars.jpg' },
            { Name: 'KitKat', CategoryId: 4, Price: 120, Count: 12, Image: 'pic/KitKat.jpg' },
            { Name: 'Bounty', CategoryId: 4, Price: 120, Count: 11, Image: 'pic/Bounty.jpg' },
            { Name: 'Chips', CategoryId: 5, Price: 140, Count: 13, Image: 'pic/Chips.jpg' },
            { Name: 'Nuts', CategoryId: 5, Price: 130, Count: 11, Image: 'pic/Nuts.jpg' },
            { Name: 'Cookies', CategoryId: 5, Price: 100, Count: 12, Image: 'pic/Food.jpg' }
        ];

        for (const product of products) {
            await sql.query`
                INSERT INTO Products (Name, CategoryId, Price, Count, Image) 
                VALUES (${product.Name}, ${product.CategoryId}, ${product.Price}, ${product.Count}, ${product.Image})
            `;
        }

        // 3. Создаем компьютеры
        console.log('Создание компьютеров...');
        await sql.query`DELETE FROM PCs`;

        // VIP ПК (10 шт)
        for (let i = 1; i <= 10; i++) {
            await sql.query`
                INSERT INTO PCs (Id, Tier, Status, Rate, Balance, AllocatedMinutes, SpentTotal, LastEvent) 
                VALUES ('PC-${String(i).padStart(2, '0')}', 'VIP', 'Свободен', 120, 0, 0, 0, 'Готов к запуску')
            `;
        }

        // Комфорт ПК (15 шт)
        for (let i = 11; i <= 25; i++) {
            await sql.query`
                INSERT INTO PCs (Id, Tier, Status, Rate, Balance, AllocatedMinutes, SpentTotal, LastEvent) 
                VALUES ('PC-${String(i).padStart(2, '0')}', 'Комфорт', 'Свободен', 100, 0, 0, 0, 'Готов к запуску')
            `;
        }

        // Стандарт ПК (25 шт)
        for (let i = 26; i <= 50; i++) {
            await sql.query`
                INSERT INTO PCs (Id, Tier, Status, Rate, Balance, AllocatedMinutes, SpentTotal, LastEvent) 
                VALUES ('PC-${String(i).padStart(2, '0')}', 'Стандарт', 'Свободен', 80, 0, 0, 0, 'Готов к запуску')
            `;
        }

        // 4. Создаем отчет
        console.log('Создание отчета...');
        await sql.query`DELETE FROM Reports`;
        await sql.query`
            INSERT INTO Reports (Id, PcRevenueCash, PcRevenueCard, FridgeRevenueCash, FridgeRevenueCard) 
            VALUES (1, 0, 0, 0, 0)
        `;

        // 5. Добавляем несколько тестовых транзакций
        console.log('Создание тестовых транзакций...');
        await sql.query`DELETE FROM Transactions`;

        const testTransactions = [
            { Type: 'cash', Amount: 500, Category: null, Time: '10:00', Date: new Date().toISOString().split('T')[0] },
            { Type: 'card', Amount: 300, Category: null, Time: '11:30', Date: new Date().toISOString().split('T')[0] },
            { Type: 'food', Amount: 180, Category: 'Напитки', Time: '12:00', Date: new Date().toISOString().split('T')[0] },
            { Type: 'cash', Amount: 220, Category: 'Сэндвичи', Time: '13:15', Date: new Date().toISOString().split('T')[0] }
        ];

        for (const transaction of testTransactions) {
            await sql.query`
                INSERT INTO Transactions (Type, Amount, Category, Time, Date) 
                VALUES (${transaction.Type}, ${transaction.Amount}, ${transaction.Category}, ${transaction.Time}, ${transaction.Date})
            `;
        }

        console.log('✅ Данные успешно инициализированы!');
        console.log('Создано:');
        console.log(`- Категорий: ${categories.length}`);
        console.log(`- Товаров: ${products.length}`);
        console.log(`- Компьютеров: 50 (10 VIP, 15 Комфорт, 25 Стандарт)`);
        console.log(`- Транзакций: ${testTransactions.length}`);

    } catch (error) {
        console.error('❌ Ошибка при инициализации данных:', error);
    } finally {
        await sql.close();
    }
}

initializeData();
