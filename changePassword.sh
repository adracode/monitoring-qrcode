#!/bin/bash

if [ $EUID -eq 0 ]; then
    echo "Le script a été lancé avec sudo"
else
    echo "Le script a été lancé sans sudo"
fi

file=test.json

# Vérifie si le fichier JSON existe
if ! [ -f $file ]; then
  echo "Erreur : le fichier fichier.json n'existe pas."
  exit 1
fi

# Lit le fichier JSON dans une variable
json=$(cat $file)

# Demande à l'utilisateur de taper un nouveau mot de passe
echo "Entrez un nouveau mot de passe (30 secondes pour répondre) :"
if read -t 30 -s password1; then

  # Demande à l'utilisateur de confirmer le nouveau mot de passe
  echo "Confirmez le nouveau mot de passe (30 secondes pour répondre) :"
  if read -t 30 -s password2; then

    # Vérifie si les deux mots de passe sont identiques
    if [ "$password1" = "$password2" ]; then
    
      # Si le mot de passe est vide, on utilise "admin" à la place
      if [ -z "$password1" ]; then
        password1="admin"
      fi
      # Génère le hash SHA-256 du mot de passe
      password_hash=$(echo -n "$password1" | sha256sum | cut -d ' ' -f 1)

      # Trouve la ligne contenant le mot de passe dans le fichier JSON
      old_password=$(echo "$json" | grep -oP '(?<="adminPassword": ")[^"]*')

      # Remplace l'ancien mot de passe par le nouveau dans le fichier JSON
      json=$(echo "$json" | sed "s/$old_password/$password_hash/")

      # Écrit les modifications dans le fichier
      echo "$json" > $file

      echo "Le mot de passe a été mis à jour."

      # Vérifie si le conteneur Docker est en cours d'exécution
      if command -v docker > /dev/null && [ "$(docker ps -q --filter "name=qrcode-monitoring-app")" ]; then
        # Redémarre le conteneur Docker
        docker-compose -f docker-compose.prod.yml restart
        echo "Le conteneur Docker qrcode-monitoring-app a été redémarré."
      fi

    else
      echo "Erreur : les deux mots de passe ne correspondent pas."
    fi
  else
    echo "Délai de modification expiré."
  fi
else
  echo "Délai de modification expiré."
fi
