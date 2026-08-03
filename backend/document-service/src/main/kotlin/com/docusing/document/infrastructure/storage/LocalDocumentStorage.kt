package com.docusing.document.infrastructure.storage

import com.docusing.document.core.exception.DocumentStorageException
import com.docusing.document.config.StorageProperties
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest
import java.time.Instant
import java.util.UUID
import mu.KotlinLogging
import org.springframework.core.io.FileSystemResource
import org.springframework.core.io.Resource
import org.springframework.stereotype.Component

private val logger = KotlinLogging.logger {}

@Component
class LocalDocumentStorage(
    private val storageProperties: StorageProperties
) : DocumentStorage {

    private val basePath: Path = Path.of(storageProperties.local.basePath).toAbsolutePath()

    init {
        Files.createDirectories(basePath)
        logger.info { "Directorio base de documentos: $basePath" }
    }

    override fun save(
        ownerId: UUID,
        filename: String,
        contentType: String?,
        inputStream: InputStream,
        organizationId: UUID?,
        subCompanyId: UUID?
    ): DocumentStorageResult {
        val timestamp = Instant.now().toEpochMilli()
        val ownerPath = basePath.resolve(ownerId.toString())
        Files.createDirectories(ownerPath)
        val sanitizedName = filename.replace("/", "_").replace("\\", "_")
        val storageKey = "$timestamp-${UUID.randomUUID()}-$sanitizedName"
        val target = ownerPath.resolve(storageKey)
        val digest = MessageDigest.getInstance("SHA-256")
        var size = 0L
        inputStream.use { input ->
            Files.newOutputStream(target).use { output ->
                val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                while (true) {
                    val read = input.read(buffer)
                    if (read == -1) {
                        break
                    }
                    output.write(buffer, 0, read)
                    digest.update(buffer, 0, read)
                    size += read
                }
            }
        }
        val hash = digest.digest().joinToString(separator = "") { byte -> "%02x".format(byte) }
        logger.info { "Archivo guardado en $target (${size} bytes)" }
        return DocumentStorageResult(
            storageKey = ownerId.toString() + "/" + storageKey,
            size = size,
            contentType = contentType,
            hashSha256 = hash
        )
    }

    override fun load(storageKey: String): DocumentStorageResource {
        val target = basePath.resolve(storageKey)
        if (!Files.exists(target)) {
            throw DocumentStorageException("Archivo $storageKey no encontrado")
        }
        val resource: Resource = FileSystemResource(target)
        return DocumentStorageResource(
            resource = resource,
            filename = target.fileName.toString(),
            contentType = Files.probeContentType(target),
            size = Files.size(target)
        )
    }

    override fun delete(storageKey: String) {
        val target = basePath.resolve(storageKey)
        if (Files.exists(target)) {
            Files.delete(target)
            val parent = target.parent
            if (parent != null && parent != basePath && Files.isDirectory(parent) && Files.list(parent).use { it.noneMatch { _ -> true } }) {
                Files.delete(parent)
            }
        }
    }

    companion object {
        private const val DEFAULT_BUFFER_SIZE = 8 * 1024
    }
}
