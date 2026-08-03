package com.docusing.auth.common.web

object ApiRoutes {
    object Auth {
        const val BASE = "/api/auth"
        const val REGISTER = "/register"
        const val LOGIN_PASSWORD = "/login/password"
        const val LOGIN_MAGIC_LINK = "/login/magic-link"
        const val VERIFY_MAGIC_LINK = "/verify-magic-link"
        const val REFRESH_TOKEN = "/refresh-token"
        const val LOGOUT = "/logout"
        const val ME = "/me"
        const val UPDATE_PROFILE = "/profile"
    }
    
    object Users {
        const val BASE = "/api/users"
        const val BY_ID = "/{userId}"
        const val BY_EMAIL = "/email/{email}"
        const val SEARCH = "/search"
    }
    
    object Organizations {
        const val BASE = "/api/organizations"
        const val BY_ID = "/{organizationId}"
        const val MEMBERS = "/{organizationId}/members"
        const val INVITE = "/{organizationId}/invite"
    }
}
