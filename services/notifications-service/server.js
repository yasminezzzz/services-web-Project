const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_traffic'
});

db.connect((err) => {
    if (err) {
        console.error(' Erreur MySQL:', err.message);
        console.log(' Vérifiez que XAMPP est démarré');
        return;
    }
    console.log('✅ Notifications service - Connecté à MySQL');
});

const AUTH_SERVICE_URL = 'http://localhost:5001';

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

const envoyerNotification = (utilisateur_id, titre, message, incident_id = null, callback) => {
    db.query(
        'INSERT INTO notifications (utilisateur_id, titre, message, incident_id, est_lue) VALUES (?, ?, ?, ?, ?)',
        [utilisateur_id, titre, message, incident_id, false],
        (err, result) => {
            if (err) {
                console.error('Erreur insertion notification:', err);
                if (callback) callback(err, null);
                return;
            }

            console.log(` Notification envoyée à l'utilisateur ${utilisateur_id}: ${titre}`);
            if (callback) callback(null, { id: result.insertId, utilisateur_id, titre, message });
        }
    );
};


app.post('/notifications', verifierToken, (req, res) => {
    const { utilisateur_id, titre, message, incident_id } = req.body;

    // Vérifier si l'utilisateur est ADMIN
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            error: 'Accès non autorisé. Seul un ADMIN peut envoyer des notifications.'
        });
    }

    if (!utilisateur_id || !titre || !message) {
        return res.status(400).json({
            success: false,
            error: 'Champs requis: utilisateur_id, titre, message'
        });
    }

    // Vérifier que l'utilisateur existe
    db.query('SELECT id, username, email FROM users WHERE id = ?', [utilisateur_id], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        envoyerNotification(utilisateur_id, titre, message, incident_id || null, (err, notification) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            res.status(201).json({
                success: true,
                message: '✅ Notification envoyée',
                notification: {
                    ...notification,
                    destinataire: results[0]
                }
            });
        });
    });
});


app.get('/notifications', verifierToken, (req, res) => {
    const { est_lue } = req.query;

    let sql = 'SELECT * FROM notifications WHERE utilisateur_id = ?';
    const params = [req.user.id];

    if (est_lue !== undefined) {
        sql += ' AND est_lue = ?';
        params.push(est_lue === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC';

    db.query(sql, params, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        const nonLues = results.filter(n => !n.est_lue).length;

        res.json({
            success: true,
            total: results.length,
            non_lues: nonLues,
            notifications: results
        });
    });
});

app.get('/notifications/:id', verifierToken, (req, res) => {
    const { id } = req.params;

    db.query(
        'SELECT * FROM notifications WHERE id = ? AND utilisateur_id = ?',
        [id, req.user.id],
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Notification non trouvée'
                });
            }

            res.json({
                success: true,
                notification: results[0]
            });
        }
    );
});

app.patch('/notifications/:id/lire', verifierToken, (req, res) => {
    const { id } = req.params;

    db.query(
        'SELECT * FROM notifications WHERE id = ? AND utilisateur_id = ?',
        [id, req.user.id],
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Notification non trouvée'
                });
            }

            if (results[0].est_lue) {
                return res.json({
                    success: true,
                    message: 'Notification déjà lue',
                    notification: results[0]
                });
            }

            db.query(
                'UPDATE notifications SET est_lue = true WHERE id = ?',
                [id],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            error: err.message
                        });
                    }

                    res.json({
                        success: true,
                        message: '✅ Notification marquée comme lue',
                        notification: {
                            id: parseInt(id),
                            est_lue: true,
                            lue_le: new Date().toISOString()
                        }
                    });
                }
            );
        }
    );
});

app.patch('/notifications/marquer-toutes-lues', verifierToken, (req, res) => {
    db.query(
        'UPDATE notifications SET est_lue = true WHERE utilisateur_id = ? AND est_lue = false',
        [req.user.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            res.json({
                success: true,
                message: ` ${result.affectedRows} notification(s) marquée(s) comme lue(s)`,
                notifications_mises_a_jour: result.affectedRows
            });
        }
    );
});

app.delete('/notifications/:id', verifierToken, (req, res) => {
    const { id } = req.params;

    db.query(
        'DELETE FROM notifications WHERE id = ? AND utilisateur_id = ?',
        [id, req.user.id],
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
                    error: 'Notification non trouvée'
                });
            }

            res.json({
                success: true,
                message: '✅ Notification supprimée'
            });
        }
    );
});

// ========== ROUTE 7 : Compter les notifications non lues ==========
app.get('/notifications/non-lues/compteur', verifierToken, (req, res) => {
    db.query(
        'SELECT COUNT(*) as non_lues FROM notifications WHERE utilisateur_id = ? AND est_lue = false',
        [req.user.id],
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            res.json({
                success: true,
                non_lues: results[0].non_lues
            });
        }
    );
});


const PORT = 5005;
app.listen(PORT, () => {
    console.log(`🔔 Service Notifications démarré sur http://localhost:${PORT}`);
    console.log(`   📋 Routes disponibles :`);
    console.log(`   POST   /notifications                      - Envoyer (ADMIN only)`);
    console.log(`   GET    /notifications                      - Mes notifications`);
    console.log(`   GET    /notifications/:id                  - Détail notification`);
    console.log(`   PATCH  /notifications/:id/lire             - Marquer comme lue`);
    console.log(`   PATCH  /notifications/marquer-toutes-lues  - Tout marquer`);
    console.log(`   DELETE /notifications/:id                  - Supprimer`);
    console.log(`   GET    /notifications/non-lues/compteur    - Compter non lues`);
});