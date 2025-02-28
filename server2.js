const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const secretKey = 'your_secret_key';

// MySQL bağlantısı oluşturma
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Osman346323',
    database: 'itemshop'
});

db.connect((err) => {
    if (err) {
        console.error('MySQL connection error:', err);
        return;
    }
    console.log('MySQL Connected...');
});

// ------------------------
// Kullanıcı Kayıt İşlemi
// ------------------------
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(sql, [username, hashedPassword], (err, result) => {
            if (err) {
                console.error('Error registering user:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.send('User registered successfully');
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).send('Internal Server Error');
    }
});

// ------------------------
// Kullanıcı Giriş İşlemi
// ------------------------
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';

    db.query(sql, [username], async (err, result) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Internal Server Error');
        }

        if (result.length > 0) {
            const user = result[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                const token = jwt.sign({ userId: user.user_id }, secretKey, { expiresIn: '1h' });
                return res.json({ token });
            } else {
                return res.status(401).send('Invalid username or password');
            }
        } else {
            return res.status(401).send('Invalid username or password');
        }
    });
});

// ------------------------
// Tüm Ürünleri Getir
// ------------------------
app.get('/items', (req, res) => {
    const sql = 'SELECT * FROM items';
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching items:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.json(result);
    });
});

// ------------------------
// Kategoriye Göre Ürün Filtreleme
// ------------------------
app.get('/items/filter', (req, res) => {
    const category = req.query.category;
    const sql = category === 'ALL' 
        ? 'SELECT * FROM items' 
        : 'SELECT * FROM items WHERE category = ?';
    const queryParams = category === 'ALL' ? [] : [category];

    db.query(sql, queryParams, (err, result) => {
        if (err) {
            console.error('Error fetching filtered items:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.json(result);
    });
});

// ------------------------
// Ürün Arama
// ------------------------
app.get('/search', (req, res) => {
    const searchQuery = req.query.q;
    const sql = 'SELECT * FROM items WHERE name LIKE ? OR description LIKE ?';
    db.query(sql, [`%${searchQuery}%`, `%${searchQuery}%`], (err, result) => {
        if (err) {
            console.error('Error searching items:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.json(result);
    });
});

// ------------------------
// Sepete Ürün Ekleme / Güncelleme
// ------------------------
app.post('/basket', (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid Token" });
        }

        const userId = decoded.userId;
        const { item_id, quantity } = req.body;

        if (!item_id || !quantity) {
            return res.status(400).json({ message: "Item ID and quantity are required" });
        }

        const checkSql = 'SELECT * FROM basket WHERE item_id = ? AND user_id = ?';
        db.query(checkSql, [item_id, userId], (err, result) => {
            if (err) {
                console.error('Error checking basket:', err);
                return res.status(500).json({ message: "Internal Server Error" });
            }

            if (result.length > 0) {
                // Ürün zaten varsa miktarı güncelle
                const updateSql = 'UPDATE basket SET quantity = quantity + ? WHERE item_id = ? AND user_id = ?';
                db.query(updateSql, [quantity, item_id, userId], (err, result) => {
                    if (err) {
                        console.error('Error updating basket:', err);
                        return res.status(500).json({ message: "Internal Server Error" });
                    }
                    res.json({ message: 'Item quantity updated in basket' });
                });
            } else {
                // Ürün sepette yoksa yeni ekle
                const insertSql = 'INSERT INTO basket (user_id, item_id, quantity) VALUES (?, ?, ?)';
                db.query(insertSql, [userId, item_id, quantity], (err, result) => {
                    if (err) {
                        console.error('Error adding to basket:', err);
                        return res.status(500).json({ message: "Internal Server Error" });
                    }
                    res.json({ message: 'Item added to basket' });
                });
            }
        });
    });
});

// ------------------------
// Sepet Öğelerini Getir
// ------------------------
app.get('/basket', (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid Token" });
        }

        const userId = decoded.userId;
        const sql = 'SELECT i.*, b.quantity FROM items i JOIN basket b ON i.item_id = b.item_id WHERE b.user_id = ?';

        db.query(sql, [userId], (err, result) => {
            if (err) {
                console.error('Error fetching basket items:', err);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            res.json(result);
        });
    });
});

