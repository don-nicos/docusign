#!/bin/bash

echo "Inicializando LocalStack S3..."

# Crear bucket para PDFs firmados
awslocal s3 mb s3://docusing-signed-pdfs

# Crear bucket para imágenes de firmas
awslocal s3 mb s3://docusing-signatures

# Configurar CORS para los buckets
awslocal s3api put-bucket-cors --bucket docusing-signed-pdfs --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

awslocal s3api put-bucket-cors --bucket docusing-signatures --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

echo "Buckets S3 creados:"
awslocal s3 ls

echo "LocalStack S3 inicializado correctamente!"
