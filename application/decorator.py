from functools import wraps
from flask import request, jsonify
from flask_login import current_user

# from werkzeug.security import check_password_hash

from flask import redirect, url_for, session, request


def second_level_password_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for("login"))

        # Check if the second-level password is verified
        if not session.get("second_level_verified"):
            # Save the original destination
            session["next_url"] = request.url
            return redirect(url_for("core.verify_second_password"))

        return f(*args, **kwargs)

    return decorated_function
