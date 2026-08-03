package com.docusing.auth.common.web

object ResponseMessages {
    object Success {
        const val USER_REGISTERED = "User registered successfully"
        const val LOGIN_SUCCESS = "Login successful"
        const val MAGIC_LINK_SENT = "Magic link sent to email"
        const val LOGOUT_SUCCESS = "Logout successful"
        const val PROFILE_UPDATED = "Profile updated successfully"
        const val ORGANIZATION_CREATED = "Organization created successfully"
        const val MEMBER_INVITED = "Member invited successfully"
    }

    object Error {
        const val USER_NOT_FOUND = "User not found"
        const val INVALID_CREDENTIALS = "Invalid credentials"
        const val EMAIL_ALREADY_EXISTS = "Email already registered"
        const val INVALID_TOKEN = "Invalid or expired token"
        const val UNAUTHORIZED = "Unauthorized access"
        const val MAGIC_LINK_EXPIRED = "Magic link has expired"
        const val ORGANIZATION_NOT_FOUND = "Organization not found"
    }
}
