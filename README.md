# MMM-SNCF

Module MagicMirror natif affichant les prochains départs d'une gare SNCF.
Il remplace le backend Flask, le frontend Vue et l'iframe.

## Configuration

La clé API reste uniquement dans le processus serveur de MagicMirror :

```bash
export SNCF_API_KEY="votre-cle-api"
```

Avec Docker Compose, placez-la dans le fichier `.env` à côté de
`compose.yaml` :

```dotenv
SNCF_API_KEY=votre-cle-api
```

Puis ajoutez le module dans `config/config.js` :

```js
{
  module: "MMM-SNCF",
  position: "top_center",
  config: {
    stationId: "stop_area:SNCF:87723585",
    maximumEntries: 6,
    updateInterval: 3 * 60 * 1000
  }
}
```

Options :

| Option | Valeur par défaut | Description |
| --- | --- | --- |
| `stationId` | `stop_area:SNCF:87723585` | Identifiant Navitia de la gare |
| `maximumEntries` | `6` | Nombre de départs |
| `updateInterval` | `180000` | Rafraîchissement en millisecondes, minimum 1 minute |
| `showLastUpdate` | `false` | Affiche l'heure de la dernière mise à jour |
| `coverage` | `sncf` | Couverture de l'API |
| `requestTimeout` | `10000` | Délai maximal d'une requête en millisecondes |

Une option `apiKey` existe comme solution de repli, mais une variable
d'environnement est préférable car la configuration des modules est envoyée
au navigateur.

## Test

Le module n'a aucune dépendance à installer :

```bash
cd modules/MMM-SNCF
npm test
```
