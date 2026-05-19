const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cors = require('cors');

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
        console.error('Erreur MySQL:', err.message);
        console.log(' Vérifiez que XAMPP est démarré');
        return;
    }
    console.log(' Trafic service - Connecté à MySQL');
});

const AUTH_SERVICE_URL = 'http://localhost:5001';

// ========== MIDDLEWARE : Vérification du token JWT ==========
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
            error: 'Erreur d\'authentification'
        });
    }
};


const calculerClassification = (densite) => {
    if (densite < 30) return 'Faible';
    if (densite < 70) return 'Moyen';
    return 'Élevé';
};

app.post('/zones', verifierToken, (req, res) => {
    const { nom, description, densite } = req.body;

    if (!nom) {
        return res.status(400).json({
            success: false,
            error: 'Le nom de la zone est requis'
        });
    }

    const densiteValue = densite || 0;
    const classification = calculerClassification(densiteValue);

    db.query(
        'INSERT INTO zones_trafic (nom, description, densite, classification) VALUES (?, ?, ?, ?)',
        [nom, description, densiteValue, classification],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            res.status(201).json({
                success: true,
                message: ' Zone créée avec succès',
                zone: {
                    id: result.insertId,
                    nom,
                    description,
                    densite: densiteValue,
                    classification
                }
            });
        }
    );
});

app.get('/zones', verifierToken, (req, res) => {
    db.query('SELECT * FROM zones_trafic ORDER BY id DESC', (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        res.json({
            success: true,
            count: results.length,
            zones: results
        });
    });
});

app.patch('/zones/:id/densite', verifierToken, (req, res) => {
    const { id } = req.params;
    const { densite } = req.body;

    if (densite === undefined || densite < 0 || densite > 100) {
        return res.status(400).json({
            success: false,
            error: 'La densité doit être un nombre entre 0 et 100'
        });
    }

    const classification = calculerClassification(densite);

    db.query(
        'UPDATE zones_trafic SET densite = ?, classification = ? WHERE id = ?',
        [densite, classification, id],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Zone non trouvée'
                });
            }

            res.json({
                success: true,
                message: ' Densité mise à jour',
                zone: { id, densite, classification }
            });
        }
    );
});

app.get('/zones/congestionnees', verifierToken, (req, res) => {
    db.query(
        "SELECT * FROM zones_trafic WHERE classification = 'Élevé' ORDER BY densite DESC",
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            res.json({
                success: true,
                count: results.length,
                zones_congestionnees: results
            });
        }
    );
});

app.get('/zones/statistiques/globales', verifierToken, (req, res) => {
    db.query(`
        SELECT 
            COUNT(*) as total_zones,
            AVG(densite) as densite_moyenne,
            SUM(CASE WHEN classification = 'Faible' THEN 1 ELSE 0 END) as zones_faibles,
            SUM(CASE WHEN classification = 'Moyen' THEN 1 ELSE 0 END) as zones_moyennes,
            SUM(CASE WHEN classification = 'Élevé' THEN 1 ELSE 0 END) as zones_elevees
        FROM zones_trafic
    `, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        res.json({
            success: true,
            statistiques: results[0]
        });
    });
});

const PORT = 5003;
app.listen(PORT, () => {
    console.log(`🚦 Service Trafic démarré sur http://localhost:${PORT}`);
    console.log(`   📋 Routes disponibles :`);
    console.log(`   POST   /zones                      - Créer une zone`);
    console.log(`   GET    /zones                      - Lister les zones`);
    console.log(`   PATCH  /zones/:id/densite          - Mettre à jour densité`);
    console.log(`   GET    /zones/congestionnees       - Zones congestionnées`);
    console.log(`   GET    /zones/statistiques/globales - Statistiques`);
});