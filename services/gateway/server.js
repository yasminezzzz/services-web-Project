require('dotenv').config();
const { createYoga, createSchema } = require('graphql-yoga');
const http = require('http');
const axios = require('axios');

// ================== URLs DES MICROSERVICES (depuis .env) ==================
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:5001';
const VEHICULES_URL = process.env.VEHICULES_URL || 'http://localhost:5002';
const TRAFIC_URL = process.env.TRAFIC_URL || 'http://localhost:5003';
const INCIDENTS_URL = process.env.INCIDENTS_URL || 'http://localhost:5004';
const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_URL || 'http://localhost:5005';

// ================== SCHEMA GRAPHQL ==================
const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    username: String!
    email: String!
    role: String!
  }

  type AuthResponse {
    success: Boolean!
    token: String
    user: User
    error: String
  }

  type Vehicule {
    id: ID!
    immatriculation: String!
    marque: String!
    modele: String!
    proprietaire_id: Int
  }

  type PositionGPS {
    id: ID!
    vehicule_id: Int!
    latitude: Float!
    longitude: Float!
    vitesse: Float
    timestamp: String!
  }

  type ZoneTrafic {
    id: ID!
    nom: String!
    description: String
    densite: Int!
    classification: String!
  }

  type StatistiquesTrafic {
    total_zones: Int!
    densite_moyenne: Float!
    zones_faibles: Int!
    zones_moyennes: Int!
    zones_elevees: Int!
  }

  type Incident {
    id: ID!
    type: String!
    description: String!
    zone_id: Int
    statut: String!
    latitude: Float
    longitude: Float
    declare_par: Int
    declare_par_nom: String
    created_at: String!
  }

  type Notification {
    id: ID!
    titre: String!
    message: String!
    est_lue: Boolean!
    created_at: String!
  }

  type NotificationsResponse {
    success: Boolean!
    total: Int!
    non_lues: Int!
    notifications: [Notification!]!
  }

  type Query {
    me(token: String!): User

    vehicules: [Vehicule!]!
    vehicule(id: ID!): Vehicule
    historiqueVehicule(vehicule_id: ID!): [PositionGPS!]!

    zones: [ZoneTrafic!]!
    zonesCongestionnees: [ZoneTrafic!]!
    statistiquesTrafic: StatistiquesTrafic!

    incidents(statut: String, type: String): [Incident!]!
    incident(id: ID!): Incident

    mesNotifications: NotificationsResponse!
    notificationsNonLues: Int!
  }

  type Mutation {
    register(
      username: String!
      email: String!
      password: String!
      role: String
    ): AuthResponse!

    login(
      email: String!
      password: String!
    ): AuthResponse!

    ajouterVehicule(
      immatriculation: String!
      marque: String!
      modele: String!
    ): Vehicule!

    enregistrerPosition(
      vehicule_id: Int!
      latitude: Float!
      longitude: Float!
      vitesse: Float
    ): PositionGPS!

    creerZone(
      nom: String!
      description: String
      densite: Int
    ): ZoneTrafic!

    mettreAJourDensite(
      zone_id: Int!
      densite: Int!
    ): ZoneTrafic!

    declarerIncident(
      type: String!
      description: String!
      zone_id: Int
      latitude: Float
      longitude: Float
    ): Incident!

    modifierStatutIncident(
      incident_id: Int!
      statut: String!
    ): Incident!

    envoyerNotification(
      utilisateur_id: Int!
      titre: String!
      message: String!
    ): Notification!

    marquerNotificationLue(
      notification_id: Int!
    ): Notification!

    marquerToutesNotificationsLues: Int!
  }
