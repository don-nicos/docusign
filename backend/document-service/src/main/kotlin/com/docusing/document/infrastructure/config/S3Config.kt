package com.docusing.document.infrastructure.config

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

    @Value("\${aws.s3.region:us-east-2}")
    private lateinit var region: String

    @Value("\${aws.s3.access-key:}")
    private lateinit var accessKey: String

    @Value("\${aws.s3.secret-key:}")
    private lateinit var secretKey: String

    @Value("\${aws.s3.bucket.documents:docusing-dev}")
    lateinit var documentsBucket: String

    @Bean
    fun s3Client(): S3Client {
        // Use dummy credentials if not provided (for LocalStack)
        val finalAccessKey = if (accessKey.isBlank()) "test" else accessKey
        val finalSecretKey = if (secretKey.isBlank()) "test" else secretKey
        val credentials = AwsBasicCredentials.create(finalAccessKey, finalSecretKey)

        val builder = S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(credentials))

        if (s3Endpoint.isNotBlank()) {
            builder.endpointOverride(URI.create(s3Endpoint))
                .forcePathStyle(true)
        }

        return builder.build()
    }
}
