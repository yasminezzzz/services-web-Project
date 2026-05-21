require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Connexion MySQL via variables d'environnement
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
    console.log('✅ Incidents service - Connecté à MySQL');
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
            res.status(401).json({ success: false, error: 'Token invalide ou expiré' });
        }
    } catch (error) {
        res.status(401).json({ success: false, error: 'Erreur d\'authentification' });
    }
};

const typesValides = ['Accident', 'Travaux', 'Route fermée', 'Embouteillage'];
const statutsValides = ['Signalé', 'En cours', 'Résolu'];

// ========== ROUTES (inchangées) ==========
app.post('/incidents', verifierToken, (req, res) => {
    const { type, description, zone_id, latitude, longitude } = req.body;
    if (!type || !typesValides.includes(type)) {
        return res.status(400).json({
            success: false,
            error: `Type invalide. Types acceptés: ${typesValides.join(', ')}`
        });
    }
    if (!description) {
        return res.status(400).json({ success: false, error: 'La description est requise' });
    }
    db.query(
        `INSERT INTO incidents (type, description, zone_id, latitude, longitude, declare_par, statut)
         VALUES (?, ?, ?, ?, ?, ?, 'Signalé')`,
        [type, description, zone_id || null, latitude || null, longitude || null, req.user.id],
        (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.status(201).json({
                success: true,
                message: '✅ Incident déclaré avec succès',
                incident: {
                    id: result.insertId,
                    type,
                    description,
                    zone_id,
                    latitude,
                    longitude,
                    statut: 'Signalé',
                    declare_par: req.user.id,
                    declare_par_nom: req.user.username
                }
            });
        }
    );
});

app.get('/incidents', verifierToken, (req, res) => {
    const { statut, type } = req.query;
    let sql = `
        SELECT i.*, u.username as declare_par_nom, z.nom as zone_nom
        FROM incidents i
                 LEFT JOIN users u ON i.declare_par = u.id
                 LEFT JOIN zones_trafic z ON i.zone_id = z.id
    `;
    const params = [];
    const conditions = [];
    if (statut && statutsValides.includes(statut)) {
        conditions.push('i.statut = ?');
        params.push(statut);
    }
    if (type && typesValides.includes(type)) {
        conditions.push('i.type = ?');
        params.push(type);
    }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY i.created_at DESC';
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, count: results.length, incidents: results });
    });
});

app.get('/incidents/:id', verifierToken, (req, res) => {
    const { id } = req.params;
    db.query(
        `SELECT i.*, u.username as declare_par_nom, z.nom as zone_nom
         FROM incidents i
                  LEFT JOIN users u ON i.declare_par = u.id
                  LEFT JOIN zones_trafic z ON i.zone_id = z.id
         WHERE i.id = ?`,
        [id],
        (err, results) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            if (results.length === 0) return res.status(404).json({ success: false, error: 'Incident non trouvé' });
            res.json({ success: true, incident: results[0] });
        }
    );
});

app.patch('/incidents/:id/statut', verifierToken, (req, res) => {
    const { id } = req.params;
    const { statut } = req.body;
    if (!statut || !statutsValides.includes(statut)) {
        return res.status(400).json({ success: false, error: `Statut invalide. Statuts acceptés: ${statutsValides.join(', ')}` });
    }
    db.query('SELECT * FROM incidents WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (results.length === 0) return res.status(404).json({ success: false, error: 'Incident non trouvé' });
        const ancienStatut = results[0].statut;
        db.query('UPDATE incidents SET statut = ? WHERE id = ?', [statut, id], (err2) => {
            if (err2) return res.status(500).json({ success: false, error: err2.message });
            res.json({ success: true, message: '✅ Statut mis à jour', incident: { id: parseInt(id), ancien_statut: ancienStatut, nouveau_statut: statut } });
        });
    });
});

app.delete('/incidents/:id', verifierToken, (req, res) => {
    const { id } = req.params;
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Accès non autorisé. Réservé aux administrateurs.' });
    }
    db.query('DELETE FROM incidents WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Incident non trouvé' });
        res.json({ success: true, message: '✅ Incident supprimé avec succès' });
    });
});

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
    console.log(`⚠️ Service Incidents démarré sur http://localhost:${PORT}`);
    console.log(`   📋 Routes disponibles :`);
    console.log(`   POST   /incidents                 - Déclarer un incident`);
    console.log(`   GET    /incidents                 - Lister les incidents`);
    console.log(`   GET    /incidents/:id             - Détail d'un incident`);
    console.log(`   PATCH  /incidents/:id/statut      - Modifier le statut`);
    console.log(`   DELETE /incidents/:id             - Supprimer (ADMIN only)`);
});