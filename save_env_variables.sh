#!/bin/bash

# Define the output file
OUTPUT_FILE="environment_variables_check.txt"
# chmod +x save_env_variables.sh

# Retrieve environment variables and write to file
{
  echo "SECRET_KEY=$SECRET_KEY"
  echo "DEFAULT_USER_EMAIL=$DEFAULT_USER_EMAIL"
  echo "UPLOAD_FOLDER=$UPLOAD_FOLDER"
  echo "FACE_DATA=$FACE_DATA"
  echo "MAIL_SERVER=$MAIL_SERVER"
  echo "MAIL_PORT=$MAIL_PORT"
  echo "MAIL_USE_TLS=$MAIL_USE_TLS"
  echo "MAIL_USE_SSL=$MAIL_USE_SSL"
  echo "MAIL_USERNAME=$MAIL_USERNAME"
  echo "MAIL_PASSWORD=$MAIL_PASSWORD"
  echo "MAIL_DEFAULT_SENDER=$MAIL_DEFAULT_SENDER"
} > $OUTPUT_FILE

echo "Environment variables have been written to $OUTPUT_FILE"