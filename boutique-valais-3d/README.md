# Boutique 13 Étoiles : version 3D (prototype)

Ce dossier est une **copie** de `boutique-valais/`, transformée en expérience 3D immersive autour du Cervin.
Le site d'origine n'est pas modifié : les deux versions vivent côte à côte et ne partagent ni panier, ni produits de démonstration.

Ébauche de boutique en ligne pour vendre des vêtements et du merchandising aux couleurs du Valais.
**Ce n'est pas un site de production** : les paiements sont simulés, aucun e-mail n'est envoyé,
et les produits et images sont factices.

Ce que le prototype sait faire :

- **Un monde 3D autour du Cervin**, entièrement généré par le code (aucun modèle ni photo de montagne) : la pyramide et ses quatre arêtes, les sommets voisins, la mer de nuages, la neige, le ciel étoilé et la Voie lactée
- **Accueil en cinq chapitres pilotés par le défilement** : la caméra vole autour du Cervin pendant que le jour se lève, de la nuit étoilée au premier rayon qui embrase le sommet en rouge
  - les 13 étoiles se rassemblent en constellation, disposées comme sur le drapeau valaisan, puis forment une couronne autour du sommet
  - les frontales des cordées montent l'arête du Hörnli avant l'aube ; un hameau éclairé brille au pied de la montagne
  - le drapeau de la marque flotte au sommet, à 4 478 m
  - un affichage de bord indique l'altitude de la caméra et l'heure
