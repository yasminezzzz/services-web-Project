const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Connexion à MySQL (XAMPP)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_traffic'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Erreur MySQL:', err.message);
        console.log('💡 Vérifiez que XAMPP est démarré');
        return;
    }
    console.log('✅ Auth service - Connecté à MySQL');
});

const JWT_SECRET = 'mon_super_secret_2026';

// ========== ROUTE 1: INSCRIPTION ==========
app.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Tous les champs sont requis'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            error: 'Mot de passe trop court (min 6 caractères)'
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, role || 'OPERATOR'],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({
                            success: false,
                            error: 'Cet email existe déjà'
                        });
                    }
                    return res.status(500).json({
                        success: false,
                        error: err.message
                    });
                }

                res.status(201).json({
                    success: true,
                    message: '✅ Utilisateur créé avec succès',
                    userId: result.insertId
                });
            }
        );
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// ========== ROUTE 2: CONNEXION ==========
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email et mot de passe requis'
        });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Email ou mot de passe incorrect'
            });
        }

        const user = results[0];
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Email ou mot de passe incorrect'
            });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    });
});

// ========== ROUTE 3: VÉRIFICATION TOKEN ==========
app.post('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ valid: false });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ valid: false });
    }
});

// ========== DÉMARRAGE ==========
const PORT = 5001;
app.listen(PORT, () => {
    console.log(`🔐 Auth service: http://localhost:${PORT}`);
    console.log('   📝 Routes disponibles:');
    console.log('   - POST /register');
    console.log('   - POST /login');
    console.log('   - POST /verify');
});