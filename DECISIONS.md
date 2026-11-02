# DECISIONS.md - Studio Riff

-- Règle 1--

Cette regle sera implémenté au niveau de la validation métier dans slot.js lors d'une création
dans bookingService.js.

C'est ce qui va permettre de vérifier la durée de 1 à 4h, les heures pleines et un début entre 10h et 23h UTC.

Elle sera aussi implémenté sur le init.sql avec des contraintes en base de manière a empecher qu'une donnée invalide soit enregistré meme si elle contourne l'application
