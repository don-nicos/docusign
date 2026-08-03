package com.docusing.signature.common.dto.request

import jakarta.validation.constraints.Min
import java.util.UUID

data class RegenerateMagicLinkRequest(
    val signerId: UUID,
    // Opcional: cambiar días de expiración (default: mantener el mismo)
    @field:Min(1)
    val expirationDays: Int? = null
)
