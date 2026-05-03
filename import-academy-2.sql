-- ==========================================
-- Importation depuis Fiveur_Academy_Fichier Pro de gestion (1).xlsx
-- ==========================================

TRUNCATE TABLE academy_registrations CASCADE;

INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SIDIBÉ', 'Younous', '2018-06-19', 'M', '+222 49 83 01 84', 'BASRA', TRUE, FALSE, 'U9', 1750, 0, 1750, 'en_attente', 'Manque identité', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SIDIBÉ', 'Zackaria', '2016-01-24', 'M', '+222 49 83 01 84', 'BASRA', TRUE, FALSE, 'U11', 1750, 0, 1750, 'en_attente', 'Manque identité', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIALLO', 'Youssouf', '2015-03-07', 'M', '+222 48 44 07 94', 'ILOT L', TRUE, FALSE, 'U13', 2000, 0, 2000, 'en_attente', 'manque photo', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('THIAM', 'Mohamed', '2015-05-13', 'M', '+222 41 53 98 46', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 1000, 0, 1000, 'en_attente', 'manque piece payé bankly', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('THIAM', 'Adama', '2019-11-11', 'M', '+222 44 89 92 74', 'KOSSOVA RYAD', TRUE, FALSE, 'U7', 1000, 0, 1000, 'en_attente', 'complet', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('KOITA', 'Mohamed', '2017-03-07', 'M', '+222 46 46 65 50', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 1000, 0, 1000, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('KOITA', 'Youba', '2018-08-27', 'M', '+222 46 46 65 50', 'CITÉ PLAGE', TRUE, FALSE, 'U9', 1000, 0, 1000, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('THIAM', 'Binta', '2018-11-21', 'F', '+222 41 53 98 46', 'CITÉ PLAGE', TRUE, FALSE, 'U9', 1000, 0, 1000, 'en_attente', 'manque tt payé bankily', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIARRA', 'Ibrahim', '2011-08-06', 'M', '+222 41 46 24 13', '6eme EL MINA', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'complét payé bankily', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Amadou', '2012-05-08', 'M', '+222 46 33 74 63', 'SAMIA EL MINA', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'bankily manque identité', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SAKHO', 'Boubou', '2011-08-18', 'M', '+222 49 07 16 53', 'CITÉ PLAGE ', TRUE, FALSE, 'U15', 2000, 0, 2000, 'en_attente', 'cash pas de photo payé complementaire le 15/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DJIGO', 'Cheikh bay', '2015-12-01', 'M', '+222 49 47 01 42', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 0, 0, 0, 'en_attente', ' ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('NBODJ', 'Babacar', '2016-12-31', 'M', '+222 44 89 97 98', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 2000, 0, 2000, 'en_attente', 'manque extrait complement payment le 24/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('KANE', 'Alassane', '2020-08-20', 'M', '+222 42 63 50 50', 'EL MINA', TRUE, FALSE, 'U7', 3000, 0, 3000, 'en_attente', 'manque extrai rajout payment mois le 17/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIALLO', 'Abou', '2012-08-12', 'M', '+222 48 44 07 94', 'ILOT L', TRUE, FALSE, 'U15', 2000, 0, 2000, 'en_attente', 'manque extrait bankily', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SOW', 'Mohamed', '2016-08-15', 'M', '+222 44 89 97 98', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 0, 0, 0, 'en_attente', 'document ok payement ?', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIALLO', 'Souleymane', '2017-06-09', 'M', '+222 26 31 86 93', 'CITÉ PLAGE', TRUE, FALSE, 'U9', 0, 0, 0, 'en_attente', 'pas de doc payement ?', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('KERKOUB', 'Nenime', '2013-10-21', 'M', '+222 47 45 20 20', 'TERVRAGH ZEINA', TRUE, FALSE, 'U13', 2000, 0, 2000, 'en_attente', 'CASH COMPLET ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIAGANA', 'Bocar', '2018-05-31', 'M', '+222 47 47 77 77', 'CITÉ PLAGE ', TRUE, FALSE, 'U9', 2000, 0, 2000, 'en_attente', 'MANQUE PIECS', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Mohamed', '2021-11-02', 'M', '+222 47 75 77 22', 'CITÉ PLAGE', TRUE, FALSE, 'U5', 2000, 0, 2000, 'en_attente', 'dit quil a laissé', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Amadou', '2017-04-26', 'M', '+222 47 75 77 22', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 2000, 0, 2000, 'en_attente', 'dit quil a laissé payé le 29/04 masravi mensualité', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SIDI MAOULOUD', 'Abdallahi', '2020-05-05', 'M', '+222 36 29 01 29', 'CITÉ PLAGE', TRUE, FALSE, 'U7', 2000, 0, 2000, 'en_attente', 'bankily piece ?', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SY', 'Boubacar', '2018-01-14', 'M', '+222 44 24 22 34', 'BASRA', TRUE, FALSE, 'U9', 1000, 0, 1000, 'en_attente', 'payé masravi manque photot', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('KANOUTÉ', 'Mohamed', '2019-05-26', 'M', '212658200457', 'CITÉ PLAGE', TRUE, FALSE, 'U7', 1000, 0, 1000, 'en_attente', 'manque extrait payé bankly payé le 15', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('GUEYE', 'Moussa', '2018-01-09', 'M', '+222 47 32 19 97', 'KOUFA', TRUE, FALSE, 'U9', 2000, 0, 2000, 'en_attente', 'complet ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('GUEYE', 'Mademba', '2016-09-10', 'M', '+222 47 32 19 97', 'KOUFA', TRUE, FALSE, 'U11', 1000, 0, 1000, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('THIAM', 'Adama', '2019-11-11', 'M', '+222 44 89 92 74', 'PK9', TRUE, FALSE, 'U7', 2000, 0, 2000, 'en_attente', 'dossier complet fait le completment le 24/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('TOURÉ', 'Mohamed', '2020-10-25', 'M', '+222 46 85 01 86', 'SOCOGIM', TRUE, FALSE, 'U7', 1000, 0, 1000, 'en_attente', 'complet ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('TOURÉ', 'Ciré', '2017-10-25', 'M', '+222 46 85 01 86', 'SOCOGIM', TRUE, FALSE, 'U9', 1000, 0, 1000, 'en_attente', 'complet ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SIDIBÉ', 'Amatullah', '2014-11-28', 'F', '‪+33 6 58 40 25 02‬', 'BASRA', TRUE, FALSE, 'U12F', 1750, 0, 1750, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SIDIBÉ', 'Soukaïna', '2021-04-29', 'F', '‪+33 6 58 40 25 02‬', 'BASRA', TRUE, FALSE, 'U7', 500, 0, 500, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Mouhamed', '2015-12-08', 'M', '+222 42 02 35 84', 'KOUFA', TRUE, FALSE, 'U11', 2000, 0, 2000, 'en_attente', 'payé par bankily payé le reste 29/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Mamadou', '2013-12-09', 'M', '+222 42 02 35 84', 'KOUFA', TRUE, FALSE, 'U13', 2000, 0, 2000, 'en_attente', 'payé bankily le reste le 29/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SAMASSA', 'Abdrahmane', '2015-01-23', 'M', '+222 26 31 86 93', 'TEYARETE', TRUE, FALSE, 'U13', 2000, 0, 2000, 'en_attente', 'complet payé 17', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SAMASSA', 'Mohamed', '2016-11-20', 'M', '+222 26 31 86 93', 'TEYARETE', TRUE, FALSE, 'U11', 2000, 0, 2000, 'en_attente', 'complet payé le 17/', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('HAMOUNY', 'Didi', '2013-10-07', 'M', '+222 36 34 50 58', 'TERVRAGH ZEINA', TRUE, FALSE, 'U13', 2000, 0, 2000, 'en_attente', 'BANKILY Manque extrai', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('N''DIAYE', 'Hassan', '2012-08-25', 'M', '+222 42 22 21 01', 'PK9', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'Masravi', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('N''DIAYE', 'Houssein', '2012-08-25', 'M', '+222 42 22 21 01', 'PK9', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'Masravi', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SOUMARÉ', 'Djibrril', '2013-07-22', 'M', '+222 46 41 92 91', 'CITÉ PLAGE', TRUE, FALSE, 'U13', 1000, 0, 1000, 'en_attente', 'cash pas de photo extrait', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Oumar', '2011-09-11', 'M', '+222 47 48 89 62', 'ARAFATE', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'complet ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('FALL', 'Mohamedou', '2018-04-28', 'M', '+222 46 41 34 90', 'KOUFA', TRUE, FALSE, 'U9', 1000, 0, 1000, 'en_attente', 'manque photo', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SY', 'Cheikh Ibrahim', '2013-12-31', 'M', '+222 41 76 49 96', 'KOSSOVO', TRUE, FALSE, 'U13', 1000, 0, 1000, 'en_attente', 'manque document', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIAGANA', 'Mohamed', '2015-11-14', 'M', '+222 46 47 39 00', 'TERVRAGH ZEINA', TRUE, FALSE, 'U11', 2000, 0, 2000, 'en_attente', 'complet payé le reste le29/04 cash', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIAGANA', 'Cheikhna', '2021-12-10', 'M', '+222 46 47 39 00', 'TERVRAGH ZEINA', TRUE, FALSE, 'U5', 2000, 0, 2000, 'en_attente', 'complet le reste le 29/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('JOUAMEH', 'Mouchtaba', '2020-01-21', 'M', '+222 37 73 11 52', '5EME', TRUE, FALSE, 'U7', 2000, 0, 2000, 'en_attente', 'manque document payé 2eme avril ok le 01/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('JOUAMEH', 'Khalid', '2017-04-06', 'M', '+222 37 73 11 52', '5EME', TRUE, FALSE, 'U11', 2000, 0, 2000, 'en_attente', 'manque document payé 2eme avril ok le 01/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIAGANA', 'Cheikh Tijane', '2018-08-31', 'M', '+222 46 40 40 50', 'CITÉ PLAGE', TRUE, FALSE, 'U9', 2000, 0, 2000, 'en_attente', 'complet payé le 14/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('KONATÉ', 'Bachir', '2016-10-18', 'M', '+222 42 00 04 20', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 2000, 0, 2000, 'en_attente', 'complet mensualité le 22/04 bankily', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SAMBA', 'Zakaria', '2017-09-06', 'M', '+222 46 90 25 22', 'NETTEQUE', TRUE, FALSE, 'U9', 2000, 0, 2000, 'en_attente', 'complet bankily payé 2eme le 01/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SAMBA', 'Moussa', '2021-11-30', 'M', '+222 46 90 25 22', 'NETTEQUE', TRUE, FALSE, 'U5', 2000, 0, 2000, 'en_attente', 'complet bankily payé 2eme le 01/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SAMBA', 'Aminata', '2015-03-15', 'F', '+222 46 90 25 22', 'NETTEQUE', TRUE, FALSE, 'U12F', 2000, 0, 2000, 'en_attente', 'complet bankily payé 2eme le 01/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIAGANA', 'Diedia', '2015-06-12', 'M', '+222 47 47 77 77', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 2000, 0, 2000, 'en_attente', 'complet cash rajoue le 01/05', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('', 'Moussa', '2019-03-06', 'M', '+1 (610) 931-3919', 'EL MINA', TRUE, FALSE, 'U9', 2000, 0, 2000, 'en_attente', 'complet ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('CAMARA', 'Abdallahi', '2016-04-10', 'M', '+1 (610) 931-3919', 'EL MINA', TRUE, FALSE, 'U11', 2000, 0, 2000, 'en_attente', 'complet', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIALLO', 'Youssouf', '2014-08-28', 'M', '+33 6 46 30 67 06', 'CITÉ PLAGE', TRUE, FALSE, 'U13', 2000, 0, 2000, 'en_attente', 'manque document', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BAH', 'Khalipha', '2020-10-05', 'M', '+222 47 88 18 08', 'BASRA', TRUE, FALSE, 'U7', 2000, 0, 2000, 'en_attente', 'photo ok payé 2eme le 17/04', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('KONATÉ', 'Kama', '2011-08-06', 'M', '+222 41 46 24 13', 'EL MINA', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'complet', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SIDIBÉ', 'Karamoko', '2022-01-26', 'M', '+222 46 83 01 01', 'KOUFA', TRUE, FALSE, 'U5', 1000, 0, 1000, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BABY', 'Mohamed', '2011-11-02', 'M', '+222 47 62 25 28', 'BASRA', TRUE, FALSE, 'U15', 2000, 0, 2000, 'en_attente', 'manque extrait bankily', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('GADENGA', 'Issa', '2012-04-17', 'M', '+222 27 92 96 12', 'CITÉ CONCORDE', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'CASH COMPLET ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SOW', 'Moussa', '2022-12-22', 'M', '+222 46 09 50 42', 'SAMIA', TRUE, FALSE, 'U5', 1000, 0, 1000, 'en_attente', 'manque extrait bankily', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Badara Ali', '2018-12-31', 'M', '+222 44 24 35 63', 'KOUFA', TRUE, FALSE, 'U9', 1000, 0, 1000, 'en_attente', 'manque piece', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Cheikh Tidjan', '2014-10-22', 'M', '+222 46 83 14 90', 'BASRA', TRUE, FALSE, 'U13', 1000, 0, 1000, 'en_attente', 'manque piece bankily', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('M''BODJ', 'Seyidouna Mohamed', '2020-02-02', 'M', '+222 44 72 88 70', '5EME', TRUE, FALSE, 'U7', 3000, 0, 3000, 'en_attente', 'complet masravi moi de mai ok', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIA', 'Abdoul', '2020-09-25', 'M', '+222 47 72 25 00', 'COSSOVO', TRUE, FALSE, 'U7', 1000, 0, 1000, 'en_attente', 'manque piece masravi', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DJIMERA', 'Woury', '2010-12-30', 'M', '+222 43 49 89 62', 'KOUFA', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'manque piece masravi', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('MOKTAR', 'Abdallah', '2012-02-06', 'M', '+222 46 46 98 98', 'CITÉ PLAGE', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'complet bankily', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('JIYID', 'Elyessa', '2013-04-15', 'M', '+222 20 98 98 92', 'TERVRAGH ZEINA', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'a verifié bankily', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIALLO', 'Abdallah', '2020-04-22', 'M', '+222 44 21 03 57', 'MEDINA 3', TRUE, FALSE, 'U7', 2000, 0, 2000, 'en_attente', 'complet bankily', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIALLO', 'Yakoub', '2017-08-28', 'M', '+222 44 21 03 57', 'MEDINA 3', TRUE, FALSE, 'U9', 2000, 0, 2000, 'en_attente', 'complet bankily', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Ismael', '2017-11-01', 'M', '+222 41 74 85 90', 'CENTRE METTRE', TRUE, FALSE, 'U9', 2000, 0, 2000, 'en_attente', 'manque piece masravi', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('MOHAMED CHEIKH', 'Mohamed', '2021-05-28', 'M', '+222 22 28 22 20', 'CITÉ PLAGE', TRUE, FALSE, 'U5', 2600, 0, 2600, 'en_attente', 'payé une seance  200mru manque extraix ok moi de mai', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SYLLA', 'Adama', '2010-05-31', 'M', '+222 44 05 61 02', 'EL MINA', TRUE, FALSE, 'U15', 0, 0, 1000, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SOW', 'Mohamed', '2016-08-15', 'M', '+222 44 89 97 98', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 1000, 0, 1000, 'en_attente', 'bankily manque document', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('N''DIAYE', 'Ibrahim', '2014-04-28', 'M', '‪+222 41 04 56 30‬', 'CITÉ PLAGE', TRUE, FALSE, 'U13', 1000, 0, 1000, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('N''DIAYE', 'Moussa', '2017-04-05', 'M', '‪+222 41 04 56 30‬', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 1000, 0, 1000, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('CISSÉ', 'Souleymane', '2012-08-11', 'M', '+222 37 34 76 60', 'CITÉ CONCORDE', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('THIAM', 'Ely', '2016-06-13', 'M', '+222 32 09 11 31', 'CITÉ CONCORDE', TRUE, FALSE, 'U11', 1000, 0, 1000, 'en_attente', 'masravi manque document', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SOKNA', 'Harouna', '2011-08-11', 'M', '+222 44 69 25 75', 'KOUFA', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'CASH COMPLET ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('WANE', 'Ibrahima', '2014-03-25', 'M', '+222 32 09 11 31', 'CITÉ CONCORDE', TRUE, FALSE, 'U13', 1000, 0, 1000, 'en_attente', 'masravi manque photo', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('FANE', 'Ely', '2014-11-08', 'M', '+222 32 09 11 31', 'CITÉ CONCORDE', TRUE, FALSE, 'U13', 1000, 0, 1000, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('KOITA', 'Mohamed', '2020-09-05', 'M', '+222 49 44 09 04', 'TERVRAGH ZEINA', TRUE, FALSE, 'U7', 1500, 0, 1500, 'en_attente', 'il manque documenty banqui', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('CAMARA', 'Abdallah', '2014-02-13', 'M', '+222 41 32 30 91', '5EME', TRUE, FALSE, 'U13', 0, 0, 0, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('CABIT', 'Zakaria', '2013-01-29', 'M', '+222 42 07 96 50', 'SOUKOUK', TRUE, FALSE, 'U15', 3500, 0, 3500, 'en_attente', 'manque photo payé 3 mois avance', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('CABIT', 'Djody', '2011-06-05', 'M', '+222 42 07 96 50', 'SOUKOUK', TRUE, FALSE, 'U15', 3500, 0, 3500, 'en_attente', 'manque photo payé 3 mois avance', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('FOFANA', 'Alassane', '2012-05-05', 'M', '+222 46 76 18 94', 'EL MINA', TRUE, FALSE, 'U15', 1500, 0, 1500, 'en_attente', 'manque doc 5000', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('FOFANA', 'Amadou', '2012-05-05', 'M', '+222 46 76 18 94', 'EL MINA', TRUE, FALSE, 'U15', 1500, 0, 1500, 'en_attente', 'manque document 500', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIAGNE', 'Alioune', '2014-05-02', 'M', '+222 26 43 64 82', 'KOUFA', TRUE, FALSE, 'U13', 1000, 0, 1000, 'en_attente', 'cash manque document', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('N''DAW', 'Ciré', '2016-10-01', 'M', '+222 22 16 54 72', 'SOCOGIM', TRUE, FALSE, 'U11', 1500, 0, 1500, 'en_attente', 'manque photo ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SARRE', 'Tierno', '2016-01-08', 'M', '+222 49 86 23 31', '???', TRUE, FALSE, 'U11', 1000, 0, 1000, 'en_attente', 'cash manque document', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIEYE', 'Djibi', '2016-12-23', 'M', '+222 47 78 99 71', 'KOUFA', TRUE, FALSE, 'U11', 1000, 0, 1000, 'en_attente', 'manque document', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DJIGO', 'Cheikh Bay', '2013-12-01', 'M', '+222 49 47 01 42', 'CITÉ PLAGE', TRUE, FALSE, 'U13', 0, 0, 0, 'en_attente', 'COMPLET', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Zeinebou', '2014-11-16', 'F', '+222 46 02 86 68', 'CITÉ PLAGE', TRUE, FALSE, 'U12F', 1400, 0, 1400, 'en_attente', 'COMPLET CASH ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SOUMARÉ', 'Aminta', NULL, 'F', '+222 44 61 10 52', 'EL MINA', TRUE, FALSE, NULL, 0, 0, 0, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SOUMARÉ', 'Mariame', '2014-01-01', 'F', '+222 44 44 14 07', 'EL MINA', TRUE, FALSE, 'U15F', 0, 0, 0, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SOW', 'Aminata', '2014-03-12', 'F', '+222 46 38 80 03', 'CITÉ PLAGE', TRUE, FALSE, 'U15F', 1000, 0, 1000, 'en_attente', 'pas de document reste a payé 4000', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SOW', 'Maama', '2017-03-10', 'F', '+222 46 38 80 03', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 1000, 0, 1000, 'en_attente', 'pas de document reste payé 4000', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIALLO', 'Aboubacar', '2012-11-28', 'M', '+222 44 85 59 12', NULL, FALSE, FALSE, NULL, 0, 0, 0, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DIALLO', 'Birame', '2016-12-19', 'M', '+222 46 41 23 55', 'CITÉ PLAGE ', TRUE, FALSE, 'U11', 1300, 0, 1300, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SAKHO', 'Amadou', '2012-12-30', 'M', '+222 46 43 00 51', 'CITÉ PLAGE', TRUE, FALSE, 'U15', 2000, 0, 2000, 'en_attente', 'complet payé mois de mai', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SAKHO', 'Cheikh saad bouh', '2016-12-01', 'M', '+222 46 43 00 51', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 2000, 0, 2000, 'en_attente', 'complet payé mois de mai', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('KOÏTA', 'Mohamed', '2017-03-07', 'M', '+222 46 46 65 50', 'CITÉ PLAGE', TRUE, FALSE, 'U11', 1000, 0, 1000, 'en_attente', 'manque phto', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('KOÏTA', 'Youba', '2018-08-27', 'M', '+222 46 46 65 50', 'CITÉ PLAGE', TRUE, FALSE, 'U9', 1000, 0, 1000, 'en_attente', 'manque photo', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('N''DIAYE', 'Mohamed', '2014-10-07', 'M', '+222 36 47 67 84', 'CITÉ CONCORDE', TRUE, FALSE, 'U13', 2000, 0, 2000, 'en_attente', 'manque document', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('OUBEID', 'Ilyas', NULL, 'M', '+222 36 32 51 16', NULL, TRUE, FALSE, NULL, 2000, 0, 2000, 'en_attente', 'a resilié leur contrat', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('OUBEID', 'Emine', NULL, 'M', '+222 36 32 51 16', NULL, TRUE, FALSE, NULL, 2000, 0, 2000, 'en_attente', 'a resilier leur contrat', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('KEBÉ', 'Sidi', '2020-10-09', 'M', '+222 48 27 55 21', 'CITÉ CONCORDE', TRUE, FALSE, 'U7', 2000, 0, 2000, 'en_attente', 'manque extrait ', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Abu Bakr', '2017-08-12', 'M', '+222 47 46 89 90', 'CITÉ PLAGE', TRUE, FALSE, 'U9', 1000, 0, 1000, 'en_attente', 'manque piece', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('BA', 'Oumar Ardo', '2020-03-12', 'M', '+222 47 46 89 90', 'CITÉ PLAGE', TRUE, FALSE, 'U7', 1000, 0, 1000, 'en_attente', 'manque piece', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('GUEYE', 'Penda', '2015-04-15', 'F', '+222 31 31 52 00', 'CITÉ CONCORDE', TRUE, FALSE, 'U12F', 1600, 0, 1600, 'en_attente', 'payé pour le mois de mais manque doc', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('GUEYE', 'Maymouna', '2018-06-24', 'F', '+222 31 31 52 00', 'CITÉ CONCORDE', TRUE, FALSE, 'U9', 1600, 0, 1600, 'en_attente', 'payé pour le mois de mais manque doc', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SIDI MAOULOUD', 'Mahfoud', '2012-02-01', 'M', '+222 36 29 01 29', 'CITÉ PLAGE', TRUE, FALSE, 'U15', 2000, 0, 2000, 'en_attente', 'bankily manque document', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('FALL', 'Ali', NULL, 'M', '+222 44 24 35 63', 'KOUFA', TRUE, FALSE, NULL, 0, 0, 0, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('SOUGOU', 'Mohamed', '2011-06-04', 'M', '+222 30 46 66 92', 'KOUFA', TRUE, FALSE, 'U15', 1000, 0, 1000, 'en_attente', 'manque tt manque mois de mai', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('FALL', 'Brahim', '2019-08-04', 'M', '+222 30 46 66 92', 'KOUFA', TRUE, FALSE, 'U7', 1000, 0, 1000, 'en_attente', 'manque tt manque mois de mai', false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DAKEEN', 'Mohamed', '2020-01-21', 'M', '+222 30 73 11 52', NULL, TRUE, FALSE, 'U7', 1000, 0, 1000, 'en_attente', NULL, false);
INSERT INTO academy_registrations (nom, prenom, date_naissance, sexe, telephone_parent, adresse, football, centre_loisirs, categorie_foot, tarif_football, tarif_loisirs, tarif_total, statut_paiement, observations, frais_inscription_paye)
VALUES ('DAKEEN', 'Khaleb', '2017-04-06', 'M', '+222 30 73 11 52', NULL, TRUE, FALSE, 'U11', 1000, 0, 1000, 'en_attente', NULL, false);
