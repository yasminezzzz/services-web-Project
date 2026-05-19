-- =============================================
-- SMART TRAFFIC MONITORING SYSTEM
-- Base de données : smart_traffic
-- =============================================

-- Supprimer la base si elle existe (optionnel)
DROP DATABASE IF EXISTS smart_traffic;

-- Créer la base de données
CREATE DATABASE IF NOT EXISTS smart_traffic;
USE smart_traffic;

-- =============================================
-- 1. TABLE USERS (pour Auth Service)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
                                     id INT PRIMARY KEY AUTO_INCREMENT,
                                     username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'OPERATOR') DEFAULT 'OPERATOR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- =============================================
-- 2. TABLE VEHICULES (pour Vehicules Service)
-- =============================================
CREATE TABLE IF NOT EXISTS vehicules (
                                         id INT PRIMARY KEY AUTO_INCREMENT,
                                         immatriculation VARCHAR(20) UNIQUE NOT NULL,
    marque VARCHAR(50) NOT NULL,
    modele VARCHAR(50) NOT NULL,
    proprietaire_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proprietaire_id) REFERENCES users(id) ON DELETE SET NULL
    );

-- =============================================
-- 3. TABLE POSITIONS GPS (pour Vehicules Service)
-- =============================================
CREATE TABLE IF NOT EXISTS positions_gps (
                                             id INT PRIMARY KEY AUTO_INCREMENT,
                                             vehicule_id INT NOT NULL,
                                             latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    vitesse DECIMAL(5,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicule_id) REFERENCES vehicules(id) ON DELETE CASCADE
    );

-- =============================================
-- 4. TABLE ZONES TRAFIC (pour Trafic Service)
-- =============================================
CREATE TABLE IF NOT EXISTS zones_trafic (
                                            id INT PRIMARY KEY AUTO_INCREMENT,
                                            nom VARCHAR(100) NOT NULL,
    description TEXT,
    densite INT DEFAULT 0,
    classification ENUM('Faible', 'Moyen', 'Élevé') DEFAULT 'Faible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- =============================================
-- 5. TABLE INCIDENTS (pour Incidents Service)
-- =============================================
CREATE TABLE IF NOT EXISTS incidents (
                                         id INT PRIMARY KEY AUTO_INCREMENT,
                                         type ENUM('Accident', 'Travaux', 'Route fermée', 'Embouteillage') NOT NULL,
    description TEXT NOT NULL,
    zone_id INT,
    statut ENUM('Signalé', 'En cours', 'Résolu') DEFAULT 'Signalé',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    declare_par INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones_trafic(id) ON DELETE SET NULL,
    FOREIGN KEY (declare_par) REFERENCES users(id) ON DELETE SET NULL
    );

-- =============================================
-- 6. TABLE NOTIFICATIONS (pour Notifications Service)
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
                                             id INT PRIMARY KEY AUTO_INCREMENT,
                                             utilisateur_id INT NOT NULL,
                                             titre VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    est_lue BOOLEAN DEFAULT FALSE,
    incident_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL
    );

-- =============================================
-- 7. TABLE AUDIT LOGS (Bonus - Optionnel)
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
                                          id INT PRIMARY KEY AUTO_INCREMENT,
                                          utilisateur_id INT,
                                          action VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES users(id) ON DELETE SET NULL
    );

