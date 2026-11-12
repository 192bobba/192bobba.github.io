# three.js (version 0.186.1)

Bibliothèque 3D utilisée pour les animations de la page d'accueil (licence MIT, voir `LICENSE.txt`).

`three.min.js` contient la bibliothèque complète (voir `entry.js`), nécessaire au monde 3D de cette version.
Pour le régénérer (par exemple après avoir ajouté un élément à `entry.js`) :

```
npm install --no-save three@0.186.1 esbuild
npx esbuild public/vendor/three/entry.js --bundle --format=esm --minify --legal-comments=inline --outfile=public/vendor/three/three.min.js
```
