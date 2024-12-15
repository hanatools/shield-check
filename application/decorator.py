from functools import wraps
from flask_login import current_user

from flask import redirect, url_for, session, request, flash, jsonify


def second_level_password_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for("login"))
        if not session.get("second_level_verified"):
            session["next_url"] = request.url
            return redirect(url_for("core.verify_second_password"))
        return f(*args, **kwargs)

    return decorated_function


def roles_required(*roles):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if current_user.role not in roles:
                # Return a JSON response for unauthorized access
                return (
                    jsonify(
                        {
                            "error": "Unauthorized",
                            "message": "Bạn không có quyền thực hiện hành động này.",
                        }
                    ),
                    403,
                )
            return func(*args, **kwargs)

        return wrapper

    return decorator
