import logging
import firebase_admin.auth
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.schemas.models import AuthenticatedUser

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security)
) -> AuthenticatedUser:
    """
    Extracts Bearer token from the Authorization header and verifies it
    using the Firebase Admin SDK.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        decoded_token = firebase_admin.auth.verify_id_token(token)
        if "uid" not in decoded_token:
            logger.warning("Decoded token is missing mandatory 'uid' claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token: missing uid",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return AuthenticatedUser(
            uid=decoded_token["uid"],
            email=decoded_token.get("email"),
            name=decoded_token.get("name"),
            picture=decoded_token.get("picture"),
        )
    except (
        firebase_admin.auth.InvalidIdTokenError,
        firebase_admin.auth.ExpiredIdTokenError,
        firebase_admin.auth.RevokedIdTokenError,
        firebase_admin.auth.UserDisabledError,
    ) as e:
        logger.warning("Client token verification failed: %s: %s", type(e).__name__, e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Authentication infrastructure error: %s: %s", type(e).__name__, e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service unavailable",
        ) from e


