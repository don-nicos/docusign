#!/bin/bash

set -e

echo "Inicializando LocalStack S3 para Docusing..."

# Bucket unificado usado por los servicios en entorno local
awslocal s3 mb s3://docusing-dev || true

# Buckets legados por si la configuración cae en valores por defecto
awslocal s3 mb s3://docusing-signed-pdfs || true
awslocal s3 mb s3://docusing-signatures || true

put_cors() {
  local bucket=$1
  awslocal s3api put-bucket-cors --bucket "$bucket" --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 3000
      }
    ]
  }' || true
}

put_cors docusing-dev
put_cors docusing-signed-pdfs
put_cors docusing-signatures

echo "Buckets S3 disponibles:"
awslocal s3 ls

echo "LocalStack S3 inicializado correctamente!"