- **La collection en carrousel 3D**, à faire tourner à la souris, au doigt ou au clavier
- **La montagne reste en arrière-plan de toutes les pages**, en ronde lente de nuit, derrière un voile sombre
- Animations discrètes dans tout le site : apparition au défilement, effet 3D au survol des photos produit, confirmation d'ajout au panier
- Boutique avec un filtre par catégorie : t-shirts, sweats, casquettes, autres vêtements, alcool, schnoupf
- Fiche produit avec le choix de la couleur, de la taille et de la quantité
- Panier avec les quantités modifiables et la livraison offerte dès CHF 80.–
- Checkout simulé : formulaire, puis page de confirmation
- Pop-up de vérification de l'âge à la première visite, et date de naissance obligatoire au checkout si le panier contient de l'alcool ou du schnoupf
- Mini espace admin pour ajouter, modifier et supprimer des produits (avec l'envoi de photos) et consulter les commandes de test

---

## 1. Lancer le site

### La première fois (une seule fois)

1. **Installez Node.js** : sur **https://nodejs.org**, téléchargez la version **LTS** et installez-la comme n'importe quel programme.
2. **Téléchargez le site** avec ce lien direct :
   https://github.com/192bobba/192bobba.github.io/archive/refs/heads/claude/ecommerce-valais-prototype-9hvr0l.zip
3. **Décompressez** le fichier et rangez le dossier où vous voulez (par exemple dans Documents). Cette version 3D se trouve dans le sous-dossier **`boutique-valais-3d`** (la version d'origine est dans `boutique-valais`).

### Ensuite, à chaque fois : un double-clic

Dans le dossier `boutique-valais-3d` :

- **Windows** : double-cliquez sur `lancer-windows.bat`
- **Mac** : double-cliquez sur `lancer-mac.command`. La toute première fois, si le Mac refuse de l'ouvrir, faites un clic droit sur le fichier, choisissez **Ouvrir**, puis confirmez.

Le site **se met à jour tout seul** avec la dernière version publiée, puis s'ouvre dans le navigateur
sur **http://localhost:3000**. Vous n'avez plus jamais besoin de retélécharger le ZIP.

> Astuce : créez un raccourci sur le bureau.
> Sur Windows, faites un clic droit sur `lancer-windows.bat`, puis **Envoyer vers → Bureau (créer un raccourci)**.
> Sur Mac, faites glisser `lancer-mac.command` sur le bureau en maintenant **Cmd + Option**.

Si vous préférez le terminal, la commande `npm start`, tapée dans le dossier `boutique-valais-3d`, fait exactement la même chose.

### Important : laissez la fenêtre noire ouverte

La fenêtre noire (le terminal) qui s'ouvre au lancement **fait tourner le site** : tant que vous utilisez
la boutique ou l'admin, laissez-la ouverte. Vous pouvez la réduire dans la barre des tâches.

Si elle est fermée, le site s'arrête. Un bandeau jaune « Le site ne répond plus » apparaît alors dans le navigateur,
et des messages comme « Le site ne répond plus… » s'affichent, par exemple en se connectant à l'admin. Il suffit de relancer
le site (double-clic sur le lanceur) : la page se recharge toute seule.

### Arrêter le site

Fermez la fenêtre noire, ou appuyez sur **Ctrl + C** dans cette fenêtre.

> Si le site est déjà ouvert, fermez d'abord l'ancienne fenêtre noire avant de relancer, sinon la nouvelle version ne pourra pas démarrer.

### Comment marche la mise à jour automatique ?

- À chaque lancement, le site télécharge la dernière version depuis GitHub et remplace les fichiers qui ont changé.
- **Ce qui est conservé :** vos produits, vos commandes de test et vos photos envoyées depuis l'admin.
- **Ce qui est remplacé :** les fichiers du site eux-mêmes. Une modification faite à la main dans ces fichiers (par exemple dans `src/config.js`) serait donc écrasée. Il vaut mieux demander le changement pour qu'il soit publié sur GitHub.
- **Sans internet**, le site démarre simplement avec la version déjà installée.
- **Pour voir les nouveaux produits de démonstration** après une mise à jour, lancez `npm run reset`. Attention : cela efface vos produits et vos commandes de test.
- La source des mises à jour (dépôt, branche) se règle dans `package.json`, rubrique `updateSource`.

> Aucune installation de paquets n'est nécessaire (`npm install` est inutile) : le projet n'a aucune dépendance.

---

## 2. Ouvrir le site sur un iPad ou un téléphone

### Version en ligne (depuis n'importe où)

Une fois publiée sur GitHub Pages (branche `main`), cette version est à l'adresse : **https://192bobba.github.io/boutique-valais-3d/**
(la version d'origine reste à l'adresse https://192bobba.github.io/boutique-valais/)

Rien à installer ni à lancer : ouvrez simplement cette adresse dans Safari (sur l'iPad, « Partager → Sur
l'écran d'accueil » ajoute même une icône comme une application).

Comme GitHub Pages ne fait pas tourner de serveur, cette version fonctionne en **mode démonstration** :

- tout marche (boutique, panier, commande, admin avec le même mot de passe) ;
- les produits modifiés, les photos et les commandes de test sont enregistrés **dans le navigateur de l'appareil
  utilisé** : ce que vous changez sur l'iPad n'apparaît ni sur l'ordinateur, ni chez les autres visiteurs ;
- un bouton « Réinitialiser la démo » dans l'admin remet tout dans l'état de départ.

Elle se met à jour toute seule à chaque nouvelle publication sur la branche `main` du dépôt (une à deux minutes
après la publication).

### Version de l'ordinateur (même Wi-Fi)

Lancez le site sur l'ordinateur comme d'habitude. La fenêtre noire affiche une adresse du type
`http://192.168.1.23:3000` : tapez-la dans Safari sur l'iPad, connecté au **même Wi-Fi**.
Vous utilisez alors exactement les mêmes produits et commandes que sur l'ordinateur.

> Sous Windows, au premier lancement, une fenêtre du pare-feu peut demander d'autoriser Node.js :
> cochez **Réseaux privés** et validez, sinon l'iPad ne pourra pas se connecter.

---

## 3. Tester la boutique

| Quoi | Comment |
|---|---|
| Vérification de l'âge | Le pop-up apparaît à la première visite. Répondez « Non » : l'alcool et le schnoupf disparaissent. Pour changer de réponse, utilisez le lien **Vérification de l'âge** en bas de page. |
| Commander | Ajoutez un article, ouvrez le panier, puis **Passer commande**. NPA à 4 chiffres, par ex. `1950` Sion. |
| Alcool / schnoupf | Avec un article 18+ dans le panier, une date de naissance est exigée. Avec une date de moins de 18 ans, la commande est refusée. |
| Admin | **http://localhost:3000/#/admin** (lien « Admin » en bas de page) |
| Mot de passe admin | **`valais1815`** (à changer dans `src/config.js`) |

Pour retrouver la boutique telle qu'au départ (produits de démo, aucune commande), arrêtez le site puis tapez :

```
npm run reset
```

---

## 4. Gérer vos produits (photos, prix, ajouts…)

Tout se fait dans l'**espace admin**, sans toucher au code. Ouvrez **http://localhost:3000/#/admin**
(ou le lien « Admin » tout en bas du site) et entrez le mot de passe `valais1815`.

### Ajouter la photo d'un produit

1. Dans la liste des produits, cliquez sur **Modifier** à côté du produit.
2. Dans la rubrique **Image**, cliquez sur **Choisir une photo…**, ou faites glisser la photo depuis votre ordinateur sur la zone image.
3. L'aperçu se met à jour et le message « Photo ajoutée ✓ » s'affiche.
4. Cliquez sur **Enregistrer les modifications**, sinon la photo n'est pas gardée.

Conseils pour de belles photos :

- **Format carré** (même largeur que hauteur), produit bien centré : les vignettes de la boutique sont carrées, et les bords d'une photo rectangulaire sont coupés.
- **Fond uni** : blanc, gris ou foncé. Un fond sombre se fond particulièrement bien dans le thème du site.
- Une **photo prise au téléphone convient très bien** : le site la redresse et la réduit automatiquement (environ 1600 pixels, quelques centaines de Ko).
- Un **PNG détouré** (fond transparent) garde sa transparence.

### Modifier un prix, un nom, une description

1. Cliquez sur **Modifier** à côté du produit.
2. Changez le champ voulu. Le prix s'écrit en francs, par exemple `34.90` ou `34,90`.
3. Cliquez sur **Enregistrer les modifications**. Le changement est visible tout de suite dans la boutique.

### Tailles et couleurs

- **Tailles** : séparées par des virgules, par exemple `S, M, L, XL`. Des boutons proposent les listes courantes (Adulte, Enfant, Taille unique…). Laissez vide pour un produit sans taille, comme une bouteille.
- **Couleurs** : séparées par des virgules, par exemple `Rouge, Blanc, Noir`. Les noms de couleur connus (rouge, blanc, noir, gris, bleu, marine, vert, beige…) affichent une pastille de couleur.

### Ajouter ou supprimer un produit

- **Ajouter** : cliquez sur **+ Ajouter un produit**, remplissez la fiche (nom, catégorie et prix sont obligatoires), puis cliquez sur **Ajouter le produit**.
- **Supprimer** : cliquez sur **Supprimer** à côté du produit, puis confirmez. Attention, c'est définitif.
- **Mettre en avant** : cochez « Mettre en avant sur la page d'accueil » pour faire apparaître le produit dans la Sélection.

### Où sont enregistrés vos changements ?

Sur **votre ordinateur**, dans le dossier du site :

- les produits dans `data/products.json` ;
- les photos dans `public/uploads/`.

Ils sont **conservés lors des mises à jour automatiques**. En revanche, ils ne sont pas envoyés sur GitHub :
ils n'apparaissent que sur l'ordinateur où vous les avez faits. Pour qu'ils fassent partie du site publié,
envoyez vos photos et vos prix, et ils seront intégrés aux produits de départ.

> Attention : `npm run reset` efface vos produits et vos photos de test pour revenir aux produits de démonstration.

---

## 5. Où modifier quoi ?

| Je veux changer… | Fichier |
|---|---|
| Les textes des chapitres de l'accueil | `public/js/pages/home.js` |
| Le vol de la caméra et la lumière (nuit, aube, matin) | `public/js/world/world.js` (tableaux `JOURNEY` et `PALETTE`) |
| La forme du Cervin et du massif | `public/js/world/terrain.js` |
| Nom de la boutique, frais de port, âge minimum | `data/settings.json` (utilisé aussi par la version en ligne) |
| Mot de passe admin, port | `src/config.js` (version en ligne : `public/js/demo-store.js`) |
| Les produits | Depuis l'**espace admin**, ou dans `data/products.json` (créé au premier lancement) |
| Les produits de démonstration de départ | `data/products.demo.json` |
| Les catégories (nom, description, image, 18+) | `data/categories.json` |
| Les images | Envoi depuis l'admin (enregistrées dans `public/uploads/`), ou en ajoutant des fichiers dans `public/img/produits/` |
| Les couleurs et le style | `public/css/style.css` (les couleurs du thème sombre sont au début du fichier ; le rouge est réservé au logo et aux produits) |
| Le logo | `public/img/logo.jpg` (et `favicon.png` / `apple-touch-icon.png` pour l'icône d'onglet) |

Les images actuelles sont des **illustrations provisoires** (avec le logo en écusson). Pour les remplacer
par vos vraies photos, voir la partie 4 ci-dessus.

---

## 6. Organisation du code

```
boutique-valais-3d/
├── index.html             Page d'entrée de la version en ligne (redirige vers public/)
├── server.js              Serveur web du site
├── src/                   Code du serveur
│   ├── config.js          Réglages du serveur (mot de passe, port)
│   ├── api.js             Adresses de l'API (/api/products, /api/orders, /api/admin/...)
│   ├── store.js           Lecture / écriture des fichiers JSON (seul fichier à changer pour passer à une base de données)
│   ├── auth.js            Protection basique de l'admin (mot de passe + session)
│   └── http.js            Utilitaires HTTP et fichiers statiques
├── data/                  Données : réglages (settings.json), catégories, produits, commandes
├── public/                Tout ce que voit le navigateur
│   ├── index.html
│   ├── css/style.css
│   ├── img/               Logo et illustrations provisoires
│   ├── uploads/           Photos envoyées depuis l'admin
│   ├── vendor/three/      Bibliothèque 3D three.js complète (voir son README)
│   └── js/
│       ├── app.js         Démarrage et navigation entre les pages
│       ├── api.js         Accès aux données : serveur, ou démo en ligne si pas de serveur
│       ├── demo-store.js  Version en ligne sans serveur (données gardées dans le navigateur)
│       ├── shared/        Règles communes au serveur et à la démo : commandes, âge, validation des produits
│       ├── cart.js        Panier (gardé dans le navigateur)
│       ├── age-gate.js    Pop-up de vérification de l'âge
│       ├── pricing.js     Calcul des totaux
│       ├── ui.js          Composants d'affichage réutilisables
│       ├── effects.js     Animations d'interface (apparition au défilement, effet 3D au survol)
│       ├── world-control.js  Télécommande du monde 3D pour les pages (« vol » sur l'accueil, « calme » ailleurs)
│       ├── world/         Le monde 3D :
│       │   ├── world.js       moteur : trajectoire de la caméra, lumière de la nuit à l'aube, qualité adaptative
│       │   ├── terrain.js     relief : le Cervin (faces, arêtes), les sommets voisins, les vallées
│       │   ├── atmosphere.js  ciel, étoiles, mer de nuages, neige
│       │   ├── emblem.js      les 13 étoiles, le drapeau du sommet, les frontales, le hameau
│       │   └── noise.js       bruits procéduraux (relief, nuages)
│       ├── three/         Drapeau 3D de la section « Notre emblème »
│       └── pages/         Une page = un fichier (accueil, boutique, produit, panier, commande, confirmation, admin)
├── scripts/
│   ├── start.js           Lancement : mise à jour automatique puis démarrage du serveur
│   ├── update.js          Mise à jour automatique depuis GitHub
│   └── reset.js           Remise à zéro des données
└── lancer-windows.bat, lancer-mac.command   Lanceurs à double-cliquer
```

Choix techniques : Node.js sans aucune dépendance, JavaScript « vanilla » dans le navigateur (aucun
framework, aucune compilation), et stockage dans des fichiers JSON. La 3D utilise three.js, inclus
dans le projet : elle fonctionne donc aussi sans internet.

Le monde 3D est pensé pour rester fluide et sobre :

- la finesse de l'image s'adapte toute seule à la puissance de l'appareil ;
- hors de l'accueil, la montagne tourne à 30 images par seconde ; dans l'admin, elle est à l'arrêt ;
- si l'appareil a activé « réduire les animations », le monde ne s'anime plus tout seul (neige, étoiles, ronde) : il suit simplement le défilement ;
- sans WebGL (très vieux navigateur), le site s'affiche sur un simple fond dégradé et reste entièrement utilisable.

---

## 7. Avant une vraie mise en ligne (hors périmètre du prototype)

- **Paiement réel** via un prestataire suisse ou international (TWINT, cartes, facture), par exemple Datatrans, Payrexx, Stripe…
- **Vraie base de données** à la place des fichiers JSON, et gestion des stocks
- **Comptes admin sécurisés** (le mot de passe unique actuel ne suffit pas en production) et HTTPS
- **E-mails** de confirmation de commande
- **Vérification de l'âge** conforme et **règles légales** à vérifier : âges minimum pour le vin, la bière, les spiritueux et le tabac, et restrictions de publicité
- **Pages légales** : CGV, mentions légales, protection des données (nLPD)
- **Hébergement** : la version sur GitHub Pages est une démonstration (données gardées dans chaque navigateur). Une vraie boutique a besoin d'un hébergement avec serveur et base de données partagée.
