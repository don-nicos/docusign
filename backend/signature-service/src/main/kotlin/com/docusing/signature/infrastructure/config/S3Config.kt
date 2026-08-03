package com.docusing.signature.infrastructure.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import java.net.URI

@Configuration
class S3Config {

    @Value("\${aws.s3.endpoint:}")
    private lateinit var s3Endpoint: String

    @Value("\${aws.s3.region:us-east-1}")
    private lateinit var region: String

    @Value("\${aws.s3.access-key:test}")
    private lateinit var accessKey: String

    @Value("\${aws.s3.secret-key:test}")
    private lateinit var secretKey: String

    @Value("\${aws.s3.bucket.signed-pdfs:docusing-signed-pdfs}")
    lateinit var signedPdfsBucket: String

    @Value("\${aws.s3.bucket.signatures:docusing-signatures}")
    lateinit var signaturesBucket: String

    @Bean
    fun s3Client(): S3Client {
        // Use dummy credentials if not provided (for LocalStack)
        val finalAccessKey = if (accessKey.isBlank()) "test" else accessKey
        val finalSecretKey = if (secretKey.isBlank()) "test" else secretKey
        val credentials = AwsBasicCredentials.create(finalAccessKey, finalSecretKey)

        val builder = S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(credentials))

        // Si se especifica un endpoint (ej. LocalStack), usarlo; de lo contrario, usar AWS real
        if (s3Endpoint.isNotBlank()) {
            builder.endpointOverride(URI.create(s3Endpoint))
                .forcePathStyle(true)
        }

        return builder.build()
    }
}
