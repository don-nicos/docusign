package com.docusing.signature.domain.model

import jakarta.persistence.*
import java.util.UUID

@Entity
@Table(name = "signature_positions")
class SignaturePositionEntity(
    @Id
    @GeneratedValue
    val id: UUID? = null,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signer_id", nullable = false)
    val signer: SignerEntity,
    
    @Column(name = "page_number", nullable = false)
    val pageNumber: Int = 0,
    
    @Column(name = "position_x", nullable = false)
    val positionX: Double = 0.0,
    
    @Column(name = "position_y", nullable = false)
    val positionY: Double = 0.0,
    
    @Column(name = "width", nullable = false)
    val width: Double = 200.0,
    
    @Column(name = "height", nullable = false)
    val height: Double = 80.0,
    
    @Column(name = "label")
    val label: String? = null // Opcional: "Firma", "Inicial", "Fecha", etc.
)
