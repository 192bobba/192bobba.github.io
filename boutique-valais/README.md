# Boutique 13 Étoiles : prototype

Ébauche de boutique en ligne pour vendre des vêtements et du merchandising aux couleurs du Valais.
**Ce n'est pas un site de production** : les paiements sont simulés, aucun e-mail n'est envoyé,
et les produits et images sont factices.

Ce que le prototype sait faire :

- Accueil animé : scène 3D du Cervin la nuit, avec les 13 étoiles du drapeau en orbite et la neige qui tombe ; drapeau 3D de l'emblème qui flotte au vent ; bandeau défilant
- Animations discrètes dans tout le site : apparition au défilement, effet 3D au survol des photos produit, confirmation d'ajout au panier
- Accueil avec les catégories et une sélection de produits
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
3. **Décompressez** le fichier et rangez le dossier où vous voulez (par exemple dans Documents). Le site se trouve dans le sous-dossier **`boutique-valais`**.

### Ensuite, à chaque fois : un double-clic

Dans le dossier `boutique-valais` :

- **Windows** : double-cliquez sur `lancer-windows.bat`
- **Mac** : double-cliquez sur `lancer-mac.command`. La toute première fois, si le Mac refuse de l'ouvrir, faites un clic droit sur le fichier, choisissez **Ouvrir**, puis confirmez.

Le site **se met à jour tout seul** avec la dernière version publiée, puis s'ouvre dans le navigateur
sur **http://localhost:3000**. Vous n'avez plus jamais besoin de retélécharger le ZIP.

> Astuce : créez un raccourci sur le bureau.
> Sur Windows, faites un clic droit sur `lancer-windows.bat`, puis **Envoyer vers → Bureau (créer un raccourci)**.
> Sur Mac, faites glisser `lancer-mac.command` sur le bureau en maintenant **Cmd + Option**.

Si vous préférez le terminal, la commande `npm start`, tapée dans le dossier `boutique-valais`, fait exactement la même chose.

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

## 2. Tester la boutique

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

## 3. Gérer vos produits (photos, prix, ajouts…)

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

## 4. Où modifier quoi ?

| Je veux changer… | Fichier |
|---|---|
| Nom de la boutique, mot de passe admin, frais de port, âge minimum, port | `src/config.js` |
| Les produits | Depuis l'**espace admin**, ou dans `data/products.json` (créé au premier lancement) |
| Les produits de démonstration de départ | `data/products.demo.json` |
| Les catégories (nom, description, image, 18+) | `data/categories.json` |
| Les images | Envoi depuis l'admin (enregistrées dans `public/uploads/`), ou en ajoutant des fichiers dans `public/img/produits/` |
| Les couleurs et le style | `public/css/style.css` (les couleurs du thème sombre sont au début du fichier ; le rouge est réservé au logo et aux produits) |
| Le logo | `public/img/logo.jpg` (et `favicon.png` / `apple-touch-icon.png` pour l'icône d'onglet) |

Les images actuelles sont des **illustrations provisoires** (avec le logo en écusson). Pour les remplacer
par vos vraies photos, voir la partie 3 ci-dessus.

---

## 5. Organisation du code

```
boutique-valais/
├── server.js              Serveur web du site
├── src/                   Code du serveur
│   ├── config.js          Réglages (à modifier librement)
│   ├── api.js             Adresses de l'API (/api/products, /api/orders, /api/admin/...)
│   ├── store.js           Lecture / écriture des fichiers JSON (seul fichier à changer pour passer à une base de données)
│   ├── orders.js          Création d'une commande : prix et âge revérifiés côté serveur
│   ├── products.js        Validation des produits saisis dans l'admin
│   ├── auth.js            Protection basique de l'admin (mot de passe + session)
│   ├── age.js             Calcul de l'âge
│   └── http.js            Utilitaires HTTP et fichiers statiques
├── data/                  Données (catégories, produits, commandes)
├── public/                Tout ce que voit le navigateur
│   ├── index.html
│   ├── css/style.css
│   ├── img/               Logo et illustrations provisoires
│   ├── uploads/           Photos envoyées depuis l'admin
│   ├── vendor/three/      Bibliothèque 3D three.js (voir son README)
│   └── js/
│       ├── app.js         Démarrage et navigation entre les pages
│       ├── api.js         Appels au serveur
│       ├── cart.js        Panier (gardé dans le navigateur)
│       ├── age-gate.js    Pop-up de vérification de l'âge
│       ├── pricing.js     Calcul des totaux
│       ├── ui.js          Composants d'affichage réutilisables
│       ├── effects.js     Animations d'interface (apparition au défilement, effet 3D au survol)
│       ├── three/         Scènes 3D de l'accueil (Cervin étoilé, drapeau au vent)
│       └── pages/         Une page = un fichier (accueil, boutique, produit, panier, commande, confirmation, admin)
├── scripts/
│   ├── start.js           Lancement : mise à jour automatique puis démarrage du serveur
│   ├── update.js          Mise à jour automatique depuis GitHub
│   └── reset.js           Remise à zéro des données
└── lancer-windows.bat, lancer-mac.command   Lanceurs à double-cliquer
```

Choix techniques : Node.js sans aucune dépendance, JavaScript « vanilla » dans le navigateur (aucun
framework, aucune compilation), et stockage dans des fichiers JSON. La 3D utilise three.js, inclus
dans le projet : elle fonctionne donc aussi sans internet. Les animations se coupent automatiquement si
l'appareil a activé le réglage « réduire les animations », et la 3D se met en pause quand elle n'est pas
à l'écran, pour économiser la batterie. Les pages sont accessibles par des
adresses du type `#/boutique/sweats` ou `#/produit/hoodie-valais-1815`.

---

## 6. Avant une vraie mise en ligne (hors périmètre du prototype)

- **Paiement réel** via un prestataire suisse ou international (TWINT, cartes, facture), par exemple Datatrans, Payrexx, Stripe…
- **Vraie base de données** à la place des fichiers JSON, et gestion des stocks
- **Comptes admin sécurisés** (le mot de passe unique actuel ne suffit pas en production) et HTTPS
- **E-mails** de confirmation de commande
- **Vérification de l'âge** conforme et **règles légales** à vérifier : âges minimum pour le vin, la bière, les spiritueux et le tabac, et restrictions de publicité
- **Pages légales** : CGV, mentions légales, protection des données (nLPD)
- **Hébergement** : ce dossier a besoin d'un serveur Node.js. Il ne fonctionne pas tel quel sur GitHub Pages, qui n'héberge que des pages statiques.
