require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Connexion à MySQL via variables d'environnement
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('❌ Erreur MySQL:', err.message);
        console.log('💡 Vérifiez que XAMPP est démarré');
        return;
    }
    console.log('✅ Vehicules service - Connecté à MySQL');
});

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

// Middleware de vérification JWT (identique)
const verifierToken = async (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Token manquant. Veuillez vous connecter.'
        });
    }

    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/verify`, {}, {
            headers: { authorization: token }
        });

        if (response.data.valid) {
            req.user = response.data.user;
            next();
        } else {
            res.status(401).json({
                success: false,
                error: 'Token invalide ou expiré'
            });
        }
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Erreur d\'authentification. Service Auth indisponible ?'
        });
    }
};

// ========== ROUTES (inchangées) ==========
app.post('/vehicules', verifierToken, (req, res) => {
    const { immatriculation, marque, modele, proprietaire_id } = req.body;

    if (!immatriculation || !marque || !modele) {
        return res.status(400).json({
            success: false,
            error: 'Champs requis: immatriculation, marque, modele'
        });
    }

    const proprietaire = proprietaire_id || req.user.id;

    db.query(
        'INSERT INTO vehicules (immatriculation, marque, modele, proprietaire_id) VALUES (?, ?, ?, ?)',
        [immatriculation, marque, modele, proprietaire],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({
                        success: false,
                        error: 'Cette immatriculation existe déjà'
                    });
                }
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }
            res.status(201).json({
                success: true,
                message: '✅ Véhicule ajouté avec succès',
                vehicule: {
                    id: result.insertId,
                    immatriculation,
                    marque,
                    modele
                }
            });
        }
    );
});

app.get('/vehicules', verifierToken, (req, res) => {
    db.query('SELECT * FROM vehicules ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, count: results.length, vehicules: results });
    });
});

app.get('/vehicules/:id', verifierToken, (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM vehicules WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (results.length === 0) return res.status(404).json({ success: false, error: 'Véhicule non trouvé' });
        res.json({ success: true, vehicule: results[0] });
    });
});

app.post('/positions', verifierToken, (req, res) => {
    const { vehicule_id, latitude, longitude, vitesse } = req.body;
    if (!vehicule_id || !latitude || !longitude) {
        return res.status(400).json({ success: false, error: 'Champs requis: vehicule_id, latitude, longitude' });
    }
    db.query('SELECT id FROM vehicules WHERE id = ?', [vehicule_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (results.length === 0) return res.status(404).json({ success: false, error: 'Véhicule non trouvé' });
        db.query(
            'INSERT INTO positions_gps (vehicule_id, latitude, longitude, vitesse) VALUES (?, ?, ?, ?)',
            [vehicule_id, latitude, longitude, vitesse || null],
            (err2, result) => {
                if (err2) return res.status(500).json({ success: false, error: err2.message });
                res.status(201).json({
                    success: true,
                    message: '✅ Position GPS enregistrée',
                    position: {
                        id: result.insertId,
                        vehicule_id,
                        latitude,
                        longitude,
                        vitesse: vitesse || null
                    }
                });
            }
        );
    });
});

app.get('/positions/:vehicule_id', verifierToken, (req, res) => {
    const { vehicule_id } = req.params;
    db.query(
        `SELECT p.*, v.immatriculation, v.marque, v.modele
         FROM positions_gps p
                  JOIN vehicules v ON p.vehicule_id = v.id
         WHERE p.vehicule_id = ?
         ORDER BY p.timestamp DESC`,
        [vehicule_id],
        (err, results) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, count: results.length, historique: results });
        }
    );
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`🚗 Service Véhicules démarré sur http://localhost:${PORT}`);
    console.log(`   📋 Routes disponibles :`);
    console.log(`   POST   /vehicules        - Ajouter un véhicule`);
    console.log(`   GET    /vehicules        - Lister les véhicules`);
    console.log(`   GET    /vehicules/:id    - Détail d'un véhicule`);
    console.log(`   POST   /positions        - Enregistrer position GPS`);
    console.log(`   GET    /positions/:id    - Historique des positions`);
});