-- ==========================================
-- Importation depuis Book.xlsx
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