// ------------------------
// Sepetten Ürün Silme
// ------------------------
app.delete('/basket/:item_id', (req, res) => {
    const { item_id } = req.params;
    const sql = 'DELETE FROM basket WHERE item_id = ?';

    db.query(sql, [item_id], (err, result) => {
        if (err) {
            console.error('Error removing item from basket:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.send('Item removed from basket');
    });
});

// ------------------------
// Sepet Ürün Miktarını Güncelleme
// ------------------------
app.put('/basket/:item_id', (req, res) => {
    const { item_id } = req.params;
    const { quantity } = req.body;
    const sql = 'UPDATE basket SET quantity = quantity + ? WHERE item_id = ?';

    db.query(sql, [quantity, item_id], (err, result) => {
        if (err) {
            console.error('Error updating item quantity in basket:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.send('Item quantity updated in basket');
    });
});

// ------------------------
// Siparişleri Getir
// ------------------------
app.get('/orders', (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid Token" });
        }

        const userId = decoded.userId;
        const sql = 'SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC';

        db.query(sql, [userId], (err, result) => {
            if (err) {
                console.error('Error fetching orders:', err);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            res.json(result);
        });
    });
});

// ------------------------
// Checkout - Sipariş Oluşturma
// ------------------------
app.post('/checkout', (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid Token" });
        }

        const userId = decoded.userId;
        const getTotalPriceQuery = `
            SELECT SUM(i.price * b.quantity) AS total_price 
            FROM items i 
            JOIN basket b ON i.item_id = b.item_id 
            WHERE b.user_id = ?`;

        db.query(getTotalPriceQuery, [userId], (err, result) => {
            if (err) {
                console.error('Error calculating total price:', err);
                return res.status(500).json({ message: "Internal Server Error" });
            }

            const totalPrice = result[0].total_price || 0;
            if (totalPrice === 0) {
                return res.status(400).json({ message: "Basket is empty" });
            }

            const insertOrderQuery = 'INSERT INTO orders (user_id, total_price) VALUES (?, ?)';
            db.query(insertOrderQuery, [userId, totalPrice], (err, result) => {
                if (err) {
                    console.error('Error creating order:', err);
                    return res.status(500).json({ message: "Internal Server Error" });
                }
                res.json({ message: "Order placed successfully", total_price: totalPrice });
            });
        });
    });
});

// ------------------------
// Sepetin Toplam Fiyatını Getir
// ------------------------
app.get('/total-price', (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid Token" });
        }

        const userId = decoded.userId;
        const sql = `
            SELECT COALESCE(SUM(i.price * b.quantity), 0) AS total_price
            FROM items i 
            JOIN basket b ON i.item_id = b.item_id 
            WHERE b.user_id = ?`;

        db.query(sql, [userId], (err, result) => {
            if (err) {
                console.error('Error fetching total price:', err);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            
            const totalPrice = result[0].total_price !== null ? parseFloat(result[0].total_price) : 0;
            console.log("Total Price from DB:", totalPrice);
            res.json({ total_price: totalPrice });
        });
    });
});

// ------------------------
// Kullanıcı Profil Bilgilerini Getir
// ------------------------
app.get('/profile', (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid Token" });
        }

        const sql = 'SELECT user_id, username FROM users WHERE user_id = ?';
        db.query(sql, [decoded.userId], (err, result) => {
            if (err) {
                console.error('Error fetching user profile:', err);
                return res.status(500).json({ message: "Internal Server Error" });
            }
            if (result.length > 0) {
                res.json(result[0]);
            } else {
                res.status(404).json({ message: "User not found" });
            }
        });
    });
});

// ------------------------
// Sunucuyu Başlatma
// ------------------------
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
