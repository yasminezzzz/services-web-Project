# 🚦 Smart Traffic Management System

## 📖 Description

Plateforme intelligente de gestion du trafic urbain basée sur une architecture **microservices**.

Elle permet :
- la supervision des véhicules,
- la détection des incidents,
- l’analyse de la circulation,
- l’envoi de notifications en temps réel.

L’accès est sécurisé grâce à :
- **JWT Authentication**
- gestion des rôles (**ADMIN / OPERATOR**)

L’application utilise une **API Gateway GraphQL** comme point d’entrée unique.  
La gateway communique avec plusieurs microservices REST indépendants.

---

# 🏗️ Architecture Globale

```text
Client (Postman / GraphiQL)
         │
         ▼
 API Gateway GraphQL
 http://localhost:4000/graphql
         │
 ┌───────┴────────────────────────────┐
 │       │        │        │         │
 ▼       ▼        ▼        ▼         ▼
Auth   Vehicle  Traffic  Incident  Notification
:5001   :5002    :5003    :5004      :5005
 │       │        │        │          │
 └───────┴────────┴────────┴──────────┘
                     │
                     ▼
              MySQL Database
              smart_traffic
                 Port 3306
```

---

# 📌 Technologies Utilisées

- **Backend :** Node.js + Express (REST API)
- **API Gateway :** GraphQL (Apollo Server / Yoga)
- **Base de données :** MySQL
- **Authentification :** JWT + bcrypt
- **Containerisation :** Docker Compose *(bonus)*
- **CI/CD :** GitHub Actions *(bonus)*
- **Tests API :** Postman

---

# 📂 Architecture des Microservices

| Service | Port | Description |
|----------|------|-------------|
| Auth Service | 5001 | Gestion des utilisateurs et authentification |
| Vehicle Service | 5002 | Gestion des véhicules |
| Traffic Service | 5003 | Gestion des données de trafic |
| Incident Service | 5004 | Gestion des incidents |
| Notification Service | 5005 | Gestion des notifications |
| API Gateway | 4000 | Centralisation des APIs via GraphQL |

---

# ⚙️ Installation et Exécution

## ✅ Prérequis

Avant de commencer, assurez-vous d’avoir installé :

- Node.js (v18 ou supérieur)
- MySQL (XAMPP ou Docker)
- Git

---

# 1️⃣ Cloner le dépôt

```bash
git clone https://github.com/yasminezzzz/services-web-Project.git
cd services-web-Project
```

---

# 2️⃣ Configuration de la Base de Données

## Démarrer MySQL

Depuis XAMPP :
- ouvrir XAMPP Control Panel
- cliquer sur **Start** pour MySQL

---

## Créer la base de données

Créer une base nommée :

```sql
smart_traffic
```

---

## Importer le schéma SQL

Importer le fichier :

```bash
database/schema.sql
```

via phpMyAdmin.

---

# 3️⃣ Installer les Dépendances

Installer les packages pour chaque microservice :

```bash
cd services/auth-service && npm install

cd ../vehicules-service && npm install

cd ../trafic-service && npm install

cd ../incidents-service && npm install

cd ../notifications-service && npm install

cd ../gateway && npm install

cd ../..
```

---

# 4️⃣ Démarrer les Services

⚠️ Ouvrir **6 terminaux différents**

| Service | Port | Commande |
|----------|------|-----------|
| Auth Service | 5001 | `cd services/auth-service && node server.js` |
| Vehicle Service | 5002 | `cd services/vehicules-service && node server.js` |
| Traffic Service | 5003 | `cd services/trafic-service && node server.js` |
| Incident Service | 5004 | `cd services/incidents-service && node server.js` |
| Notification Service | 5005 | `cd services/notifications-service && node server.js` |
| API Gateway | 4000 | `cd services/gateway && node server.js` |

---

# 🌐 API Gateway

GraphQL Playground disponible sur :

```bash
http://localhost:4000/graphql
```

---

# 🔐 Authentification

Le système utilise :

- **JWT** pour la génération des tokens
- **bcrypt** pour le hashage des mots de passe

---

# 🧪 Tests API

Les APIs ont été testées avec :

- Postman

Collection Postman disponible dans :

```bash
docs/Postman/
```

---

# 🐳 Docker Compose (Bonus)

Pour démarrer tous les services avec Docker :

```bash
docker-compose up --build
```

---

# 🚀 Fonctionnalités Principales

- Authentification sécurisée
- Gestion des rôles
- Gestion des véhicules
- Surveillance du trafic
- Détection des incidents
- Notifications en temps réel
- API Gateway GraphQL
- Architecture microservices

---

# 👨‍💻 Auteur

Projet réalisé dans le cadre du mini projet Web Services.
