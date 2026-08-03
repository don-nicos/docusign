package com.docusing.signature.infrastructure.config

import com.docusing.signature.infrastructure.tracing.TraceIdInterceptor
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebMvcConfig(
    private val traceIdInterceptor: TraceIdInterceptor
) : WebMvcConfigurer {

    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(traceIdInterceptor)
            .addPathPatterns("/api/**")
            .order(0) // Ejecutar primero
    }
}
