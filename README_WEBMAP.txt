WEBMAP OFFRE DE SOIN EN COTE D'IVOIRE — VERSION 5
==================================================

CORRECTION MAJEURE DES EXPORTS PDF / EXCEL
-------------------------------------------
- La capture d'export ne dépend plus des tuiles OpenStreetMap.
- La carte insérée dans les exports est générée directement à partir des géométries des régions sanitaires et des centres sélectionnés.
- Cette méthode évite les blocages CORS des navigateurs lors de la capture de carte.
- Le PDF et l'Excel sont construits immédiatement au clic, afin de limiter les blocages de téléchargement par le navigateur.
- Le téléchargement Blob est renforcé et les URL temporaires sont conservées suffisamment longtemps.
- Un message de succès indique la taille du fichier généré ; en cas d'erreur, le détail est affiché.

REQUÊTES RELATIONNELLES
-----------------------
- Requêtes liées entre Région sanitaire et Centre de santé.
- Chaque centre est rattaché spatialement à la région sanitaire contenant son point.
- Si une région sanitaire est sélectionnée, seuls les centres réellement situés dans cette région sont retenus.
- Autocomplétion des valeurs dans les requêtes et dans la recherche.
- Zoom automatique et surlignage jaune des résultats.

EXPORT PDF
----------
- Carte autonome des entités sélectionnées.
- Régions sanitaires sélectionnées en jaune.
- Centres de santé sélectionnés en jaune avec contour rouge.
- Description de la requête et indication de la relation spatiale.
- Statistiques de synthèse.
- Tableau paginé des centres de santé.
- Tableau paginé des régions sanitaires.
- Compatible avec des sélections volumineuses.

EXPORT EXCEL (.xlsx)
--------------------
- Feuille Synthèse : requête, relation spatiale, carte et indicateurs clés.
- Feuille Statistiques : statistiques de synthèse.
- Feuille Centres de santé : liste détaillée des résultats avec filtres et en-tête figé.
- Feuille Régions sanitaires : liste détaillée des résultats avec filtres et en-tête figé.
- La carte est intégrée comme image JPEG dans le classeur.

TESTS EFFECTUÉS
---------------
- Génération PDF vérifiée avec 1 771 centres et 34 régions : PDF valide de 80 pages.
- Génération Excel vérifiée avec 1 771 centres et 34 régions : classeur XLSX valide avec 4 feuilles.
- Structure ZIP/XLSX contrôlée sans erreur.
- Ouverture du classeur contrôlée par un moteur de lecture XLSX.
- PDF rendu en images pour contrôle de validité et de mise en page.

UTILISATION
-----------
Ouvrir index.html dans un navigateur moderne (Chrome, Edge ou Firefox).
Une connexion Internet est utile pour le fond OpenStreetMap de la webmap, mais la génération des exports ne dépend plus du fond OpenStreetMap.

--- V6 : ACCÈS PAR PROFILS ---
La webmap est protégée par un écran de connexion avec 4 profils : Directeur, Superviseurs, Technicien et Utilisateurs.
Les mots de passe sont contrôlés par empreintes SHA-256 salées dans resources/auth.js et ne sont pas affichés en clair dans l'interface.
La session est conservée uniquement dans l'onglet du navigateur (sessionStorage) et peut être fermée avec le bouton Déconnexion.
Après 5 mots de passe erronés consécutifs, la connexion est bloquée temporairement pendant 60 secondes.

IMPORTANT : cette protection est une sécurité côté navigateur adaptée à une webmap statique. Si la webmap est publiée sur un hébergement public tel que GitHub Pages, un utilisateur techniquement avancé peut inspecter ou modifier le JavaScript. Pour une sécurité forte avec comptes utilisateurs réels, il faut une authentification côté serveur ou un service d'accès (Firebase Auth, Supabase Auth, Cloudflare Access, etc.).
