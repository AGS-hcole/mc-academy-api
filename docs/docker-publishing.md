# Publication DockerHub

Le workflow `.github/workflows/docker-publish.yml` construit le Dockerfile à la racine du dépôt.

- Push sur `main` : construction et publication de `devhcole/mc-academy-api:latest` et `devhcole/mc-academy-api:sha-<SHA complet du commit>`.
- Pull request vers `main` : construction de contrôle sans connexion DockerHub ni publication.
- Exécution manuelle : publication uniquement si la branche sélectionnée est `main`.
- Plateforme : `linux/amd64`. Cache BuildKit dans GitHub Actions.

## Configuration préalable

Dans Settings → Secrets and variables → Actions, ajouter le secret de dépôt `DOCKERHUB_TOKEN` contenant un jeton DockerHub du compte `devhcole` autorisé à écrire dans `devhcole/mc-academy-api`. Un secret d'organisation accessible à ce dépôt convient également. Ne jamais ajouter le jeton aux fichiers ni aux commentaires.

Le dépôt DockerHub doit exister et GitHub Actions doit être activé. Le nom de connexion `devhcole` est défini dans le workflow.

## Vérification

Après intégration, vérifier que le workflow « Publish Docker image » est vert pour le commit de `main`, puis que les deux tags apparaissent sur DockerHub. Le tag `sha-<SHA>` permet de sélectionner une image précise ; `latest` suit les publications réussies.

Le workflow construit et publie les images ; il ne redémarre aucun service déployé.
