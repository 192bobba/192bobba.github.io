# Boutique 13 Étoiles : prototype

Ébauche de boutique en ligne pour vendre des vêtements et du merchandising aux couleurs du Valais.
**Ce n'est pas un site de production** : les paiements sont simulés, aucun e-mail n'est envoyé,
et les produits et images sont factices.

Ce que le prototype sait faire :

- Accueil avec les catégories et des produits « coups de cœur »
- Boutique avec un filtre par catégorie : t-shirts, sweats, casquettes, autres vêtements, alcool, schnoupf
- Fiche produit avec le choix de la couleur, de la taille et de la quantité
- Panier avec les quantités modifiables et la livraison offerte dès CHF 80.–
- Checkout simulé : formulaire, puis page de confirmation
- Pop-up de vérification de l'âge à la première visite, et date de naissance obligatoire au checkout si le panier contient de l'alcool ou du schnoupf
- Mini espace admin pour ajouter, modifier et supprimer des produits (avec l'envoi de photos) et consulter les commandes de test

---

## 1. Lancer le site sur votre ordinateur

### Étape 1 : installer Node.js (une seule fois)

1. Allez sur **https://nodejs.org**
2. Téléchargez la version **LTS** (le gros bouton vert) et installez-la comme n'importe quel programme.

### Étape 2 : récupérer le code

Sur la page GitHub du projet, choisissez la bonne branche, puis cliquez sur **Code → Download ZIP**.
Décompressez le fichier. Le site se trouve dans le dossier **`boutique-valais`**.

### Étape 3 : lancer la boutique

**Méthode la plus simple : le double-clic**

- **Windows** : double-cliquez sur `lancer-windows.bat`.
- **Mac** : double-cliquez sur `lancer-mac.command`. Si le Mac refuse de l'ouvrir, faites un clic droit sur le fichier, choisissez **Ouvrir**, puis confirmez.

**Méthode avec la commande (Windows, Mac, Linux)**

1. Ouvrez un terminal *dans le dossier* `boutique-valais` :
   - **Windows** : ouvrez le dossier dans l'Explorateur, cliquez dans la barre d'adresse, tapez `cmd` puis Entrée.
   - **Mac** : dans le Finder, faites un clic droit sur le dossier, puis **Services → Nouveau terminal au dossier**.
2. Tapez la commande suivante puis appuyez sur Entrée :

   ```
   npm start
   ```

Le navigateur s'ouvre tout seul sur **http://localhost:3000**. S'il ne s'ouvre pas, tapez cette adresse
vous-même dans Chrome, Safari, Firefox ou Edge.

> Aucune installation de paquets n'est nécessaire (`npm install` est inutile) : le projet n'a aucune dépendance.

### Arrêter le site

Revenez dans la fenêtre noire (le terminal) et appuyez sur **Ctrl + C**, ou fermez simplement cette fenêtre.

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

## 3. Où modifier quoi ?

| Je veux changer… | Fichier |
|---|---|
| Nom de la boutique, mot de passe admin, frais de port, âge minimum, port | `src/config.js` |
| Les produits | Depuis l'**espace admin**, ou dans `data/products.json` (créé au premier lancement) |
| Les produits de démonstration de départ | `data/products.demo.json` |
| Les catégories (nom, description, image, 18+) | `data/categories.json` |
| Les images | Envoi depuis l'admin (enregistrées dans `public/uploads/`), ou en ajoutant des fichiers dans `public/img/produits/` |
| Les couleurs et le style | `public/css/style.css` (les couleurs sont au début du fichier) |
| Le logo | `public/img/logo.svg` (blason provisoire) |

Les images actuelles sont des **illustrations provisoires**. Remplacez-les par vos vraies photos
depuis l'admin, avec le bouton « Choisir une photo… » dans la fiche d'un produit.

---

## 4. Organisation du code

```
boutique-valais/
├── server.js              Point d'entrée : lance le serveur web
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
│   └── js/
│       ├── app.js         Démarrage et navigation entre les pages
│       ├── api.js         Appels au serveur
│       ├── cart.js        Panier (gardé dans le navigateur)
│       ├── age-gate.js    Pop-up de vérification de l'âge
│       ├── pricing.js     Calcul des totaux
│       ├── ui.js          Composants d'affichage réutilisables
│       └── pages/         Une page = un fichier (accueil, boutique, produit, panier, commande, confirmation, admin)
└── scripts/reset.js       Remise à zéro des données
```

Choix techniques : Node.js sans aucune dépendance, JavaScript « vanilla » dans le navigateur (aucun
framework, aucune compilation), et stockage dans des fichiers JSON. Les pages sont accessibles par des
adresses du type `#/boutique/sweats` ou `#/produit/hoodie-valais-1815`.

---

## 5. Avant une vraie mise en ligne (hors périmètre du prototype)

- **Paiement réel** via un prestataire suisse ou international (TWINT, cartes, facture), par exemple Datatrans, Payrexx, Stripe…
- **Vraie base de données** à la place des fichiers JSON, et gestion des stocks
- **Comptes admin sécurisés** (le mot de passe unique actuel ne suffit pas en production) et HTTPS
- **E-mails** de confirmation de commande
- **Vérification de l'âge** conforme et **règles légales** à vérifier : âges minimum pour le vin, la bière, les spiritueux et le tabac, et restrictions de publicité
- **Pages légales** : CGV, mentions légales, protection des données (nLPD)
- **Hébergement** : ce dossier a besoin d'un serveur Node.js. Il ne fonctionne pas tel quel sur GitHub Pages, qui n'héberge que des pages statiques.