`;

// ================== RESOLVERS ==================
const resolvers = {
    Query: {
        me: async (_, { token }) => {
            try {
                const response = await axios.post(
                    `${AUTH_URL}/verify`,
                    {},
                    {
                        headers: {
                            authorization: `Bearer ${token}`,
                        },
                    }
                );

                return response.data.valid ? response.data.user : null;
            } catch {
                return null;
            }
        },

        vehicules: async (_, __, context) => {
            try {
                const response = await axios.get(`${VEHICULES_URL}/vehicules`, {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                });

                return response.data.vehicules || [];
            } catch {
                return [];
            }
        },

        vehicule: async (_, { id }, context) => {
            try {
                const response = await axios.get(
                    `${VEHICULES_URL}/vehicules/${id}`,
                    {
                        headers: {
                            authorization:
                                context.request.headers.get('authorization') || '',
                        },
                    }
                );

                return response.data.vehicule || null;
            } catch {
                return null;
            }
        },

        historiqueVehicule: async (_, { vehicule_id }, context) => {
            try {
                const response = await axios.get(
                    `${VEHICULES_URL}/positions/${vehicule_id}`,
                    {
                        headers: {
                            authorization:
                                context.request.headers.get('authorization') || '',
                        },
                    }
                );

                return response.data.historique || [];
            } catch {
                return [];
            }
        },

        zones: async (_, __, context) => {
            try {
                const response = await axios.get(`${TRAFIC_URL}/zones`, {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                });

                return response.data.zones || [];
            } catch {
                return [];
            }
        },

        zonesCongestionnees: async (_, __, context) => {
            try {
                const response = await axios.get(
                    `${TRAFIC_URL}/zones/congestionnees`,
                    {
                        headers: {
                            authorization:
                                context.request.headers.get('authorization') || '',
                        },
                    }
                );

                return response.data.zones_congestionnees || [];
            } catch {
                return [];
            }
        },

        statistiquesTrafic: async (_, __, context) => {
            try {
                const response = await axios.get(
                    `${TRAFIC_URL}/zones/statistiques/globales`,
                    {
                        headers: {
                            authorization:
                                context.request.headers.get('authorization') || '',
                        },
                    }
                );

                return (
                    response.data.statistiques || {
                        total_zones: 0,
                        densite_moyenne: 0,
                        zones_faibles: 0,
                        zones_moyennes: 0,
                        zones_elevees: 0,
                    }
                );
            } catch {
                return {
                    total_zones: 0,
                    densite_moyenne: 0,
                    zones_faibles: 0,
                    zones_moyennes: 0,
                    zones_elevees: 0,
                };
            }
        },

        incidents: async (_, { statut, type }, context) => {
            try {
                let url = `${INCIDENTS_URL}/incidents`;
                const params = [];

                if (statut) params.push(`statut=${statut}`);
                if (type) params.push(`type=${type}`);

                if (params.length > 0) {
                    url += `?${params.join('&')}`;
                }

                const response = await axios.get(url, {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                });

                return response.data.incidents || [];
            } catch {
                return [];
            }
        },

        incident: async (_, { id }, context) => {
            try {
                const response = await axios.get(
                    `${INCIDENTS_URL}/incidents/${id}`,
                    {
                        headers: {
                            authorization:
                                context.request.headers.get('authorization') || '',
                        },
                    }
                );

                return response.data.incident || null;
            } catch {
                return null;
            }
        },

        mesNotifications: async (_, __, context) => {
            try {
                const response = await axios.get(
                    `${NOTIFICATIONS_URL}/notifications`,
                    {
                        headers: {
                            authorization:
                                context.request.headers.get('authorization') || '',
                        },
                    }
                );

                return (
                    response.data || {
                        success: false,
                        total: 0,
                        non_lues: 0,
                        notifications: [],
                    }
                );
            } catch {
                return {
                    success: false,
                    total: 0,
                    non_lues: 0,
                    notifications: [],
                };
            }
        },

        notificationsNonLues: async (_, __, context) => {
            try {
                const response = await axios.get(
                    `${NOTIFICATIONS_URL}/notifications/non-lues/compteur`,
                    {
                        headers: {
                            authorization:
                                context.request.headers.get('authorization') || '',
                        },
                    }
                );

                return response.data.non_lues || 0;
            } catch {
                return 0;
            }
        },
    },

    Mutation: {
        register: async (_, { username, email, password, role }) => {
            try {
                const response = await axios.post(`${AUTH_URL}/register`, {
                    username,
                    email,
                    password,
                    role,
                });

                return response.data;
            } catch (error) {
                return {
                    success: false,
                    error:
                        error.response?.data?.error || 'Erreur lors de l’inscription',
                };
            }
        },

        login: async (_, { email, password }) => {
            try {
                const response = await axios.post(`${AUTH_URL}/login`, {
                    email,
                    password,
                });

                return response.data;
            } catch (error) {
                return {
                    success: false,
                    error:
                        error.response?.data?.error || 'Erreur lors de la connexion',
                };
            }
        },

        ajouterVehicule: async (
            _,
            { immatriculation, marque, modele },
            context
        ) => {
            const response = await axios.post(
                `${VEHICULES_URL}/vehicules`,
                { immatriculation, marque, modele },
                {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                }
            );

            return response.data.vehicule;
        },

        enregistrerPosition: async (
            _,
            { vehicule_id, latitude, longitude, vitesse },
            context
        ) => {
            const response = await axios.post(
                `${VEHICULES_URL}/positions`,
                { vehicule_id, latitude, longitude, vitesse },
                {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                }
            );

            return response.data.position;
        },

        creerZone: async (_, { nom, description, densite }, context) => {
            const response = await axios.post(
                `${TRAFIC_URL}/zones`,
                { nom, description, densite },
                {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                }
            );

            return response.data.zone;
        },

        mettreAJourDensite: async (_, { zone_id, densite }, context) => {
            const response = await axios.patch(
                `${TRAFIC_URL}/zones/${zone_id}/densite`,
                { densite },
                {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                }
            );

            return response.data.zone;
        },

        declarerIncident: async (
            _,
            { type, description, zone_id, latitude, longitude },
            context
        ) => {
            const response = await axios.post(
                `${INCIDENTS_URL}/incidents`,
                { type, description, zone_id, latitude, longitude },
                {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                }
            );

            return response.data.incident;
        },

        modifierStatutIncident: async (
            _,
            { incident_id, statut },
            context
        ) => {
            const response = await axios.patch(
                `${INCIDENTS_URL}/incidents/${incident_id}/statut`,
                { statut },
                {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                }
            );

            return response.data.incident;
        },

        envoyerNotification: async (
            _,
            { utilisateur_id, titre, message },
            context
        ) => {
            const response = await axios.post(
                `${NOTIFICATIONS_URL}/notifications`,
                { utilisateur_id, titre, message },
                {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                }
            );

            return response.data.notification;
        },

        marquerNotificationLue: async (
            _,
            { notification_id },
            context
        ) => {
            const response = await axios.patch(
                `${NOTIFICATIONS_URL}/notifications/${notification_id}/lire`,
                {},
                {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                }
            );

            return response.data.notification;
        },

        marquerToutesNotificationsLues: async (_, __, context) => {
            const response = await axios.patch(
                `${NOTIFICATIONS_URL}/notifications/marquer-toutes-lues`,
                {},
                {
                    headers: {
                        authorization:
                            context.request.headers.get('authorization') || '',
                    },
                }
            );

            return response.data.notifications_mises_a_jour || 0;
        },
    },
};

// ================== CONFIGURATION YOGA ==================
const yoga = createYoga({
    schema: createSchema({
        typeDefs,
        resolvers,
    }),
    graphqlEndpoint: '/graphql',
    cors: {
        origin: '*',
        credentials: true,
    },
});

const server = http.createServer(yoga);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log(`🌐 GraphQL Gateway démarrée sur http://localhost:${PORT}/graphql`);
});